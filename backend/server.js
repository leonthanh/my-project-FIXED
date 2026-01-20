require("dotenv").config(); // ✅ Đặt đầu tiên

const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');
const path = require("path");

const { logger } = require('./logger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

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
require("./models/RefreshToken");

// ✅ Initialize associations (models/index.js)
require('./models');

// ✅ Routes
const authRoutes = require("./routes/auth");
const writingTestsRoute = require("./routes/writingTest");
const writingSubmissionRoutes = require("./routes/writing-submission");
const listeningTestsRoute = require("./routes/listeningTests");
const listeningSubmissionRoutes = require("./routes/listening-submission");
const readingTestsRoute = require("./routes/readingTest");
const readingSubmissionRoutes = require("./routes/reading-submission");
const aiRoutes = require("./routes/ai");
const cambridgeRoutes = require("./routes/cambridgeTests"); // ✅ Cambridge tests

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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cookieParser());

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, cb) {
      // allow non-browser calls (no Origin)
      if (!origin) return cb(null, true);
      if (!allowedOrigins.length) return cb(null, true); // fallback for local/dev
      return cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);

app.use(express.json({ limit: '50mb' })); // Tăng limit để support base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Serve ảnh tĩnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes API
app.use('/api/ai', aiRoutes); // ✅ Bây giờ mới dùng
app.use('/api/auth', authRoutes);
app.use('/api/writing-tests', writingTestsRoute);
app.use('/api/writing', writingSubmissionRoutes);
app.use('/api/listening-tests', listeningTestsRoute);
app.use('/api/listening-submissions', listeningSubmissionRoutes);
app.use('/api/reading-tests', readingTestsRoute);
app.use('/api/reading-submissions', readingSubmissionRoutes);
app.use('/api/cambridge', cambridgeRoutes); // ✅ Cambridge tests (KET, PET, etc.)

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

// ✅ Connect DB, sync models, then start server
const PORT = process.env.PORT || 5000;
sequelize
  .authenticate()
  .then(() => {
    logger.info('MySQL connected');
    if (process.env.SHOW_ENV_LOG !== 'false') {
      console.log('✅ Kết nối database thành công');
    }

    // If legacy/seed data contains orphaned `submissions.testId` values, MySQL will
    // reject adding the FK during `sync({ alter: true })`. Clean them up first.
    return sequelize
      .query(
        `UPDATE submissions s
         LEFT JOIN writing_tests w ON s.testId = w.id
         SET s.testId = NULL
         WHERE s.testId IS NOT NULL AND w.id IS NULL;`,
      )
      .catch((cleanupErr) => {
        // Non-fatal: tables/columns may not exist yet on first boot.
        console.warn(
          "⚠️ Pre-sync cleanup skipped (submissions/testId/writing_tests not ready):",
          cleanupErr?.message || cleanupErr,
        );
      });
  })
  .then(() => {
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    logger.info('Sequelize models synced');
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
