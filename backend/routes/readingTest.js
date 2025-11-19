const express = require('express');
const router = express.Router();
const ReadingTest = require('../models/ReadingTest');

// Get all reading tests
router.get('/', async (req, res) => {
  try {
    const tests = await ReadingTest.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single reading test by id
router.get('/:id', async (req, res) => {
    try {
      const test = await ReadingTest.findById(req.params.id);
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
  const { title, passages } = req.body;

  const test = new ReadingTest({
    title,
    passages
  });

  try {
    const newTest = await test.save();
    res.status(201).json(newTest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a reading test
router.put('/:id', async (req, res) => {
    try {
      const updatedTest = await ReadingTest.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updatedTest) {
        return res.status(404).json({ message: 'Cannot find test' });
      }
      res.json(updatedTest);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  
  // Delete a reading test
  router.delete('/:id', async (req, res) => {
    try {
      const test = await ReadingTest.findById(req.params.id);
      if (!test) {
        return res.status(404).json({ message: 'Cannot find test' });
      }
      await test.remove();
      res.json({ message: 'Deleted Test' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

module.exports = router;
