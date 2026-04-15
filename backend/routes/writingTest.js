// routes/writingTest.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WritingTest = require('../models/WritingTests');

const normalizeUploadsInText = (text, req) => {
  if (!text || typeof text !== 'string') return text;
  const host = `${req.protocol}://${req.get("host")}`;
  const stripHost = (url) => url.replace(/^https?:\/\//i, '').replace(/^\/\//, '');
  const normalize = (url) => {
    const cleaned = String(url || '').trim();
    if (!cleaned) return cleaned;
    if (/^data:/i.test(cleaned)) return cleaned;
    if (/^https?:\/\//i.test(cleaned) || cleaned.startsWith('//')) {
      const withoutProto = stripHost(cleaned);
      const idx = withoutProto.indexOf('/uploads/');
      if (idx >= 0) return `${host}${withoutProto.slice(idx)}`;
      return cleaned;
    }
    if (cleaned.startsWith('/uploads/')) return `${host}${cleaned}`;
    return cleaned;
  };

  return text
    .replace(/\bsrc\s*=\s*"([^"]+)"/gi, (_m, url) => `src="${normalize(url)}"`)
    .replace(/\bsrc\s*=\s*'([^']+)'/gi, (_m, url) => `src='${normalize(url)}'`)
    .replace(/\bhref\s*=\s*"([^"]+)"/gi, (_m, url) => `href="${normalize(url)}"`)
    .replace(/\bhref\s*=\s*'([^']+)'/gi, (_m, url) => `href='${normalize(url)}'`)
    .replace(/url\(([^)]+)\)/gi, (_m, rawUrl) => {
      const url = String(rawUrl || '').trim().replace(/^['"]|['"]$/g, '');
      return `url(${normalize(url)})`;
    });
};

const normalizeUploadsInWriting = (test, req) => {
  if (!test) return test;
  return {
    ...test,
    task1: normalizeUploadsInText(test.task1, req),
    task2: normalizeUploadsInText(test.task2, req),
    part2Question2: normalizeUploadsInText(test.part2Question2, req),
    part2Question3: normalizeUploadsInText(test.part2Question3, req),
    task1Image: normalizeUploadsInText(test.task1Image, req),
  };
};

// 📌 Cấu hình upload ảnh
const uploadsRoot = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const shouldIncludeArchived = (req) =>
  ['1', 'true', 'yes'].includes(String(req.query.includeArchived || '').trim().toLowerCase());

// 📌 Lấy tất cả đề
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.testType) {
      where.testType = req.query.testType;
    }
    if (!shouldIncludeArchived(req)) {
      where.isArchived = false;
    }
    const tests = await WritingTest.findAll({ where, order: [['index', 'ASC']] });
    const normalized = tests.map((t) => normalizeUploadsInWriting(t.toJSON ? t.toJSON() : t, req));
    res.json(normalized);
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
    const data = normalizeUploadsInWriting(test.toJSON(), req);
    res.json({
      id: data.id,
      index: data.index,
      classCode: data.classCode,
      teacherName: data.teacherName,
      testType: data.testType,
      task1: data.task1,
      task2: data.task2,
      task1Image: data.task1Image,
      part2Question2: data.part2Question2,
      part2Question3: data.part2Question3,
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
    const data = normalizeUploadsInWriting(test.toJSON(), req);
    res.json({
      id: data.id,
      index: data.index,
      classCode: data.classCode,
      teacherName: data.teacherName,
      testType: data.testType,
      task1: data.task1,
      task2: data.task2,
      task1Image: data.task1Image,
      part2Question2: data.part2Question2,
      part2Question3: data.part2Question3,
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
