require("dotenv").config(); // ✅ Đặt đầu tiên

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

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

// ✅ Routes
const authRoutes = require('./routes/auth');
const writingTestsRoute = require('./routes/writingTest');
const writingSubmissionRoutes = require('./routes/writing-submission');
const listeningTestsRoute = require('./routes/listeningTests');
const listeningSubmissionRoutes = require('./routes/listening-submission');
const readingTestsRoute = require('./routes/readingTest');
const readingSubmissionRoutes = require('./routes/reading-submission');
const aiRoutes = require('./routes/ai');
const cambridgeRoutes = require('./routes/cambridgeTests'); // ✅ Cambridge tests

// Middleware
app.use(cors());
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

// Debug route: return important env vars (useful to verify FRONTEND_URL)
app.get('/api/debug/env', (req, res) => {
  console.log(`ℹ️ /api/debug/env requested — FRONTEND_URL='${process.env.FRONTEND_URL || ''}'`);
  res.json({ FRONTEND_URL: process.env.FRONTEND_URL || null });
});

// Upload routes (images) - mount upload router
const uploadRoutes = require('./routes/upload');
app.use('/api/upload', uploadRoutes);

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
    console.log("✅ MySQL connected");

    // If legacy/seed data contains orphaned `submissions.testId` values, MySQL will
    // reject adding the FK during `sync({ alter: true })`. Clean them up first.
    return sequelize
      .query(
        `UPDATE submissions s
         LEFT JOIN writing_tests w ON s.testId = w.id
         SET s.testId = NULL
         WHERE s.testId IS NOT NULL AND w.id IS NULL;`
      )
      .catch((cleanupErr) => {
        // Non-fatal: tables/columns may not exist yet on first boot.
        console.warn(
          "⚠️ Pre-sync cleanup skipped (submissions/testId/writing_tests not ready):",
          cleanupErr?.message || cleanupErr
        );
      });
  })
  .then(() => {
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log("✅ Sequelize models synced");
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MySQL error:", err);
    process.exit(1);
  });
