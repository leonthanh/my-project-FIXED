const express = require('express');
const router = express.Router();
const ReadingTest = require('../models/ReadingTest');

// Get all reading tests
router.get('/', async (req, res) => {
  try {
    const tests = await ReadingTest.findAll({ order: [['createdAt', 'DESC']] });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single reading test by id
router.get('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new reading test
router.post('/', async (req, res) => {
  const { title, classCode, teacherName, passages } = req.body;

  try {
    const newTest = await ReadingTest.create({
      title,
      classCode,
      teacherName,
      passages
    });
    res.status(201).json({ message: '✅ Đã tạo đề Reading thành công!', test: newTest });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a reading test
router.put('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.update(req.body);
    res.json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a reading test
router.delete('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.destroy();
    res.json({ message: 'Deleted Test' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
