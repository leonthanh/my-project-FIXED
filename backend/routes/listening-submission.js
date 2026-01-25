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

    // Helper to compute expected total from test structure
    const parseIfJsonString = (value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    const computeTestTotal = (testObj) => {
      if (!testObj) return 40;
      const questions = Array.isArray(parseIfJsonString(testObj.questions)) ? parseIfJsonString(testObj.questions) : [];
      const parts = Array.isArray(parseIfJsonString(testObj.partInstructions)) ? parseIfJsonString(testObj.partInstructions) : [];

      const getSectionQuestions = (partIndex, sectionIndex) =>
        questions
          .filter((q) => Number(q?.partIndex) === Number(partIndex) && Number(q?.sectionIndex) === Number(sectionIndex))
          .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));

      let total = 0;
      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const p = parts[pIdx];
        const sections = Array.isArray(p?.sections) ? p.sections : [];
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx] || {};
          const sectionType = String(section?.questionType || 'fill').toLowerCase();
          const sectionQuestions = getSectionQuestions(pIdx, sIdx);
          if (!sectionQuestions.length) continue;

          if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
            const firstQ = sectionQuestions[0];
            const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
            if (map) {
              const keys = Object.keys(map).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n));
              total += keys.length;
            } else {
              const rows = Array.isArray(firstQ?.formRows) ? firstQ.formRows : [];
              const blanks = rows.filter((r) => r && r.isBlank);
              total += blanks.length;
            }
            continue;
          }

          if (sectionType === 'matching') {
            const firstQ = sectionQuestions[0];
            const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
            if (map) {
              const keys = Object.keys(map).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n));
              total += keys.length;
            } else {
              const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : Array.isArray(firstQ?.items) ? firstQ.items : [];
              total += left.length;
            }
            continue;
          }

          if (sectionType === 'multi-select') {
            for (const q of sectionQuestions) {
              const required = Number(q?.requiredAnswers) || 2;
              total += required;
            }
            continue;
          }

          // default
          total += sectionQuestions.length;
        }
      }

      return total || 40;
    };

    const result = subs.map((s) => {
      const obj = s.toJSON();
      const t = testMap[String(s.testId)];
      // compute a displayable total from test structure when possible
      const testFull = t ? (t.toJSON ? t.toJSON() : t) : null;
      const computedTotal = computeTestTotal(testFull);
      const correct = Number(obj.correct) || 0;
      const computedPercentage = computedTotal ? Math.round((correct / computedTotal) * 100) : 0;

      obj.ListeningTest = t
        ? {
            id: t.id,
            title: t.title,
            classCode: t.classCode || '',
            teacherName: t.teacherName || '',
          }
        : null;
      obj.computedTotal = computedTotal;
      obj.computedPercentage = computedPercentage;
      // Backwards-compatible override: set stored fields so older frontends (served from build) show corrected totals
      obj.total = computedTotal;
      obj.scorePercentage = computedPercentage;
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

// POST: Autosave partial answers for a test (create or update an active attempt)
router.post('/:testId/autosave', async (req, res) => {
  try {
    const { testId } = req.params;
    const { submissionId, answers, expiresAt, user } = req.body;
    // DEBUG: log autosave payload to help E2E debugging (dev only)
    try { console.log(`[DEBUG] POST /api/listening-submissions/${testId}/autosave - body:`, JSON.stringify(req.body).slice(0,2000)); } catch (e) { console.error('[DEBUG] Could not stringify autosave body', e); }

    const resolvedUserId = user?.id || null;
    const resolvedUserName = user?.name || user?.username || user?.email || null;

    // If submissionId provided, update that record (if not finished)
    if (submissionId) {
      const sub = await ListeningSubmission.findByPk(submissionId);
      if (!sub) return res.status(404).json({ message: '❌ Không tìm thấy attempt' });
      if (sub.finished) return res.status(400).json({ message: '❌ Attempt đã hoàn thành' });

      sub.answers = answers || sub.answers;
      sub.expiresAt = expiresAt ? new Date(expiresAt) : sub.expiresAt;
      sub.lastSavedAt = new Date();
      await sub.save();

      return res.json({ message: '✅ Đã lưu tạm', submissionId: sub.id, savedAt: sub.lastSavedAt });
    }

    // Try to find an existing unfinished attempt for this user + test
    if (resolvedUserId) {
      const existing = await ListeningSubmission.findOne({
        where: { testId: Number(testId), userId: resolvedUserId, finished: false },
        order: [['updatedAt', 'DESC']],
      });
      if (existing) {
        existing.answers = answers || existing.answers;
        existing.expiresAt = expiresAt ? new Date(expiresAt) : existing.expiresAt;
        existing.lastSavedAt = new Date();
        await existing.save();
        return res.json({ message: '✅ Đã lưu tạm', submissionId: existing.id, savedAt: existing.lastSavedAt });
      }
    }

    // Otherwise create a new partial attempt (user may be anonymous)
    const created = await ListeningSubmission.create({
      testId: Number(testId),
      userId: resolvedUserId,
      userName: resolvedUserName,
      answers: answers || {},
      correct: 0,
      total: 0,
      scorePercentage: 0,
      finished: false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      lastSavedAt: new Date(),
    });

    res.status(201).json({ message: '✅ Tạo attempt tạm', submissionId: created.id, savedAt: created.lastSavedAt });
  } catch (error) {
    console.error('Error autosaving attempt:', error);
    res.status(500).json({ message: '❌ Lỗi khi autosave', error: error.message });
  }
});

// GET: Get active attempt for a test (by submissionId or current user)
router.get('/:testId/active', async (req, res) => {
  try {
    const { testId } = req.params;
    const { submissionId, userId } = req.query;
    console.log(`[DEBUG] GET /api/listening-submissions/${testId}/active - query:`, req.query);

    if (submissionId) {
      const sub = await ListeningSubmission.findByPk(submissionId);
      if (!sub) {
        console.log(`[DEBUG] GET /api/listening-submissions/${testId}/active - no submission for submissionId=${submissionId}`);
        return res.status(404).json({ message: '❌ Không tìm thấy attempt' });
      }
      console.log(`[DEBUG] GET /api/listening-submissions/${testId}/active - returning submissionId=${sub.id}`);
      return res.json({ submission: sub.toJSON() });
    }

    if (userId) {
      const sub = await ListeningSubmission.findOne({ where: { testId: Number(testId), userId: Number(userId), finished: false }, order: [['updatedAt', 'DESC']] });
      if (!sub) {
        console.log(`[DEBUG] GET /api/listening-submissions/${testId}/active - no active submission for userId=${userId}`);
        return res.json({ submission: null });
      }
      console.log(`[DEBUG] GET /api/listening-submissions/${testId}/active - returning submissionId=${sub.id} for userId=${userId}`);
      return res.json({ submission: sub.toJSON() });
    }

    // No identifying info, return null
    return res.json({ submission: null });
  } catch (error) {
    console.error('Error fetching active attempt:', error);
    res.status(500).json({ message: '❌ Lỗi khi lấy attempt', error: error.message });
  }
});

// POST: Cleanup unfinished attempts for a test for a given user (mark finished)
router.post('/:testId/cleanup', async (req, res) => {
  try {
    const { testId } = req.params;
    const { user } = req.body;
    const resolvedUserId = user?.id || null;
    if (!resolvedUserId) return res.status(400).json({ message: '❌ Thiếu user id' });

    const updated = await ListeningSubmission.update(
      { finished: true, lastSavedAt: new Date() },
      { where: { testId: Number(testId), userId: resolvedUserId, finished: false } }
    );

    console.log(`[DEBUG] Cleanup for test ${testId} user ${resolvedUserId} - updated rows: ${updated[0]}`);
    return res.json({ message: '✅ Cleanup completed', updated: updated[0] });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: '❌ Lỗi khi cleanup', error: error.message });
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

    const safeParseJson = (value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    const subJson = submission.toJSON();
    subJson.answers = safeParseJson(subJson.answers);
    subJson.details = safeParseJson(subJson.details);

    const testJson = test ? test.toJSON() : null;
    if (testJson) {
      testJson.questions = safeParseJson(testJson.questions);
      testJson.partInstructions = safeParseJson(testJson.partInstructions);
      testJson.partTypes = safeParseJson(testJson.partTypes);
      testJson.partAudioUrls = safeParseJson(testJson.partAudioUrls);
    }

    res.json({
      submission: subJson,
      test: testJson,
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
