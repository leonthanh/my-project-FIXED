const express = require('express');
const router = express.Router();

// Temporary in-memory storage for submissions (should be replaced with DB)
const submissions = [];

// POST: Submit reading test answers
router.post('/', async (req, res) => {
  try {
    const { testId, passages } = req.body;

    if (!testId || !passages) {
      return res.status(400).json({ message: '❌ Dữ liệu không hợp lệ' });
    }

    // Calculate score
    let correctCount = 0;
    let totalCount = 0;

    passages.forEach(passage => {
      passage.questions.forEach(q => {
        totalCount++;
        if (q.isCorrect) correctCount++;
      });
    });

    const score = Math.round((correctCount / totalCount) * 100);

    // Create submission object
    const submission = {
      id: Date.now().toString(),
      testId,
      passages,
      correctCount,
      totalCount,
      score,
      submittedAt: new Date(),
      studentName: req.body.studentName || 'Unknown',
      studentId: req.body.studentId || 'Unknown'
    };

    // Store submission (in real app, save to database)
    submissions.push(submission);

    res.status(201).json({
      message: '✅ Nộp bài thành công!',
      submissionId: submission.id,
      score: submission.score
    });
  } catch (error) {
    console.error('Error submitting reading test:', error);
    res.status(500).json({
      message: '❌ Lỗi khi nộp bài',
      error: error.message
    });
  }
});

// GET: Get submission result by ID
router.get('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = submissions.find(s => s.id === submissionId);

    if (!submission) {
      return res.status(404).json({ message: '❌ Không tìm thấy bài nộp' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      message: '❌ Lỗi khi lấy kết quả',
      error: error.message
    });
  }
});

// GET: Get all submissions for a test
router.get('/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const testSubmissions = submissions.filter(s => s.testId === testId);

    res.json(testSubmissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      message: '❌ Lỗi khi lấy danh sách bài nộp',
      error: error.message
    });
  }
});

module.exports = router;
