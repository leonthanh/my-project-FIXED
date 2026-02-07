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
    const where = {};
    if (req.query.testType) {
      where.testType = req.query.testType;
    }
    const tests = await WritingTest.findAll({ where, order: [['index', 'ASC']] });
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
      testType: test.testType,
      task1: test.task1,
      task2: test.task2,
      task1Image: test.task1Image,
      part2Question2: test.part2Question2,
      part2Question3: test.part2Question3,
    });
  } catch (err) {
    console.error('❌ Lỗi lấy chi tiết đề:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

const { requireAuth, requireRole } = require('../middlewares/auth');

// 📌 Tạo đề (không ảnh)
router.post('/', requireAuth, requireRole('teacher','admin'), async (req, res) => {
  try {
    const {
      task1,
      task2,
      classCode,
      teacherName,
      testType,
      part2Question2,
      part2Question3,
    } = req.body;
    const resolvedType = testType || 'writing';
    const isPetWriting = resolvedType === 'pet-writing';

    if (!task1 || (!isPetWriting && !task2)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Task 1 và Task 2' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ câu hỏi Part 2' });
    }

    const count = await WritingTest.count();
    const newTest = await WritingTest.create({
      index: count + 1,
      task1,
      task2: isPetWriting ? (task2 || '') : task2,
      testType: resolvedType,
      classCode,
      teacherName,
      part2Question2: part2Question2 || null,
      part2Question3: part2Question3 || null,
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
    const {
      task1,
      task2,
      classCode,
      teacherName,
      testType,
      part2Question2,
      part2Question3,
    } = req.body;
    const resolvedType = testType || 'writing';
    const isPetWriting = resolvedType === 'pet-writing';

    if (!task1 || (!isPetWriting && !task2)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Task 1 và Task 2' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ câu hỏi Part 2' });
    }

    const count = await WritingTest.count();
    const newTest = await WritingTest.create({
      index: count + 1,
      task1,
      task2: isPetWriting ? (task2 || '') : task2,
      task1Image: req.file ? `/uploads/${req.file.filename}` : null,
      testType: resolvedType,
      classCode,
      teacherName,
      part2Question2: part2Question2 || null,
      part2Question3: part2Question3 || null,
    });

    res.json({ message: '✅ Đã tạo đề mới', test: newTest });
  } catch (err) {
    console.error('❌ Lỗi tạo đề có ảnh:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});
// ✅ Route chi tiết đề thi theo ID (để khớp với frontend)
router.get('/:id', async (req, res) => {
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
      testType: test.testType,
      task1: test.task1,
      task2: test.task2,
      task1Image: test.task1Image,
      part2Question2: test.part2Question2,
      part2Question3: test.part2Question3,
    });
  } catch (err) {
    console.error('❌ Lỗi lấy chi tiết đề:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ✅ Route cập nhật đề thi
router.put('/:id', requireAuth, requireRole('teacher','admin'), async (req, res) => {
  try {
    const {
      classCode,
      teacherName,
      task1,
      task2,
      questions,
      testType,
      part2Question2,
      part2Question3,
    } = req.body;
    const test = await WritingTest.findByPk(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi' });
    }

    // Cập nhật thông tin
    await test.update({
      classCode,
      teacherName,
      task1,
      task2,
      testType,
      part2Question2,
      part2Question3,
      questions: JSON.stringify(questions)
    });

    res.json({ 
      message: '✅ Đã cập nhật đề thi thành công',
      test 
    });
  } catch (err) {
    console.error('❌ Lỗi cập nhật đề thi:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật đề thi' });
  }
});

// ✅ Route cập nhật đề thi (có ảnh)
router.put('/:id/with-image', requireAuth, requireRole('teacher','admin'), upload.single('image'), async (req, res) => {
  try {
    const {
      classCode,
      teacherName,
      task1,
      task2,
      testType,
      part2Question2,
      part2Question3,
    } = req.body;
    const test = await WritingTest.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi' });
    }

    const resolvedType = testType || test.testType || 'writing';
    const isPetWriting = resolvedType === 'pet-writing';

    if (!task1 || (!isPetWriting && !task2)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ Task 1 và Task 2' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ câu hỏi Part 2' });
    }

    await test.update({
      classCode,
      teacherName,
      task1,
      task2: isPetWriting ? (task2 || '') : task2,
      testType: resolvedType,
      part2Question2,
      part2Question3,
      task1Image: req.file ? `/uploads/${req.file.filename}` : test.task1Image,
    });

    res.json({ message: '✅ Đã cập nhật đề thi thành công', test });
  } catch (err) {
    console.error('❌ Lỗi cập nhật đề thi (có ảnh):', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật đề thi' });
  }
});

module.exports = router;
