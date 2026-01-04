const express = require("express");
const router = express.Router();
const { CambridgeListening, CambridgeReading } = require("../models");
const { logError } = require("../logger");

/**
 * Cambridge Tests Routes
 * Routes cho việc quản lý các đề thi Cambridge (KET, PET, etc.)
 */

// ===== LISTENING TESTS =====

// GET all listening tests
router.get("/listening-tests", async (req, res) => {
  try {
    const { testType } = req.query;
    
    const where = testType ? { testType } : {};
    
    const tests = await CambridgeListening.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "classCode",
        "teacherName",
        "testType",
        "totalQuestions",
        "status",
        "createdAt",
      ],
    });

    res.json(tests);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách Cambridge Listening:", err);
    logError("Lỗi khi lấy danh sách Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// GET single listening test
router.get("/listening-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    res.json(test);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết Cambridge Listening:", err);
    logError("Lỗi khi lấy chi tiết Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// POST create listening test
router.post("/listening-tests", async (req, res) => {
  try {
    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
    } = req.body;

    // Validation
    if (!title || !classCode || !testType) {
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc: title, classCode, testType" 
      });
    }

    const newTest = await CambridgeListening.create({
      title,
      classCode,
      teacherName: teacherName || '',
      testType,
      parts: JSON.stringify(parts),
      totalQuestions: totalQuestions || 0,
      status: 'draft',
    });

    console.log(`✅ Tạo đề Cambridge Listening thành công: ${newTest.id}`);

    res.status(201).json({
      message: "Tạo đề thành công!",
      test: newTest,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo Cambridge Listening:", err);
    logError("Lỗi khi tạo Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// PUT update listening test
router.put("/listening-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
      status,
    } = req.body;

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
      parts: parts ? JSON.stringify(parts) : test.parts,
      totalQuestions: totalQuestions ?? test.totalQuestions,
      status: status || test.status,
    });

    res.json({
      message: "Cập nhật đề thành công!",
      test,
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật Cambridge Listening:", err);
    logError("Lỗi khi cập nhật Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật đề thi." });
  }
});

// DELETE listening test
router.delete("/listening-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    await test.destroy();

    res.json({ message: "Xóa đề thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa Cambridge Listening:", err);
    logError("Lỗi khi xóa Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi xóa đề thi." });
  }
});

// ===== READING TESTS =====

// GET all reading tests
router.get("/reading-tests", async (req, res) => {
  try {
    const { testType } = req.query;
    
    const where = testType ? { testType } : {};
    
    const tests = await CambridgeReading.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "classCode",
        "teacherName",
        "testType",
        "totalQuestions",
        "status",
        "createdAt",
      ],
    });

    res.json(tests);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách Cambridge Reading:", err);
    logError("Lỗi khi lấy danh sách Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// GET single reading test
router.get("/reading-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    res.json(test);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết Cambridge Reading:", err);
    logError("Lỗi khi lấy chi tiết Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// POST create reading test
router.post("/reading-tests", async (req, res) => {
  try {
    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
    } = req.body;

    // Validation
    if (!title || !classCode || !testType) {
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc: title, classCode, testType" 
      });
    }

    const newTest = await CambridgeReading.create({
      title,
      classCode,
      teacherName: teacherName || '',
      testType,
      parts: JSON.stringify(parts),
      totalQuestions: totalQuestions || 0,
      status: 'draft',
    });

    console.log(`✅ Tạo đề Cambridge Reading thành công: ${newTest.id}`);

    res.status(201).json({
      message: "Tạo đề thành công!",
      test: newTest,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo Cambridge Reading:", err);
    logError("Lỗi khi tạo Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// PUT update reading test
router.put("/reading-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
      status,
    } = req.body;

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
      parts: parts ? JSON.stringify(parts) : test.parts,
      totalQuestions: totalQuestions ?? test.totalQuestions,
      status: status || test.status,
    });

    res.json({
      message: "Cập nhật đề thành công!",
      test,
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật Cambridge Reading:", err);
    logError("Lỗi khi cập nhật Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật đề thi." });
  }
});

// DELETE reading test
router.delete("/reading-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    await test.destroy();

    res.json({ message: "Xóa đề thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa Cambridge Reading:", err);
    logError("Lỗi khi xóa Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi xóa đề thi." });
  }
});

module.exports = router;
