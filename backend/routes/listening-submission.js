const express = require('express');
const router = express.Router();

const ListeningSubmission = require('../models/ListeningSubmission');
const ListeningTest = require('../models/ListeningTest');

const { requireAuth } = require('../middlewares/auth');
const { requireTestPermission } = require('../middlewares/testPermissions');

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

    // Helper: safe parse
    const safeParseJson = (value) => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    };

    // Generate details from test structure and answers (port of front-end helper)
    const generateDetailsFromSections = (test, answers) => {
      const questions = Array.isArray(test?.questions) ? test.questions : [];
      const parts = Array.isArray(test?.partInstructions) ? test.partInstructions : [];
      const normalizedAnswers = answers && typeof answers === 'object' ? answers : {};

      const details = [];

      const getSectionQuestions = (partIndex, sectionIndex) =>
        questions
          .filter((q) => Number(q?.partIndex) === Number(partIndex) && Number(q?.sectionIndex) === Number(sectionIndex))
          .sort((a, b) => (Number(a?.questionIndex) || 0) - (Number(b?.questionIndex) || 0));

      let runningStart = 1;

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const p = parts[pIdx];
        const sections = Array.isArray(p?.sections) ? p.sections : [];
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const section = sections[sIdx] || {};
          const sectionType = String(section?.questionType || 'fill').toLowerCase();
          const sectionQuestions = getSectionQuestions(pIdx, sIdx);
          if (!sectionQuestions.length) continue;

          const firstQ = sectionQuestions[0];

          const explicitSectionStart = Number(section?.startingQuestionNumber);
          const hasExplicitStart = Number.isFinite(explicitSectionStart) && explicitSectionStart > 0;
          const sectionStart = hasExplicitStart ? explicitSectionStart : runningStart;

          if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
            const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
            if (!map) continue;
            const keys = Object.keys(map).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n)).sort((a,b)=>a-b);
            for (const num of keys) {
              const expected = map[String(num)];
              const student = normalizedAnswers[`q${num}`];
              const ok = false; // defer matching to simpler equals (server-side) - attempt basic match
              const studentVal = student ?? '';
              const expectedVal = expected ?? '';
              const isCorrect = String(studentVal).trim().toLowerCase() === String(expectedVal).trim().toLowerCase();
              details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: studentVal, correctAnswer: expectedVal, isCorrect });
            }
            runningStart = Math.max(runningStart, sectionStart + keys.length);
            continue;
          }

          if (sectionType === 'matching') {
            const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
            if (map) {
              const keys = Object.keys(map).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n)).sort((a,b)=>a-b);
              for (const num of keys) {
                const expected = map[String(num)];
                const student = normalizedAnswers[`q${num}`];
                const isCorrect = expected ? String(student).trim().toLowerCase() === String(expected).trim().toLowerCase() : false;
                details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect });
              }
              runningStart = Math.max(runningStart, sectionStart + keys.length);
              continue;
            }

            const start = sectionStart;
            const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : Array.isArray(firstQ?.items) ? firstQ.items : [];
            for (let i = 0; i < left.length; i++) {
              const num = start + i;
              const student = normalizedAnswers[`q${num}`];
              details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: '', isCorrect: false });
            }
            runningStart = Math.max(runningStart, sectionStart + left.length);
            continue;
          }

          if (sectionType === 'multi-select') {
            let groupStart = sectionStart;
            let totalCount = 0;
            for (const q of sectionQuestions) {
              const required = Number(q?.requiredAnswers) || 2;
              const studentRaw = normalizedAnswers[`q${groupStart}`];
              const expectedRaw = q?.correctAnswer ?? q?.answers;

              const studentDisplay = Array.isArray(studentRaw) ? studentRaw.join(',') : String(studentRaw ?? '');
              const expectedDisplay = Array.isArray(expectedRaw) ? expectedRaw.join(',') : String(expectedRaw ?? '');

              const ok = studentDisplay && expectedDisplay ? String(studentDisplay).trim().toLowerCase() === String(expectedDisplay).trim().toLowerCase() : false;

              for (let i = 0; i < required; i++) {
                details.push({ questionNumber: groupStart + i, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: studentDisplay, correctAnswer: expectedDisplay, isCorrect: ok });
              }

              groupStart += required;
              totalCount += required;
            }
            runningStart = Math.max(runningStart, sectionStart + totalCount);
            continue;
          }

          const startNum = sectionStart;
          const fallbackStart = Number(sectionQuestions[0]?.globalNumber) || null;
          const finalStart = Number.isFinite(startNum) && startNum > 0 ? startNum : fallbackStart;
          if (!Number.isFinite(finalStart)) continue;

          sectionQuestions.forEach((q, idx) => {
            const num = finalStart + idx;
            const expected = q?.correctAnswer;
            const student = normalizedAnswers[`q${num}`];
            const ok = student != null && expected != null ? String(student).trim().toLowerCase() === String(expected).trim().toLowerCase() : false;
            details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: String(sectionType || q?.questionType || 'fill').toLowerCase(), studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
          });

          runningStart = Math.max(runningStart, sectionStart + sectionQuestions.length);
        }
      }

      details.sort((a, b) => (Number(a?.questionNumber) || 0) - (Number(b?.questionNumber) || 0));
      return details;
    };

    const result = subs.map((s) => {
      const obj = s.toJSON();
      const t = testMap[String(s.testId)];
      // compute a displayable total from test structure when possible
      const testFull = t ? (t.toJSON ? t.toJSON() : t) : null;
      const computedTotal = computeTestTotal(testFull);

      // compute a 'correct' count using details when available, otherwise attempt to generate
      let parsedDetails = obj.details && typeof obj.details === 'string' ? safeParseJson(obj.details) : obj.details;
      parsedDetails = Array.isArray(parsedDetails) ? parsedDetails : [];
      let computedCorrect = parsedDetails.length ? parsedDetails.filter(d => d.isCorrect).length : null;

      // If we don't have parsedDetails but have test structure and answers, try generating
      if ((!parsedDetails || parsedDetails.length === 0) && testFull && obj.answers) {
        try {
          const parsedAnswers = safeParseJson(obj.answers) || {};
          const generated = generateDetailsFromSections({
            ...testFull,
            partInstructions: safeParseJson(testFull.partInstructions),
            questions: Array.isArray(testFull.questions) ? testFull.questions : (safeParseJson(testFull.questions) || [])
          }, parsedAnswers);
          if (generated && generated.length) {
            computedCorrect = generated.filter(d => d.isCorrect).length;
          }
        } catch (e) {
          // ignore
        }
      }

      const correct = computedCorrect != null ? computedCorrect : (Number(obj.correct) || 0);
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
      obj.computedCorrect = Number.isFinite(Number(correct)) ? Number(correct) : 0;
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

// POST: Admin rescore endpoint (teacher only) — safe to run on demand
router.post('/rescore', requireAuth, requireTestPermission('listening'), async (req, res) => {
  try {
    const { testId, submissionIds = [], dryRun = false, force = false, limit = null } = req.body || {};

    // Build where clause similar to scripts/rescore-listening-submissions.js
    const where = {};
    if (!force) {
      where[Op.or] = [{ total: 0 }, { total: { [Op.is]: null } }];
    }
    if (Array.isArray(submissionIds) && submissionIds.length) {
      where.id = submissionIds;
    }
    if (testId) where.testId = Number(testId);

    const subs = await ListeningSubmission.findAll({ where, order: [['id', 'ASC']], ...(limit ? { limit } : {}) });

    let updated = 0;
    const report = [];

    // Inline reuse of score logic from scripts/rescore-listening-submissions.js
    const parseIfJsonString = (val) => {
      let v = val;
      let attempts = 0;
      while (typeof v === 'string' && attempts < 3) {
        try { v = JSON.parse(v); } catch (e) { break; }
        attempts++;
      }
      return v;
    };

    const normalize = (val) => (val == null ? '' : String(val)).trim().toLowerCase();
    const explodeAccepted = (val) => {
      if (val == null) return [];
      if (Array.isArray(val)) return val;
      const s = String(val);
      if (s.includes('|')) return s.split('|').map((x) => x.trim()).filter(Boolean);
      if (s.includes('/')) return s.split('/').map((x) => x.trim()).filter(Boolean);
      if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
      return [s];
    };

    const bandFromCorrect = (c) => {
      if (c >= 39) return 9;
      if (c >= 37) return 8.5;
      if (c >= 35) return 8;
      if (c >= 32) return 7.5;
      if (c >= 30) return 7;
      if (c >= 26) return 6.5;
      if (c >= 23) return 6;
      if (c >= 18) return 5.5;
      if (c >= 16) return 5;
      if (c >= 13) return 4.5;
      if (c >= 11) return 4;
      return 3.5;
    };

    // Minimal scoring helper (covers common structures) — mirrors script behavior
    const scoreListening = ({ test, answers }) => {
      const normalizedAnswers = answers && typeof answers === 'object' ? answers : {};
      const questions = parseIfJsonString(test?.questions);
      const partInstructions = parseIfJsonString(test?.partInstructions);
      let correctCount = 0;
      let totalCount = 0;
      const details = [];

      const numericKeys = (obj) =>
        obj && typeof obj === 'object' && !Array.isArray(obj)
          ? Object.keys(obj).map((k) => parseInt(k, 10)).filter((n) => Number.isFinite(n)).sort((a,b)=>a-b)
          : [];

      const getSectionQuestions = (pIdx, sIdx) =>
        Array.isArray(questions)
          ? questions.filter((q) => Number(q?.partIndex) === Number(pIdx) && Number(q?.sectionIndex) === Number(sIdx)).sort((a,b)=> (Number(a?.questionIndex)||0)-(Number(b?.questionIndex)||0))
          : [];

      if (Array.isArray(partInstructions) && Array.isArray(questions)) {
        let runningStart = 1;
        const advanceRunning = (count, sectionStart) => { runningStart = Math.max(runningStart, (Number.isFinite(sectionStart) ? sectionStart : runningStart) + count); };

        for (let pIdx = 0; pIdx < partInstructions.length; pIdx++) {
          const part = partInstructions[pIdx];
          const sections = Array.isArray(part?.sections) ? part.sections : [];
          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const section = sections[sIdx] || {};
            const sectionType = String(section?.questionType || 'fill').toLowerCase();
            const sectionQuestions = getSectionQuestions(pIdx, sIdx);
            if (!sectionQuestions.length) continue;

            const firstQ = sectionQuestions[0];
            const explicitSectionStart = Number(section?.startingQuestionNumber);
            const hasExplicitStart = Number.isFinite(explicitSectionStart) && explicitSectionStart > 0;
            const sectionStart = hasExplicitStart ? explicitSectionStart : runningStart;

            if (sectionType === 'form-completion' || sectionType === 'notes-completion') {
              const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
              if (map) {
                const keys = numericKeys(map);
                for (const num of keys) {
                  totalCount++;
                  const expected = map[String(num)];
                  const student = normalizedAnswers[`q${num}`];
                  const accepted = explodeAccepted(expected).map(normalize);
                  const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
                  if (ok) correctCount++;
                  details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
                }
                advanceRunning(keys.length, sectionStart);
                continue;
              }
            }

            if (sectionType === 'matching') {
              const map = firstQ?.answers && typeof firstQ.answers === 'object' && !Array.isArray(firstQ.answers) ? firstQ.answers : null;
              if (map) {
                const keys = numericKeys(map);
                for (const num of keys) {
                  totalCount++;
                  const expected = map[String(num)];
                  const student = normalizedAnswers[`q${num}`];
                  const ok = normalize(student) === normalize(expected);
                  if (ok) correctCount++;
                  details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
                }
                advanceRunning(keys.length, sectionStart);
                continue;
              }

              const left = Array.isArray(firstQ?.leftItems) ? firstQ.leftItems : [];
              for (let i = 0; i < left.length; i++) {
                const num = sectionStart + i;
                totalCount++;
                const student = normalizedAnswers[`q${num}`];
                details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: student ?? '', correctAnswer: '', isCorrect: false });
              }
              advanceRunning(left.length, sectionStart);
              continue;
            }

            if (sectionType === 'multi-select') {
              let groupStart = sectionStart;
              let totalCountForSection = 0;
              for (const q of sectionQuestions) {
                const required = Number(q?.requiredAnswers) || 2;
                const student = normalizedAnswers[`q${groupStart}`];
                const expectedRaw = q?.correctAnswer ?? q?.answers;
                const studentDisplay = Array.isArray(student) ? student.join(',') : String(student ?? '');
                const expectedDisplay = Array.isArray(expectedRaw) ? expectedRaw.join(',') : String(expectedRaw ?? '');
                const ok = studentDisplay && expectedDisplay ? String(studentDisplay).trim().toLowerCase() === String(expectedDisplay).trim().toLowerCase() : false;
                totalCount += required;
                if (ok) correctCount += required;
                details.push({ questionNumber: groupStart, partIndex: pIdx, sectionIndex: sIdx, questionType: sectionType, studentAnswer: studentDisplay, correctAnswer: expectedDisplay, isCorrect: ok });
                groupStart += required;
                totalCountForSection += required;
              }
              advanceRunning(totalCountForSection, sectionStart);
              continue;
            }

            // default
            const startNum = sectionStart;
            const fallbackStart = Number(sectionQuestions[0]?.globalNumber) || null;
            const finalStart = Number.isFinite(startNum) && startNum > 0 ? startNum : fallbackStart;
            if (!Number.isFinite(finalStart)) {
              totalCount += sectionQuestions.length;
              advanceRunning(sectionQuestions.length, sectionStart);
              continue;
            }

            sectionQuestions.forEach((q, idx) => {
              const num = finalStart + idx;
              totalCount++;
              const expected = q?.correctAnswer;
              const student = normalizedAnswers[`q${num}`];
              const accepted = explodeAccepted(expected).map(normalize);
              const ok = accepted.length ? accepted.includes(normalize(student)) : normalize(student) === normalize(expected);
              if (ok) correctCount++;
              details.push({ questionNumber: num, partIndex: pIdx, sectionIndex: sIdx, questionType: String(sectionType || q?.questionType || 'fill').toLowerCase(), studentAnswer: student ?? '', correctAnswer: expected ?? '', isCorrect: ok });
            });

            advanceRunning(sectionQuestions.length, sectionStart);
          }
        }
      }

      const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const band = bandFromCorrect(correctCount);
      return { correctCount, totalCount, scorePercentage, band, details };
    };

    for (const s of subs) {
      const test = await ListeningTest.findByPk(s.testId);
      if (!test) {
        report.push({ id: s.id, skipped: 'no test' });
        continue;
      }

      const sc = scoreListening({ test: test.toJSON ? test.toJSON() : test, answers: parseIfJsonString(s.answers) });
      if (!(Number.isFinite(sc.totalCount) && sc.totalCount > 0)) {
        report.push({ id: s.id, skipped: 'cannot compute' });
        continue;
      }

      if (dryRun) {
        report.push({ id: s.id, from: { correct: s.correct, total: s.total }, to: { correct: sc.correctCount, total: sc.totalCount, band: sc.band } });
        continue;
      }

      await s.update({ correct: sc.correctCount, total: sc.totalCount, scorePercentage: sc.scorePercentage, band: sc.band, details: sc.details });
      updated++;
      report.push({ id: s.id, updated: true, to: { correct: sc.correctCount, total: sc.totalCount, band: sc.band } });
    }

    return res.json({ ok: true, updated, report });
  } catch (err) {
    console.error('Error during rescore endpoint:', err);
    return res.status(500).json({ ok: false, message: 'Rescore failed', error: err.message });
  }
});

module.exports = router;
