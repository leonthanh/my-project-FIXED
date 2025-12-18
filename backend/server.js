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

// ✅ Routes
const authRoutes = require("./routes/auth");
const writingTestsRoute = require("./routes/writingTest");
const writingSubmissionRoutes = require("./routes/writing-submission");
const listeningTestsRoute = require("./routes/listeningTests");
const listeningSubmissionRoutes = require("./routes/listening-submission");
const readingTestsRoute = require("./routes/readingTest");
const readingSubmissionRoutes = require("./routes/reading-submission");
const aiRoutes = require("./routes/ai"); // ✅ Đưa lên trước khi dùng

// Middleware
app.use(cors());
app.use(express.json());

// ✅ Kết nối và sync Sequelize
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ MySQL connected");
    return sequelize.sync({ alter: true });
  })
  .then(() => console.log("✅ Sequelize models synced"))
  .catch((err) => console.error("❌ MySQL error:", err));

// ✅ Serve ảnh tĩnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Routes API
app.use("/api/ai", aiRoutes); // ✅ Bây giờ mới dùng
app.use("/api/auth", authRoutes);
app.use("/api/writing-tests", writingTestsRoute);
app.use("/api/writing", writingSubmissionRoutes);
app.use("/api/listening-tests", listeningTestsRoute);
app.use("/api/listening-submissions", listeningSubmissionRoutes);
app.use("/api/reading-tests", readingTestsRoute);
app.use("/api/reading-submissions", readingSubmissionRoutes);

// ✅ Serve frontend React build
const frontendPath = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(frontendPath));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
