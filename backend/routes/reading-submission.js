const express = require('express');
const router = express.Router();
const ReadingSubmission = require('../models/ReadingSubmission');

// POST: Submit reading test answers (deprecated - prefer /api/reading-tests/:id/submit)
router.post('/', async (req, res) => {
  try {
    const { testId, passages } = req.body;

    if (!testId || !passages) {
      return res.status(400).json({ message: '❌ Dữ liệu không hợp lệ' });
    }

    const submission = await ReadingSubmission.create({
      testId,
      answers: { passages },
      total: passages.reduce((acc, p) => acc + ((p.questions && p.questions.length) || 0), 0),
      correct: 0,
      band: 0,
      scorePercentage: 0,
      userName: req.body.studentName || 'Unknown'
    });

    res.status(201).json({ message: '✅ Nộp bài thành công!', submissionId: submission.id });
  } catch (error) {
    console.error('Error submitting reading test (legacy):', error);
    res.status(500).json({ message: '❌ Lỗi khi nộp bài', error: error.message });
  }
});

// GET: Get submission result by ID (from DB)
router.get('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await ReadingSubmission.findByPk(submissionId);

    if (!submission) return res.status(404).json({ message: '❌ Không tìm thấy bài nộp' });

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: '❌ Lỗi khi lấy kết quả', error: error.message });
  }
});

// GET: Get all submissions for a test
router.get('/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const testSubmissions = await ReadingSubmission.findAll({ where: { testId }, order: [['createdAt', 'DESC']] });

    res.json(testSubmissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: '❌ Lỗi khi lấy danh sách bài nộp', error: error.message });
  }
});

module.exports = router;
