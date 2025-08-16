// routes/writingTest.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const WritingTest = require('../models/WritingTests');

// 📌 Cấu hình upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 📌 Lấy tất cả đề
router.get('/', async (req, res) => {
  try {
    const tests = await WritingTest.findAll({ order: [['index', 'ASC']] });
    res.json(tests);
  } catch (err) {
    console.error('❌ Lỗi lấy danh sách đề:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// 📌 Lấy chi tiết đề theo ID
router.get('/detail/:id', async (req, res) => {
  try {
    const test = await WritingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy đề' });
    }
    res.json({
      id: test.id,
      index: test.index,
      classCode: test.classCode,
      teacherName: test.teacherName,
      task1: test.task1,
      task2: test.task2,
      task1Image: test.task1Image
    });
  } catch (err) {
    console.error('❌ Lỗi lấy chi tiết đề:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// 📌 Tạo đề (không ảnh)
router.post('/', async (req, res) => {
  try {
    const { task1, task2, classCode, teacherName } = req.body;
    if (!task1 || !task2) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Task 1 và Task 2' });
    }

    const count = await WritingTest.count();
    const newTest = await WritingTest.create({
      index: count + 1,
      task1,
      task2,
      classCode,
      teacherName
    });

    res.json({ message: '✅ Đã tạo đề mới', test: newTest });
  } catch (err) {
    console.error('❌ Lỗi tạo đề:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// 📌 Tạo đề (có ảnh)
router.post('/with-image', upload.single('image'), async (req, res) => {
  try {
    const { task1, task2, classCode, teacherName } = req.body;
    if (!task1 || !task2) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Task 1 và Task 2' });
    }

    const count = await WritingTest.count();
    const newTest = await WritingTest.create({
      index: count + 1,
      task1,
      task2,
      task1Image: req.file ? `/uploads/${req.file.filename}` : null,
      classCode,
      teacherName
    });

    res.json({ message: '✅ Đã tạo đề mới', test: newTest });
  } catch (err) {
    console.error('❌ Lỗi tạo đề có ảnh:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router;
