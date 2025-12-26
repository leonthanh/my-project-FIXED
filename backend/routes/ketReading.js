const express = require("express");
const router = express.Router();
const { KETReading } = require("../models");
const { logError } = require("../logger");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ===== MULTER CONFIG - Upload hình ảnh =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/ket-reading");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png, gif)"));
    }
  },
});

// ===== 1. LẤY TẤT CẢ ĐỀ THI =====
router.get("/", async (req, res) => {
  try {
    const tests = await KETReading.findAll({
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "description",
        "timeLimit",
        "totalQuestions",
        "status",
        "createdBy",
        "createdAt",
      ],
    });

    res.json(tests);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách KET Reading:", err);
    logError("Lỗi khi lấy danh sách KET Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// ===== 2. LẤY CHI TIẾT 1 ĐỀ THI =====
router.get("/:id", async (req, res) => {
  try {
    const test = await KETReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    res.json(test);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết KET Reading:", err);
    logError("Lỗi khi lấy chi tiết KET Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// ===== 3. TẠO ĐỀ THI MỚI =====
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      timeLimit,
      createdBy,
      status,
      part1_instruction,
      part1_questions,
      part2_instruction,
      part2_texts,
      part2_questions,
      part3_instruction,
      part3_passage,
      part3_questions,
      part4_instruction,
      part4_passage,
      part4_questions,
      part5_instruction,
      part5_passage,
      part5_questions,
    } = req.body;

    if (!title || !createdBy) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập tên đề thi và ID giáo viên." });
    }

    const newTest = await KETReading.create({
      title,
      description,
      timeLimit: timeLimit || 60,
      totalQuestions: 30,
      createdBy,
      status: status || "draft",
      part1_instruction,
      part1_questions: part1_questions || [],
      part2_instruction,
      part2_texts: part2_texts || [],
      part2_questions: part2_questions || [],
      part3_instruction,
      part3_passage,
      part3_questions: part3_questions || [],
      part4_instruction,
      part4_passage,
      part4_questions: part4_questions || [],
      part5_instruction,
      part5_passage,
      part5_questions: part5_questions || [],
    });

    res.status(201).json({
      message: "Tạo đề thi thành công!",
      test: newTest,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo KET Reading:", err);
    logError("Lỗi khi tạo KET Reading", err);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// ===== 4. CẬP NHẬT ĐỀ THI =====
router.put("/:id", async (req, res) => {
  try {
    const test = await KETReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const {
      title,
      description,
      timeLimit,
      status,
      part1_instruction,
      part1_questions,
      part2_instruction,
      part2_texts,
      part2_questions,
      part3_instruction,
      part3_passage,
      part3_questions,
      part4_instruction,
      part4_passage,
      part4_questions,
      part5_instruction,
      part5_passage,
      part5_questions,
    } = req.body;

    await test.update({
      title: title || test.title,
      description: description !== undefined ? description : test.description,
      timeLimit: timeLimit || test.timeLimit,
      status: status || test.status,
      part1_instruction: part1_instruction || test.part1_instruction,
      part1_questions: part1_questions || test.part1_questions,
      part2_instruction: part2_instruction || test.part2_instruction,
      part2_texts: part2_texts || test.part2_texts,
      part2_questions: part2_questions || test.part2_questions,
      part3_instruction: part3_instruction || test.part3_instruction,
      part3_passage:
        part3_passage !== undefined ? part3_passage : test.part3_passage,
      part3_questions: part3_questions || test.part3_questions,
      part4_instruction: part4_instruction || test.part4_instruction,
      part4_passage:
        part4_passage !== undefined ? part4_passage : test.part4_passage,
      part4_questions: part4_questions || test.part4_questions,
      part5_instruction: part5_instruction || test.part5_instruction,
      part5_passage:
        part5_passage !== undefined ? part5_passage : test.part5_passage,
      part5_questions: part5_questions || test.part5_questions,
    });

    res.json({
      message: "Cập nhật đề thi thành công!",
      test,
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật KET Reading:", err);
    logError("Lỗi khi cập nhật KET Reading", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật đề thi." });
  }
});

// ===== 5. XÓA ĐỀ THI =====
router.delete("/:id", async (req, res) => {
  try {
    const test = await KETReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    await test.destroy();

    res.json({ message: "Xóa đề thi thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa KET Reading:", err);
    logError("Lỗi khi xóa KET Reading", err);
    res.status(500).json({ message: "Lỗi server khi xóa đề thi." });
  }
});

// ===== 6. UPLOAD HÌNH ẢNH (Part 1) =====
router.post("/upload-image", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn hình ảnh để upload." });
    }

    const imageUrl = `/uploads/ket-reading/${req.file.filename}`;

    res.json({
      message: "Upload hình ảnh thành công!",
      imageUrl,
    });
  } catch (err) {
    console.error("❌ Lỗi khi upload hình ảnh:", err);
    logError("Lỗi khi upload hình ảnh", err);
    res.status(500).json({ message: "Lỗi server khi upload hình ảnh." });
  }
});

module.exports = router;
