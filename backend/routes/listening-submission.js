const express = require('express');
const router = express.Router();

const ListeningSubmission = require('../models/ListeningSubmission');
const ListeningTest = require('../models/ListeningTest');

// POST: Submit listening test answers
router.post('/', async (req, res) => {
  try {
    // Legacy endpoint used by older client flows. Prefer /api/listening-tests/:id/submit.
    const { testId, passages, answers, user, studentName, studentId } = req.body;

    // If client sends the new format, store it.
    if (testId && answers && typeof answers === 'object') {
      const resolvedUserName = studentName || user?.name || user?.username || null;
      const resolvedUserId = studentId || user?.id || null;
      const submission = await ListeningSubmission.create({
        testId: Number(testId),
        userId: resolvedUserId,
        userName: resolvedUserName,
        answers,
        correct: 0,
        total: 0,
        scorePercentage: 0,
        band: null,
      });

      return res.status(201).json({
        message: '✅ Nộp bài thành công!',
        submissionId: submission.id,
      });
    }

    // Fallback: keep accepting old payload shape without crashing.
    if (!testId || !passages) {
      return res.status(400).json({ message: '❌ Dữ liệu không hợp lệ' });
    }

    let correctCount = 0;
    let totalCount = 0;
    (passages || []).forEach((passage) => {
      (passage.questions || []).forEach((q) => {
        totalCount++;
        if (q && q.isCorrect) correctCount++;
      });
    });

    const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const resolvedUserName = studentName || user?.name || user?.username || 'Unknown';
    const resolvedUserId = studentId || user?.id || null;

    const submission = await ListeningSubmission.create({
      testId: Number(testId),
      userId: resolvedUserId,
      userName: resolvedUserName,
      answers: { passages },
      correct: correctCount,
      total: totalCount,
      scorePercentage,
      band: null,
    });

    res.status(201).json({
      message: '✅ Nộp bài thành công!',
      submissionId: submission.id,
      score: scorePercentage,
    });
  } catch (error) {
    console.error('Error submitting listening test:', error);
    res.status(500).json({
      message: '❌ Lỗi khi nộp bài',
      error: error.message
    });
  }
});

// GET: List all submissions with test info (for admin panel)
router.get('/admin/list', async (req, res) => {
  try {
    const subs = await ListeningSubmission.findAll({
      order: [['createdAt', 'DESC']],
    });

    const testIds = [...new Set(subs.map((s) => s.testId).filter(Boolean))];
    const tests = testIds.length
      ? await ListeningTest.findAll({ where: { id: testIds } })
      : [];
    const testMap = {};
    tests.forEach((t) => {
      testMap[String(t.id)] = t;
    });

    const result = subs.map((s) => {
      const obj = s.toJSON();
      const t = testMap[String(s.testId)];
      obj.ListeningTest = t
        ? {
            id: t.id,
            title: t.title,
            classCode: t.classCode || '',
            teacherName: t.teacherName || '',
          }
        : null;
      return obj;
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching admin list:', error);
    res.status(500).json({ message: '❌ Lỗi khi lấy danh sách', error: error.message });
  }
});

// GET: Get all submissions for a test
router.get('/test/:testId', async (req, res) => {
  try {
    const { testId } = req.params;
    const subs = await ListeningSubmission.findAll({
      where: { testId: Number(testId) },
      order: [['createdAt', 'DESC']],
    });
    res.json(subs.map((s) => s.toJSON()));
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      message: '❌ Lỗi khi lấy danh sách bài nộp',
      error: error.message
    });
  }
});

// POST: Add/update feedback for a submission (teacher action)
router.post('/:submissionId/feedback', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { feedback, feedbackBy } = req.body;

    const submission = await ListeningSubmission.findByPk(submissionId);
    if (!submission) {
      return res.status(404).json({ message: '❌ Không tìm thấy bài nộp' });
    }

    submission.feedback = feedback || '';
    submission.feedbackBy = feedbackBy || '';
    submission.feedbackAt = new Date();
    submission.feedbackSeen = false;
    await submission.save();

    res.json({ message: '✅ Đã lưu nhận xét!', submission: submission.toJSON() });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ message: '❌ Lỗi khi lưu nhận xét', error: error.message });
  }
});

// GET: Get submission result by ID (for review page)
router.get('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await ListeningSubmission.findByPk(submissionId);
    if (!submission) return res.status(404).json({ message: '❌ Không tìm thấy bài nộp' });

    const test = submission.testId ? await ListeningTest.findByPk(submission.testId) : null;

    res.json({
      submission: submission.toJSON(),
      test: test ? test.toJSON() : null,
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({
      message: '❌ Lỗi khi lấy kết quả',
      error: error.message
    });
  }
});

module.exports = router;
