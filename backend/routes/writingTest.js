const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const WritingTest = require('../models/WritingTests');
const { requireAuth, requireRole } = require('../middlewares/auth');

const normalizeUploadsInText = (text, req) => {
  if (!text || typeof text !== 'string') return text;

  const host = `${req.protocol}://${req.get('host')}`;
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
    .replace(/\bsrc\s*=\s*"([^"]+)"/gi, (_match, url) => `src="${normalize(url)}"`)
    .replace(/\bsrc\s*=\s*'([^']+)'/gi, (_match, url) => `src='${normalize(url)}'`)
    .replace(/\bhref\s*=\s*"([^"]+)"/gi, (_match, url) => `href="${normalize(url)}"`)
    .replace(/\bhref\s*=\s*'([^']+)'/gi, (_match, url) => `href='${normalize(url)}'`)
    .replace(/url\(([^)]+)\)/gi, (_match, rawUrl) => {
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

const uploadsRoot = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const shouldIncludeArchived = (req) =>
  ['1', 'true', 'yes'].includes(String(req.query.includeArchived || '').trim().toLowerCase());

const isTruthyFlag = (value) =>
  ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

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
    const normalized = tests.map((test) =>
      normalizeUploadsInWriting(test.toJSON ? test.toJSON() : test, req)
    );

    res.json(normalized);
  } catch (err) {
    console.error('Error loading writing tests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/detail/:id', async (req, res) => {
  try {
    const test = await WritingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Writing test not found' });
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
    console.error('Error loading writing test detail:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
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
      return res.status(400).json({ message: 'Please provide both Task 1 and Task 2.' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Please provide both Part 2 questions.' });
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

    res.json({ message: 'Writing test created successfully.', test: newTest });
  } catch (err) {
    console.error('Error creating writing test:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
      return res.status(400).json({ message: 'Please provide both Task 1 and Task 2.' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Please provide both Part 2 questions.' });
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

    res.json({ message: 'Writing test created successfully.', test: newTest });
  } catch (err) {
    console.error('Error creating writing test with image:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const test = await WritingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Writing test not found' });
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
    console.error('Error loading writing test:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', requireAuth, requireRole('teacher', 'admin'), async (req, res) => {
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
      removeTask1Image,
    } = req.body;

    const test = await WritingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Writing test not found' });
    }

    const shouldRemoveTask1Image = isTruthyFlag(removeTask1Image);

    await test.update({
      classCode,
      teacherName,
      task1,
      task2,
      testType,
      part2Question2,
      part2Question3,
      task1Image: shouldRemoveTask1Image ? null : test.task1Image,
      questions: JSON.stringify(questions),
    });

    res.json({
      message: 'Writing test updated successfully.',
      test,
    });
  } catch (err) {
    console.error('Error updating writing test:', err);
    res.status(500).json({ message: 'Server error while updating the writing test.' });
  }
});

router.put('/:id/with-image', requireAuth, requireRole('teacher', 'admin'), upload.single('image'), async (req, res) => {
  try {
    const {
      classCode,
      teacherName,
      task1,
      task2,
      testType,
      part2Question2,
      part2Question3,
      removeTask1Image,
    } = req.body;

    const test = await WritingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Writing test not found' });
    }

    const resolvedType = testType || test.testType || 'writing';
    const isPetWriting = resolvedType === 'pet-writing';
    const shouldRemoveTask1Image = isTruthyFlag(removeTask1Image);

    if (!task1 || (!isPetWriting && !task2)) {
      return res.status(400).json({ message: 'Please provide both Task 1 and Task 2.' });
    }

    if (isPetWriting && (!part2Question2 || !part2Question3)) {
      return res.status(400).json({ message: 'Please provide both Part 2 questions.' });
    }

    await test.update({
      classCode,
      teacherName,
      task1,
      task2: isPetWriting ? (task2 || '') : task2,
      testType: resolvedType,
      part2Question2,
      part2Question3,
      task1Image: req.file
        ? `/uploads/${req.file.filename}`
        : shouldRemoveTask1Image
          ? null
          : test.task1Image,
    });

    res.json({ message: 'Writing test updated successfully.', test });
  } catch (err) {
    console.error('Error updating writing test with image:', err);
    res.status(500).json({ message: 'Server error while updating the writing test.' });
  }
});

module.exports = router;
