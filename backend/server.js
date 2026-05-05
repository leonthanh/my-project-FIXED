// Load env reliably on hosts where process.cwd() is NOT the backend folder (e.g., cPanel/Passenger)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
// Optional fallback: allow a repo-root .env (won't override already-set vars)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const pinoHttp = require('pino-http');

const loggerModule = require('./logger');
const logger = loggerModule?.logger || loggerModule?.default || loggerModule || console;
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeLimiterValue = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
};

const decodeBearerSubject = (req) => {
  const header = normalizeLimiterValue(req.headers?.authorization);
  if (!header) return null;

  const [type, token] = header.split(' ');
  if (String(type).toLowerCase() !== 'bearer' || !token) return null;

  try {
    const payload = jwt.decode(token);
    return normalizeLimiterValue(payload?.sub);
  } catch {
    return null;
  }
};

const extractApiRateLimitKey = (req) => {
  const decodedSubject = decodeBearerSubject(req);
  if (decodedSubject) return `user:${decodedSubject}`;

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const bodyUser = body.user && typeof body.user === 'object' ? body.user : {};
  const query = req.query || {};

  const userId = normalizeLimiterValue(
    query.userId || body.userId || bodyUser.id
  );
  if (userId) return `user:${userId}`;

  const submissionId = normalizeLimiterValue(
    query.submissionId || body.submissionId
  );
  if (submissionId) return `submission:${submissionId}`;

  const phone = normalizeLimiterValue(
    query.phone || body.phone || body.studentPhone || bodyUser.phone
  );
  if (phone) return `phone:${phone}`;

  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};

const resolveTrustProxy = () => {
  const raw = String(process.env.TRUST_PROXY || '').trim();
  if (!raw) return 1;

  const normalized = raw.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : raw;
};

const getRequestPath = (req) =>
  String(req.originalUrl || req.url || '').split('?')[0] || '/';

const isAiApiRequest = (req) => /^\/api\/ai(?:\/|$)/i.test(getRequestPath(req));

const runtimeSyncRoutePatterns = [
  /^\/api\/writing\/draft\/(?:autosave|active)$/i,
  /^\/api\/reading-submissions\/[^/]+\/(?:autosave|active)$/i,
  /^\/api\/listening-submissions\/[^/]+\/(?:autosave|active)$/i,
];

const isRuntimeSyncRequest = (req) => {
  const requestPath = getRequestPath(req);
  return runtimeSyncRoutePatterns.some((pattern) => pattern.test(requestPath));
};

const buildRateLimitHandler = (limiterId, message) => (req, res) => {
  const resetAt = req.rateLimit?.resetTime
    ? new Date(req.rateLimit.resetTime).getTime()
    : null;
  const retryAfterSeconds = Number.isFinite(resetAt)
    ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
    : null;

  if (retryAfterSeconds) {
    res.set('Retry-After', String(retryAfterSeconds));
  }

  res.set('X-RateLimit-Source', 'backend');
  res.set('X-RateLimit-Limiter', limiterId);

  res.status(429).json({
    error: message,
    message,
    code: 'RATE_LIMITED',
    rateLimitSource: `backend:${limiterId}`,
    limiter: limiterId,
    retryAfterSeconds,
    path: getRequestPath(req),
  });
};

const createApiLimiter = ({ limiterId, windowMs, limit, message, skip }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: extractApiRateLimitKey,
    skip: (req) => {
      if (req.method === 'OPTIONS') return true;
      return typeof skip === 'function' ? skip(req) : false;
    },
    handler: buildRateLimitHandler(limiterId, message),
  });

const apiRateLimiter = createApiLimiter({
  limiterId: 'api-general',
  windowMs: parsePositiveInt(process.env.API_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  limit: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 600),
  message: 'Too many API requests. Please try again later.',
  skip: (req) => isAiApiRequest(req) || isRuntimeSyncRequest(req),
});

const runtimeSyncRateLimiter = createApiLimiter({
  limiterId: 'runtime-sync',
  windowMs: parsePositiveInt(process.env.API_RUNTIME_SYNC_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  limit: parsePositiveInt(process.env.API_RUNTIME_SYNC_RATE_LIMIT_MAX, 1800),
  message: 'Too many autosave or runtime sync requests. Please retry in a moment.',
  skip: (req) => !isRuntimeSyncRequest(req),
});

const aiRateLimiter = createApiLimiter({
  limiterId: 'ai-feedback',
  windowMs: parsePositiveInt(process.env.API_AI_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  limit: parsePositiveInt(process.env.API_AI_RATE_LIMIT_MAX, 120),
  message: 'Too many AI feedback requests. Please wait a moment and try again.',
});

// Friendly startup logs (hide secrets)
const envSnapshot = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_NAME: process.env.DB_NAME || null,
  DB_USER: process.env.DB_USER || null,
};
if (process.env.SHOW_ENV_LOG !== 'false') {
  console.log('Environment:', envSnapshot);
}

// ✅ MySQL (Sequelize) – chỉ require 1 lần
const sequelize = require("./db");
let ensureDbColumns;
try {
  ensureDbColumns = require("./scripts/ensure-db-columns");
} catch (err) {
  console.warn(
    "⚠️ Missing ./scripts/ensure-db-columns, using inline fallback:",
    err?.message || err,
  );

  async function columnExists(sequelizeInstance, table, column) {
    const [rows] = await sequelizeInstance.query(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = :table
         AND COLUMN_NAME = :column`,
      { replacements: { table, column } },
    );
    return Number(rows?.[0]?.cnt || 0) > 0;
  }

  async function addColumnIfMissing(sequelizeInstance, table, column, definition) {
    const exists = await columnExists(sequelizeInstance, table, column);
    if (!exists) {
      await sequelizeInstance.query(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
      );
      console.log(`✅ Migration fallback: added ${table}.${column}`);
    }
  }

  ensureDbColumns = async (sequelizeInstance) => {
    try {
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "finished",
        "BOOLEAN DEFAULT TRUE",
      );
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "expiresAt",
        "DATETIME NULL",
      );
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "lastSavedAt",
        "DATETIME NULL",
      );
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "progressMeta",
        "JSON NULL",
      );
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "feedbackSeen",
        "BOOLEAN DEFAULT FALSE",
      );
      await addColumnIfMissing(
        sequelizeInstance,
        "cambridge_submissions",
        "responseFeedback",
        "JSON NULL",
      );
      await addColumnIfMissing(sequelizeInstance, "submissions", "bandTask1", "FLOAT NULL");
      await addColumnIfMissing(sequelizeInstance, "submissions", "bandTask2", "FLOAT NULL");
      await addColumnIfMissing(sequelizeInstance, "submissions", "bandOverall", "FLOAT NULL");
      await addColumnIfMissing(sequelizeInstance, "writing_tests", "isArchived", "BOOLEAN NOT NULL DEFAULT FALSE");
      await addColumnIfMissing(sequelizeInstance, "reading_tests", "isArchived", "BOOLEAN NOT NULL DEFAULT FALSE");
      await addColumnIfMissing(sequelizeInstance, "listening_tests", "isArchived", "BOOLEAN NOT NULL DEFAULT FALSE");
      console.log("✅ Inline DB column fallback complete.");
    } catch (migrationErr) {
      console.warn("⚠️ Inline ensureDbColumns warning:", migrationErr?.message || migrationErr);
    }
  };
}
// ✅ Import models để Sequelize biết các bảng
require("./models/User");
require("./models/WritingTests");
require("./models/Submission");
require("./models/ListeningTest");
require("./models/ReadingTest");
require("./models/KETReading");
require("./models/ReadingSubmission");
require("./models/ListeningSubmission");
require("./models/CambridgeListening");
require("./models/CambridgeReading");
require("./models/PlacementPackage");
require("./models/PlacementPackageItem");
require("./models/PlacementAttempt");
require("./models/PlacementAttemptItem");
require("./models/RefreshToken");

// ✅ Initialize associations (models/index.js)
require('./models');

// ✅ Routes
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
const cambridgeRouter = require("./modules/cambridge/router"); // ✅ Cambridge tests
const listeningRouter = require("./modules/listening/router");
const readingRouter = require("./modules/reading/router");
const writingRouter = require("./modules/writing/router");
const adminRoutes = require("./routes/admin"); // ✅ Admin user/submission management
const placementRoutes = require("./routes/placement");

// Middleware
const shouldLogHttp = String(process.env.SHOW_HTTP_LOG || '').toLowerCase() === 'true';
if (shouldLogHttp) {
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        if (existing) return String(existing);
        const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
        res.setHeader('X-Request-Id', id);
        return id;
      },
      customLogLevel: function (_req, res, err) {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    })
  );
}

// Allow the React dev server (localhost:3000) to load images/audio from this API origin.
// Otherwise browsers may block embedded resources with:
// net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "img-src": ["'self'", "data:", "https:", "blob:"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cookieParser());

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''));
};

app.use(
  cors({
    origin: function (origin, cb) {
      // allow non-browser calls (no Origin)
      if (!origin) return cb(null, true);
      if (!allowedOrigins.length) return cb(null, true); // fallback for local/dev
      if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
  })
);

// cPanel/Passenger chạy sau reverse proxy — cần trust proxy để rate-limit dùng IP thật
app.set('trust proxy', resolveTrustProxy());

app.use(express.json({ limit: '50mb' })); // Tăng limit để support base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply dedicated limiters before the shared API limiter so runtime sync and AI traffic
// are isolated from the general request budget.
app.use('/api', runtimeSyncRateLimiter);
// Only throttle API requests so frontend HTML/static assets do not fail with plain-text 429 pages.
app.use('/api', apiRateLimiter);

// ✅ Serve ảnh tĩnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes API
app.use('/api/ai', aiRateLimiter, aiRoutes); // ✅ Bây giờ mới dùng
app.use('/api/auth', authRoutes);
app.use('/api', writingRouter);
app.use('/api', listeningRouter);
app.use('/api', readingRouter);
app.use('/api/cambridge', cambridgeRouter); // ✅ Cambridge tests (KET, PET, etc.)
app.use('/api/admin', adminRoutes);         // ✅ Admin: quản lý user & bài làm
app.use('/api/placement', placementRoutes);

// Debug route: verify FRONTEND_URL (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/env', (req, res) => {
    res.json({ FRONTEND_URL: process.env.FRONTEND_URL || null });
  });
}

// Upload routes (images) - mount upload router
const uploadRoutes = require("./routes/upload");
app.use("/api/upload", uploadRoutes);

// ✅ Serve frontend React build
const frontendPath = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(frontendPath));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

async function cleanupRefreshTokenSyncArtifacts() {
  try {
    const [duplicateTokenHashIndexes] = await sequelize.query(
      `SELECT DISTINCT INDEX_NAME
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'refresh_tokens'
         AND COLUMN_NAME = 'tokenHash'
         AND INDEX_NAME NOT IN ('PRIMARY', 'refresh_tokens_token_hash_unique')`
    );

    for (const row of duplicateTokenHashIndexes) {
      await sequelize.query(`ALTER TABLE \`refresh_tokens\` DROP INDEX \`${row.INDEX_NAME}\``);
    }

    const [duplicateUserForeignKeys] = await sequelize.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'refresh_tokens'
         AND COLUMN_NAME = 'userId'
         AND REFERENCED_TABLE_NAME = 'users'
       ORDER BY CONSTRAINT_NAME`
    );

    for (const row of duplicateUserForeignKeys.slice(1)) {
      await sequelize.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
    }
  } catch (cleanupErr) {
    console.warn(
      '⚠️ Refresh-token schema cleanup skipped:',
      cleanupErr?.message || cleanupErr,
    );
  }
}

// ✅ Connect DB, sync models, then start server
const PORT = process.env.PORT || 5000;
sequelize
  .authenticate()
  .then(() => {
    logger.info('MySQL connected');
    if (process.env.SHOW_ENV_LOG !== 'false') {
      console.log('✅ Kết nối database thành công');
    }

    // Tự động thêm các cột còn thiếu (an toàn, không xoá dữ liệu)
    return ensureDbColumns(sequelize);
  })
  .then(() => {
    // If legacy/seed data contains orphaned foreign-key values, MySQL will reject
    // `sync({ alter: true })` when Sequelize tries to recreate or add constraints.
    return Promise.all([
      sequelize.query(
        `UPDATE submissions s
         LEFT JOIN writing_tests w ON s.testId = w.id
         SET s.testId = NULL
         WHERE s.testId IS NOT NULL AND w.id IS NULL;`,
      ),
      sequelize.query(
        `UPDATE listening_submissions ls
         LEFT JOIN users u ON ls.userId = u.id
         SET ls.userId = NULL
         WHERE ls.userId IS NOT NULL AND u.id IS NULL;`,
      ),
      cleanupRefreshTokenSyncArtifacts(),
    ]).catch((cleanupErr) => {
      // Non-fatal: tables/columns may not exist yet on first boot.
      console.warn(
        '⚠️ Pre-sync cleanup skipped (legacy FK targets not ready):',
        cleanupErr?.message || cleanupErr,
      );
    });
  })
  .then(() => {
    // Attempt a schema alter but don't let an alter failure crash the dev server.
    return sequelize.sync({ alter: true }).catch((syncErr) => {
      console.warn('⚠️ sequelize.sync({ alter: true }) failed - continuing in dev:', syncErr?.message || syncErr);
      // Still resolve so the server can start; in prod we expect proper migrations to handle schema.
      return Promise.resolve();
    });
  })
  .then(() => {
    logger.info('Sequelize models synced (or sync-alter skipped)');
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Server started');
      if (process.env.SHOW_ENV_LOG !== 'false') {
        console.log(`✅ Server is running on port ${PORT}`);
      }
    });
  })
  .catch((err) => {
    logger.error({ err }, 'MySQL error');
    process.exit(1);
  });

// Centralized error handling (must be after routes)
app.use(notFound);
app.use(errorHandler);
