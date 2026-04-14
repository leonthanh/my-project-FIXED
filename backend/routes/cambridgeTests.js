const express = require("express");
const router = express.Router();
const { CambridgeListening, CambridgeReading, CambridgeSubmission } = require("../models");
const { Op, col, fn, where: sequelizeWhere } = require("sequelize");
const { logError } = require("../logger");
const { processTestParts } = require("../utils/clozParser");
const {
  DEFAULT_EXTENSION_MINUTES,
  buildTimingPayload,
  extendDeadline,
  normalizeExtensionMinutes,
  resolveAuthoritativeExpiry,
} = require("../utils/testTiming");

const FINALIZED_CAMBRIDGE_WHERE = {
  [Op.or]: [{ finished: true }, { finished: null }],
};

const shouldIncludeAllVisibility = (req) =>
  String(req.query.visibility || '').trim().toLowerCase() === 'all';

const buildVisibleCambridgeWhere = (req, baseWhere = {}) =>
  shouldIncludeAllVisibility(req)
    ? baseWhere
    : { ...baseWhere, status: 'published' };

// Compute total questions from parts so frontend displays stay in sync with teacher view
const safeParseParts = (rawParts) => {
  if (!rawParts) return [];
  if (Array.isArray(rawParts)) return rawParts;
  if (typeof rawParts === 'string') {
    try {
      const parsed = JSON.parse(rawParts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const countTotalQuestionsFromParts = (rawParts = []) => {
  const parts = safeParseParts(rawParts);
  // Ensure cloze-test blanks are generated for legacy tests before counting
  const processedParts = processTestParts(parts);

  let total = 0;

  processedParts.forEach(part => {
    (part.sections || []).forEach(section => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      const questions = section.questions || [];

      questions.forEach(question => {
        if (sectionType === "long-text-mc" && Array.isArray(question.questions)) {
          total += question.questions.length;
          return;
        }

        if (sectionType === 'people-matching' && Array.isArray(question.people)) {
          total += question.people.length > 0 ? question.people.length : 1;
          return;
        }

        if (sectionType === 'gap-match' && Array.isArray(question.leftItems)) {
          total += question.leftItems.length > 0 ? question.leftItems.length : 1;
          return;
        }

        if (sectionType === 'word-form' && Array.isArray(question.sentences)) {
          total += question.sentences.length > 0 ? question.sentences.length : 1;
          return;
        }

        if (sectionType === 'short-message') {
          total += 1;
          return;
        }

        if (sectionType === "cloze-mc" && Array.isArray(question.blanks)) {
          total += question.blanks.length > 0 ? question.blanks.length : 1;
          return;
        }

        if (sectionType === "cloze-test") {
          if (Array.isArray(question.blanks) && question.blanks.length > 0) {
            total += question.blanks.length;
            return;
          }
          if (question.answers && typeof question.answers === 'object' && !Array.isArray(question.answers)) {
            const n = Object.keys(question.answers).length;
            total += n > 0 ? n : 1;
            return;
          }
          total += 1;
          return;
        }

        if (sectionType === "inline-choice" && Array.isArray(question.blanks)) {
          total += question.blanks.length > 0 ? question.blanks.length : 1;
          return;
        }

        // Fallback for single question items
        total += 1;
      });
    });
  });

  return total;
};

const normalizeListeningAudioPayload = ({ mainAudioUrl, parts, fallbackParts = [] }) => {
  const normalizedParts = safeParseParts(parts !== undefined ? parts : fallbackParts);
  const normalizedMainAudioUrl = typeof mainAudioUrl === 'string' ? mainAudioUrl.trim() : '';
  const normalizedPartAudioUrls = normalizedParts
    .map((part) => (typeof part?.audioUrl === 'string' ? part.audioUrl.trim() : ''))
    .filter(Boolean);
  const uniquePartAudioUrls = Array.from(
    new Set(normalizedPartAudioUrls)
  );
  const sharedPartAudioUrl = normalizedPartAudioUrls.length > 1 && uniquePartAudioUrls.length === 1
    ? uniquePartAudioUrls[0]
    : null;

  return {
    mainAudioUrl: normalizedMainAudioUrl || sharedPartAudioUrl,
    parts: normalizedParts,
  };
};

const parseDetailedResults = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
};

const countPendingManualAnswers = (submission) => {
  if (!submission || submission.finished === false) return 0;

  const hasReview =
    String(submission.status || "").toLowerCase() === "reviewed" ||
    Boolean(String(submission.feedbackBy || "").trim()) ||
    Boolean(String(submission.feedback || "").trim());

  if (hasReview) return 0;

  const detailedResults = parseDetailedResults(submission.detailedResults);
  if (!detailedResults) return 0;

  return Object.values(detailedResults).filter(
    (result) =>
      result &&
      typeof result === "object" &&
      result.isCorrect === null &&
      Boolean(String(result.userAnswer || "").trim())
  ).length;
};

const normalizeCambridgeProgressMeta = (meta = {}) => {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta;
};

const getCambridgeModelByType = (testType = "") => {
  const normalized = String(testType || "").trim().toLowerCase();
  return normalized.includes("listening") ? CambridgeListening : CambridgeReading;
};

const getCambridgeTestRecord = async (testId, testType) => {
  const Model = getCambridgeModelByType(testType);
  return Model.findByPk(testId);
};

const findActiveCambridgeDraft = async ({
  submissionId,
  testId,
  testType,
  userId,
}) => {
  if (submissionId) {
    const sub = await CambridgeSubmission.findByPk(submissionId);
    if (sub && sub.finished === false) {
      return sub;
    }
  }

  if (!userId) {
    return null;
  }

  return CambridgeSubmission.findOne({
    where: {
      testId: Number(testId),
      testType: String(testType || ""),
      userId: Number(userId),
      finished: false,
    },
    order: [["updatedAt", "DESC"]],
  });
};

// Backward-compatible alias used below
const countTotalQuestions = countTotalQuestionsFromParts;

const stripDataUrls = (value) => {
  const dataUrlRegex = /data:image\/[a-zA-Z]+;base64,[^"'\s)]+/g;
  const allowDataUrlKeys = new Set(['imageUrl', 'mapImageUrl']);

  const walk = (input) => {
    if (typeof input === "string") {
      return dataUrlRegex.test(input) ? input.replace(dataUrlRegex, "") : input;
    }
    if (Array.isArray(input)) {
      return input.map(walk);
    }
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input).map(([key, val]) => {
          if (allowDataUrlKeys.has(key)) {
            return [key, val];
          }
          return [key, walk(val)];
        })
      );
    }
    return input;
  };

  return walk(value);
};

const requireAdminKeyIfConfigured = (req, res) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return true;
  const got = req.headers['x-admin-key'];
  if (got && String(got) === String(expected)) return true;
  res.status(403).json({ message: 'Forbidden' });
  return false;
};

/**
 * Cambridge Tests Routes
 * Routes cho việc quản lý các đề thi Cambridge (KET, PET, etc.)
 */

// ===== GET ALL CAMBRIDGE TESTS (Reading + Listening combined) =====
router.get("/", async (req, res) => {
  try {
    const { testType } = req.query;
    const where = buildVisibleCambridgeWhere(req, testType ? { testType } : {});

    // Fetch both reading and listening tests
    const [readingTests, listeningTests] = await Promise.all([
      CambridgeReading.findAll({
        where,
        order: [["createdAt", "DESC"]],
        attributes: [
          "id",
          "title", 
          "classCode",
          "teacherName",
          "testType",
          "totalQuestions",
          "status",
          "createdAt",
        ],
      }),
      CambridgeListening.findAll({
        where,
        order: [["createdAt", "DESC"]],
        attributes: [
          "id",
          "title",
          "classCode",
          "teacherName", 
          "testType",
          "totalQuestions",
          "status",
          "createdAt",
        ],
      }),
    ]);

    // Add category tag to distinguish
    const allTests = [
      ...readingTests.map(t => ({ ...t.toJSON(), category: 'reading' })),
      ...listeningTests.map(t => ({ ...t.toJSON(), category: 'listening' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allTests);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách Cambridge tests:", err);
    logError("Lỗi khi lấy danh sách Cambridge tests", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// ===== ADMIN: RECALCULATE totalQuestions FOR LEGACY TESTS =====
// POST /api/cambridge/admin/recalculate-total-questions?scope=both|reading|listening&testType=ket-reading&dryRun=true
router.post('/admin/recalculate-total-questions', async (req, res) => {
  try {
    if (!requireAdminKeyIfConfigured(req, res)) return;

    const scope = String(req.query.scope || 'both').toLowerCase();
    const dryRun = String(req.query.dryRun ?? 'true').toLowerCase() !== 'false';
    const testType = req.query.testType ? String(req.query.testType) : null;

    const where = testType ? { testType } : {};
    const targets = [];
    if (scope === 'both' || scope === 'reading') targets.push({ name: 'reading', Model: CambridgeReading });
    if (scope === 'both' || scope === 'listening') targets.push({ name: 'listening', Model: CambridgeListening });

    const changes = [];
    let totalCount = 0;

    for (const t of targets) {
      const tests = await t.Model.findAll({ where, order: [['id', 'ASC']] });
      totalCount += tests.length;

      for (const test of tests) {
        const json = test.toJSON();
        const computedTotal = countTotalQuestionsFromParts(json.parts);
        const before = Number(json.totalQuestions) || 0;
        const after = Number(computedTotal) || 0;

        if (before !== after) {
          changes.push({
            category: t.name,
            id: json.id,
            testType: json.testType,
            title: json.title,
            before,
            after,
          });

          if (!dryRun) {
            await test.update({ totalQuestions: after });
          }
        }
      }
    }

    res.json({
      dryRun,
      scope,
      filter: { testType },
      totalCount,
      changedCount: changes.length,
      changes,
    });
  } catch (err) {
    console.error('❌ Lỗi khi recalculate totalQuestions:', err);
    logError('Lỗi khi recalculate totalQuestions', err);
    res.status(500).json({ message: 'Lỗi server khi recalculate totalQuestions.' });
  }
});

// ===== LISTENING TESTS =====

// GET all listening tests
router.get("/listening-tests", async (req, res) => {
  try {
    const { testType } = req.query;
    
    const where = buildVisibleCambridgeWhere(req, testType ? { testType } : {});
    
    const tests = await CambridgeListening.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "classCode",
        "teacherName",
        "testType",
        "totalQuestions",
        "status",
        "createdAt",
      ],
    });

    res.json(tests);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách Cambridge Listening:", err);
    logError("Lỗi khi lấy danh sách Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// GET single listening test
router.get("/listening-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    res.json(test);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết Cambridge Listening:", err);
    logError("Lỗi khi lấy chi tiết Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// POST create listening test
const { requireAuth } = require('../middlewares/auth');
const { requireTestPermission } = require('../middlewares/testPermissions');
router.post("/listening-tests", requireAuth, requireTestPermission('cambridge'), async (req, res) => {
  try {
    const {
      title,
      classCode,
      teacherName,
      testType,
      mainAudioUrl,
      parts,
      totalQuestions,
    } = req.body;

    // Validation
    if (!title || !classCode || !testType) {
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc: title, classCode, testType" 
      });
    }

    const normalizedListeningPayload = normalizeListeningAudioPayload({
      mainAudioUrl,
      parts,
    });

    const newTest = await CambridgeListening.create({
      title,
      classCode,
      teacherName: teacherName || '',
      testType,
      mainAudioUrl: normalizedListeningPayload.mainAudioUrl,
      parts: normalizedListeningPayload.parts,
      totalQuestions: totalQuestions || 0,
      status: 'draft',
    });

    console.log(`✅ Tạo đề Cambridge Listening thành công: ${newTest.id}`);

    res.status(201).json({
      message: "Tạo đề thành công!",
      test: newTest,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo Cambridge Listening:", err);
    logError("Lỗi khi tạo Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// PUT update listening test
router.put("/listening-tests/:id", requireAuth, requireTestPermission('cambridge'), async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const {
      title,
      classCode,
      teacherName,
      testType,
      mainAudioUrl,
      parts,
      totalQuestions,
      status,
    } = req.body;

    const normalizedListeningPayload = normalizeListeningAudioPayload({
      mainAudioUrl: mainAudioUrl !== undefined ? mainAudioUrl : test.mainAudioUrl,
      parts,
      fallbackParts: test.parts,
    });

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
      mainAudioUrl: normalizedListeningPayload.mainAudioUrl,
      parts: normalizedListeningPayload.parts,
      totalQuestions: totalQuestions ?? test.totalQuestions,
      status: status || test.status,
    });

    res.json({
      message: "Cập nhật đề thành công!",
      test,
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật Cambridge Listening:", err);
    logError("Lỗi khi cập nhật Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật đề thi." });
  }
});

// DELETE listening test
router.delete("/listening-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeListening.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    await test.destroy();

    res.json({ message: "Xóa đề thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa Cambridge Listening:", err);
    logError("Lỗi khi xóa Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi xóa đề thi." });
  }
});

// ===== READING TESTS =====

// GET all reading tests
router.get("/reading-tests", async (req, res) => {
  try {
    const { testType } = req.query;
    
    const where = buildVisibleCambridgeWhere(req, testType ? { testType } : {});
    
    const tests = await CambridgeReading.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    const normalized = tests.map(test => {
      const json = test.toJSON();
      const computedTotal = countTotalQuestions(json.parts);
      delete json.parts; // keep list response light
      return {
        ...json,
        totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách Cambridge Reading:", err);
    logError("Lỗi khi lấy danh sách Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách đề thi." });
  }
});

// GET single reading test
router.get("/reading-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const json = test.toJSON();
    const computedTotal = countTotalQuestions(json.parts);
    const parsedParts = typeof json.parts === "string" ? (() => {
      try {
        return JSON.parse(json.parts);
      } catch (e) {
        return [];
      }
    })() : json.parts;

    // Ensure cloze-test questions have blanks[] even for older saved tests
    const processedParts = processTestParts(parsedParts);

    res.json({
      ...json,
      parts: stripDataUrls(processedParts),
      totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết Cambridge Reading:", err);
    logError("Lỗi khi lấy chi tiết Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// POST create reading test
router.post("/reading-tests", requireAuth, requireTestPermission('cambridge'), async (req, res) => {
  try {
    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
    } = req.body;

    // Validation
    if (!title || !classCode || !testType) {
      return res.status(400).json({ 
        message: "Thiếu thông tin bắt buộc: title, classCode, testType" 
      });
    }

    // Process parts to add blanks array for cloze-test questions
    const processedParts = processTestParts(parts);

    const newTest = await CambridgeReading.create({
      title,
      classCode,
      teacherName: teacherName || '',
      testType,
      parts: processedParts, // JSON type - Sequelize handles serialization
      totalQuestions: totalQuestions || 0,
      status: 'draft',
    });

    console.log(`✅ Tạo đề Cambridge Reading thành công: ${newTest.id}`);

    res.status(201).json({
      message: "Tạo đề thành công!",
      test: newTest,
    });
  } catch (err) {
    console.error("❌ Lỗi khi tạo Cambridge Reading:", err);
    logError("Lỗi khi tạo Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi tạo đề thi." });
  }
});

// PUT update reading test
router.put("/reading-tests/:id", requireAuth, requireTestPermission('cambridge'), async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    const {
      title,
      classCode,
      teacherName,
      testType,
      parts,
      totalQuestions,
      status,
    } = req.body;

    // Process parts to add blanks array for cloze-test questions
    const processedParts = parts ? processTestParts(parts) : test.parts;

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
      parts: processedParts, // JSON type - Sequelize handles serialization
      totalQuestions: totalQuestions ?? test.totalQuestions,
      status: status || test.status,
    });

    res.json({
      message: "Cập nhật đề thành công!",
      test,
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật Cambridge Reading:", err);
    logError("Lỗi khi cập nhật Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật đề thi." });
  }
});

// DELETE reading test
router.delete("/reading-tests/:id", async (req, res) => {
  try {
    const test = await CambridgeReading.findByPk(req.params.id);

    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi." });
    }

    await test.destroy();

    res.json({ message: "Xóa đề thành công!" });
  } catch (err) {
    console.error("❌ Lỗi khi xóa Cambridge Reading:", err);
    logError("Lỗi khi xóa Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi xóa đề thi." });
  }
});

// ===== SUBMISSIONS =====

/**
 * Hàm chấm điểm Cambridge test
 * Xử lý tất cả loại question: simple, long-text-mc (nested), cloze-mc (blanks), cloze-test (blanks)
 * @param {Object} test - Test data with parts
 * @param {Object} answers - Student answers { "partIdx-secIdx-blankIdx": "answer" }
 * @returns {Object} { score, total, percentage, detailedResults }
 */
const scoreTest = (test, answers) => {
  let score = 0;
  let total = 0;
  const detailedResults = {};

  let parts = test?.parts;
  if (typeof parts === 'string') {
    try {
      parts = JSON.parse(parts);
    } catch (e) {
      parts = [];
    }
  }
  parts = processTestParts(parts);

  // Helper to read answer with backward-compatible keys
  const pickAnswer = (primaryKey, legacyKeys = []) => {
    if (answers && Object.prototype.hasOwnProperty.call(answers, primaryKey)) {
      return answers[primaryKey];
    }
    for (const key of legacyKeys) {
      if (answers && Object.prototype.hasOwnProperty.call(answers, key)) {
        return answers[key];
      }
    }
    return undefined;
  };

  parts?.forEach((part, partIdx) => {
    part.sections?.forEach((section, secIdx) => {
      const q0 = section?.questions?.[0] || {};
      const sectionType =
        section?.questionType ||
        q0?.questionType ||
        q0?.type ||
        (Array.isArray(q0?.people) ? 'people-matching' : '') ||
        (Array.isArray(q0?.leftItems) ? 'gap-match' : '') ||
        (Array.isArray(q0?.sentences) ? 'word-form' : '') ||
        '';
      section.questions?.forEach((question, qIdx) => {

        // KET Part 2: people-matching (score each person)
        if (sectionType === 'people-matching' && Array.isArray(question?.people)) {
          const people = question.people;
          const correctMap = question.answers && typeof question.answers === 'object' ? question.answers : {};

          people.forEach((person, personIdx) => {
            const personId = person?.id || String.fromCharCode(65 + personIdx);
            const key = `${partIdx}-${secIdx}-${qIdx}-${personId}`;
            const legacyKey = `${partIdx}-${secIdx}-${personId}`;
            const legacyIndexKey = `${partIdx}-${secIdx}-${personIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey, legacyIndexKey]);
            const correctAnswer = correctMap?.[personId];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'matching',
                questionText: ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'matching',
              questionText: ''
            };
          });
          return;
        }

        // KET Listening Part 5: gap-match (score each gap)
        if (sectionType === 'gap-match' && Array.isArray(question?.leftItems)) {
          const leftItems = question.leftItems;
          const correctList = Array.isArray(question.correctAnswers) ? question.correctAnswers : [];

          leftItems.forEach((_, itemIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${itemIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${itemIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = correctList[itemIdx];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'gap-match',
                questionText: ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'gap-match',
              questionText: ''
            };
          });
          return;
        }

        // KET Part 6: word-form (score each sentence)
        if (sectionType === 'word-form' && Array.isArray(question?.sentences)) {
          question.sentences.forEach((s, sentIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${sentIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${sentIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = s?.correctAnswer;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'fill',
                questionText: s?.sentence || s?.text || ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'fill',
              questionText: s?.sentence || s?.text || ''
            };
          });
          return;
        }

        // matching-pictures: answers stored as {partIdx}-{secIdx}-{prompt.number}
        if (sectionType === 'matching-pictures' && Array.isArray(question.prompts)) {
          question.prompts.forEach((prompt) => {
            const promptId = String(prompt.id || prompt.number || 0);
            const key = `${partIdx}-${secIdx}-${promptId}`;
            const userAnswer = answers?.[key];
            const correctAnswer = prompt.correctAnswer ?? prompt.answer;
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'matching-pictures', questionText: prompt.text || '' };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'matching-pictures', questionText: prompt.text || '' };
          });
          return;
        }

        // MOVERS Listening Part 1: draw-lines (score each name by nameIdx)
        if (
          (sectionType === 'draw-lines' || question.questionType === 'draw-lines') &&
          Array.isArray(question.leftItems) &&
          question.anchors && typeof question.anchors === 'object'
        ) {
          const leftItems = question.leftItems || [];
          const correctMap = question.answers && typeof question.answers === 'object' ? question.answers : {};

          // Skip index 0 (example)
          leftItems.forEach((_name, nameIdx) => {
            if (nameIdx === 0) return; // example — not scored
            const key = `${partIdx}-${secIdx}-${qIdx}-${nameIdx}`;
            const userAnswer = answers?.[key];
            const correctAnswer = correctMap[String(nameIdx)];

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'draw-lines',
                questionText: leftItems[nameIdx] || ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'matching');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'draw-lines',
              questionText: leftItems[nameIdx] || ''
            };
          });
          return;
        }
        if (sectionType === 'image-cloze') {
          const passageText = question.passageText || '';
          const answersMap = question.answers && typeof question.answers === 'object' ? question.answers : {};
          const imageBank = Array.isArray(question.imageBank) ? question.imageBank : [];
          const resolveWord = function(id) {
            if (!id) return id;
            var entry = imageBank.find(function(b) { return b.id === id; });
            return entry ? entry.word || id : id;
          };
          // Extract blank numbers from passage (e.g. (12), (13)...)
          var blankNums = [];
          var blankRe = /\(\s*(\d+)\s*\)/g;
          var blankMatch;
          while ((blankMatch = blankRe.exec(passageText)) !== null) {
            blankNums.push(parseInt(blankMatch[1], 10));
          }
          blankNums.forEach(function(blankNum) {
            const key = `${partIdx}-${secIdx}-blank-${blankNum}`;
            const userAnswer = answers?.[key];
            const correctId = answersMap[String(blankNum)];
            if (!correctId) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'image-cloze', questionText: '' };
              return;
            }
            total++;
            const isCorrect = userAnswer === correctId;
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer: resolveWord(correctId), questionType: 'image-cloze', questionText: '' };
          });
          // Title question
          if (question.titleQuestion && question.titleQuestion.enabled) {
            const key = `${partIdx}-${secIdx}-title`;
            const userAnswer = answers?.[key];
            const correctAnswer = question.titleQuestion.correctAnswer;
            if (correctAnswer) {
              total++;
              const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
              if (isCorrect) score++;
              detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'abc', questionText: question.titleQuestion.text || '' };
            }
          }
          return;
        }

        // KET Writing: short-message (not auto-scored)
        if (sectionType === 'short-message') {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers?.[key];
          detailedResults[key] = {
            isCorrect: null,
            userAnswer: userAnswer || null,
            correctAnswer: null,
            questionType: 'short-message',
            questionText: question?.situation || question?.questionText || ''
          };
          return;
        }
        
        // Handle long-text-mc with nested questions
        if (sectionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
          question.questions.forEach((nestedQ, nestedIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${nestedIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${nestedIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = nestedQ.correctAnswer
              ?? nestedQ.answers
              ?? nestedQ.answer
              ?? nestedQ.correct;
            
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: nestedQ.questionType || 'abc',
                questionText: nestedQ.questionText || ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, nestedQ.questionType);
            if (isCorrect) score++;
            
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: nestedQ.questionType || 'abc',
              questionText: nestedQ.questionText || ''
            };
          });
        }
        // Handle cloze-mc with blanks
        else if (sectionType === 'cloze-mc' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            const correctAnswer = blank.correctAnswer
              ?? blank.answers
              ?? blank.answer
              ?? blank.correct
              ?? question.correctAnswer
              ?? question.answers
              ?? question.answer
              ?? question.correct;
            
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'abc',
                questionText: blank.questionText || ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'abc',
              questionText: blank.questionText || ''
            };
          });
        }
        // Handle cloze-test with blanks
        else if (sectionType === 'cloze-test' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            
            // Resolve correctAnswer: try blank-level first, then question.answers[questionNum], then question-level
            let correctAnswer = blank.correctAnswer
              ?? blank.answers
              ?? blank.answer
              ?? blank.correct;
            
            // If not found at blank level, try to get from question.answers object (keyed by questionNum)
            if (!correctAnswer && question.answers && typeof question.answers === 'object' && !Array.isArray(question.answers)) {
              correctAnswer = question.answers[blank.questionNum || blank.number];
            }
            
            // Fallback to question-level correctAnswer
            if (!correctAnswer) {
              correctAnswer = question.correctAnswer
                ?? question.answers
                ?? question.answer
                ?? question.correct;
            }
            
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'fill',
                questionText: blank.questionText || ''
              };
              return;
            }

            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            
            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'fill',
              questionText: blank.questionText || ''
            };
          });
        }
        // Handle inline-choice with blanks
        else if (sectionType === 'inline-choice' && question.blanks && Array.isArray(question.blanks)) {
          const stripChoiceLabel = (val) => {
            if (val === undefined || val === null) return '';
            const s = String(val).trim();
            const m = s.match(/^[A-H](?:\.\s*|\s+)(.+)$/i);
            return m ? m[1].trim() : s;
          };

          question.blanks.forEach((blank, blankIdx) => {
            const key = `${partIdx}-${secIdx}-${qIdx}-${blankIdx}`;
            const legacyKey = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = pickAnswer(key, [legacyKey]);
            let correctAnswer = blank.correctAnswer
              ?? blank.answers
              ?? blank.answer
              ?? blank.correct
              ?? question.correctAnswer
              ?? question.answers
              ?? question.answer
              ?? question.correct;

            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = {
                isCorrect: null,
                userAnswer: userAnswer || null,
                correctAnswer: null,
                questionType: 'inline-choice',
                questionText: blank.questionText || ''
              };
              return;
            }

            correctAnswer = stripChoiceLabel(correctAnswer);
            const normalizedUser = stripChoiceLabel(userAnswer);

            total++;
            const isCorrect = scoreQuestion(normalizedUser, correctAnswer, 'fill');
            if (isCorrect) score++;

            detailedResults[key] = {
              isCorrect,
              userAnswer: userAnswer || null,
              correctAnswer,
              questionType: 'inline-choice',
              questionText: blank.questionText || ''
            };
          });
        }
        // word-drag-cloze: answers stored as {partIdx}-{secIdx}-blank-{blank.number}
        else if (sectionType === 'word-drag-cloze' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank) => {
            const key = `${partIdx}-${secIdx}-blank-${blank.number}`;
            const userAnswer = answers?.[key];
            const correctAnswer = blank.correctAnswer ?? blank.answer ?? blank.correct;
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: '' };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: '' };
          });
        }
        // story-completion: key = {partIdx}-{secIdx}-item-{n}
        else if (sectionType === 'story-completion' && question.items && Array.isArray(question.items)) {
          question.items.forEach((item, itemIdx) => {
            const key = `${partIdx}-${secIdx}-item-${itemIdx + 1}`;
            const userAnswer = answers?.[key];
            const correctAnswer = item.answer ?? item.correctAnswer;
            if (correctAnswer === undefined || correctAnswer === null) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: item.sentence || '' };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: item.sentence || '' };
          });
        }
        // look-read-write: key = {partIdx}-{secIdx}-g{groupIdx}-item{itemIdx}
        else if (sectionType === 'look-read-write' && question.groups && Array.isArray(question.groups)) {
          question.groups.forEach((group, groupIdx) => {
            (group.items || []).forEach((item, itemIdx) => {
              const key = `${partIdx}-${secIdx}-g${groupIdx}-item${itemIdx}`;
              const userAnswer = answers?.[key];
              const correctAnswer = (item.answer ?? item.correctAnswer ?? '').trim();
              total++;
              // free-write (no answer key): any non-empty response = correct
              if (!correctAnswer) {
                const isCorrect = !!(userAnswer && userAnswer.trim());
                if (isCorrect) score++;
                detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'fill', questionText: item.sentence || '' };
                return;
              }
              const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
              if (isCorrect) score++;
              detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'fill', questionText: item.sentence || '' };
            });
          });
        }
        // letter-matching (Movers Listening Part 3): one sub-key per person (skip index 0 = example)
        else if ((sectionType === 'letter-matching' || question.questionType === 'letter-matching') &&
            Array.isArray(question.people) && question.people.length > 1) {
          question.people.forEach((person, pi) => {
            if (pi === 0) return; // skip example
            const name = String(person?.name || '').trim();
            if (!name) return;
            const key = `${partIdx}-${secIdx}-${qIdx}-${pi}`;
            const userAnswer = answers?.[key];
            const correctAnswer = person?.correctAnswer ?? question.answers?.[String(pi)] ?? null;
            if (!correctAnswer) {
              detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'letter-matching', questionText: name };
              return;
            }
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'letter-matching', questionText: name };
          });
        }
        // image-tick (Movers Listening Part 4): single key, A/B/C answer
        else if (sectionType === 'image-tick' || question.questionType === 'image-tick') {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers?.[key];
          const correctAnswer = question.correctAnswer ?? question.answers ?? question.answer ?? question.correct ?? null;
          if (!correctAnswer) {
            detailedResults[key] = { isCorrect: null, userAnswer: userAnswer || null, correctAnswer: null, questionType: 'image-tick', questionText: question.questionText || '' };
          } else {
            total++;
            const isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
            if (isCorrect) score++;
            detailedResults[key] = { isCorrect, userAnswer: userAnswer || null, correctAnswer, questionType: 'image-tick', questionText: question.questionText || '' };
          }
        }
        // Regular question (not nested)
        else {
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];
          const correctAnswer = question.correctAnswer
            ?? question.answers
            ?? question.answer
            ?? question.correct;
          
          if (correctAnswer === undefined || correctAnswer === null) {
            detailedResults[key] = {
              isCorrect: null,
              userAnswer: userAnswer || null,
              correctAnswer: null,
              questionType: question.questionType || 'fill',
              questionText: question.questionText || ''
            };
            return;
          }

          // sign-message uses A/B/C, but many records don't set question.questionType
          const effectiveType = sectionType === 'sign-message'
            ? 'abc'
            : (question.questionType || 'fill');

          total++;
          const isCorrect = scoreQuestion(userAnswer, correctAnswer, effectiveType);
          if (isCorrect) score++;
          
          detailedResults[key] = {
            isCorrect,
            userAnswer: userAnswer || null,
            correctAnswer,
            questionType: effectiveType,
            questionText: question.questionText || ''
          };
        }
      });
    });
  });

  return {
    score,
    total,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    detailedResults
  };
};

/**
 * Helper function to score a single question
 * @param {*} userAnswer - User's answer
 * @param {*} correctAnswer - Correct answer
 * @param {string} questionType - Type of question (fill, abc, abcd, matching, etc.)
 * @returns {boolean} Whether the answer is correct
 */
const scoreQuestion = (userAnswer, correctAnswer, questionType) => {
  if (!userAnswer) {
    return false;
  }

  const toArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && (val.includes('/') || val.includes('|'))) {
      return val.split(/[\/|]/).map((v) => v.trim()).filter(Boolean);
    }
    return [val];
  };

  const normalize = (val) => String(val).trim().toLowerCase();
  const normalizeMc = (val) => String(val).trim().toUpperCase();

  const acceptedAnswers = toArray(correctAnswer);

  // Fill-in-the-blank style: case-insensitive, expand (optional) notation
  // Handles Cambridge marking scheme: "(She is giving him) a glass of water(.)" means
  // optional parts in parens are accepted both with and without.
  if (questionType === 'fill' || questionType === 'cloze-test') {
    const userNorm = normalize(userAnswer);
    const stripTrailingDot = (s) => s.replace(/\.+$/, '').trim();
    const allVariants = new Set();
    acceptedAnswers.forEach((raw) => {
      const base = normalize(raw);
      // without optional parts: remove " (text)" segments
      const without = base.replace(/\s*\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
      // with optional parts expanded: replace (text) → text
      const withOpt = base.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/g, ' ').trim();
      [base, without, withOpt].forEach((v) => {
        if (!v) return;
        allVariants.add(v);
        allVariants.add(stripTrailingDot(v));
      });
    });
    return allVariants.has(userNorm) || allVariants.has(stripTrailingDot(userNorm));
  }

  // Multiple choice: normalize to uppercase letters
  if (questionType === 'abc' || questionType === 'abcd' || questionType === 'matching' || questionType === 'multiple-choice-pictures') {
    const userNorm = normalizeMc(userAnswer);
    return acceptedAnswers.some((ans) => normalizeMc(ans) === userNorm);
  }

  // Default: case-insensitive string comparison
  const userNorm = normalize(userAnswer);
  return acceptedAnswers.some((ans) => normalize(ans) === userNorm);
};

// POST autosave Cambridge progress for reading/listening
router.post("/submissions/autosave", async (req, res) => {
  try {
    const {
      testId,
      testType,
      submissionId,
      answers,
      expiresAt,
      user,
      progressMeta,
      studentName,
      studentPhone,
      studentEmail,
      classCode,
    } = req.body || {};

    const numericTestId = Number(testId);
    const normalizedTestType = String(testType || "").trim();
    if (!numericTestId || !normalizedTestType) {
      return res.status(400).json({ message: "Missing testId or testType." });
    }

    const resolvedUserId = Number(user?.id) || null;
    const test = await getCambridgeTestRecord(numericTestId, normalizedTestType);
    const parsedExpiresAt = Number.isFinite(Number(expiresAt))
      ? new Date(Number(expiresAt))
      : null;
    const normalizedAnswers =
      answers && typeof answers === "object" && !Array.isArray(answers)
        ? answers
        : {};
    const normalizedProgressMeta =
      normalizeCambridgeProgressMeta(progressMeta);
    const now = new Date();

    let submission = await findActiveCambridgeDraft({
      submissionId: Number(submissionId) || null,
      testId: numericTestId,
      testType: normalizedTestType,
      userId: resolvedUserId,
    });

    if (submission) {
      await submission.update({
        answers: normalizedAnswers,
        expiresAt: resolveAuthoritativeExpiry(submission.expiresAt, parsedExpiresAt),
        lastSavedAt: now,
        progressMeta: normalizedProgressMeta,
        studentName:
          studentName ||
          user?.name ||
          user?.username ||
          submission.studentName ||
          "Unknown",
        studentPhone:
          studentPhone || user?.phone || submission.studentPhone || null,
        studentEmail:
          studentEmail || user?.email || submission.studentEmail || null,
        classCode:
          classCode || test?.classCode || submission.classCode || null,
        teacherName: test?.teacherName || submission.teacherName || null,
        testTitle: test?.title || submission.testTitle || null,
      });
    } else {
      submission = await CambridgeSubmission.create({
        testId: numericTestId,
        testType: normalizedTestType,
        testTitle: test?.title || null,
        studentName:
          studentName || user?.name || user?.username || "Unknown",
        studentPhone: studentPhone || user?.phone || null,
        studentEmail: studentEmail || user?.email || null,
        classCode: classCode || test?.classCode || null,
        userId: resolvedUserId,
        answers: normalizedAnswers,
        score: 0,
        totalQuestions: 0,
        percentage: 0,
        detailedResults: null,
        timeSpent: null,
        timeRemaining: null,
        teacherName: test?.teacherName || null,
        feedback: null,
        feedbackBy: null,
        feedbackAt: null,
        feedbackSeen: false,
        status: "submitted",
        finished: false,
        expiresAt: parsedExpiresAt,
        lastSavedAt: now,
        progressMeta: normalizedProgressMeta,
        submittedAt: null,
      });
    }

    return res.json({
      message: "Draft saved.",
      submissionId: submission.id,
      savedAt: submission.lastSavedAt,
      expiresAt: submission.expiresAt,
      timing: buildTimingPayload(submission.expiresAt),
    });
  } catch (err) {
    console.error("❌ Error autosaving Cambridge submission:", err);
    return res.status(500).json({
      message: "Failed to autosave Cambridge submission.",
      error: err.message,
    });
  }
});

// GET latest active Cambridge draft by submissionId or userId
router.get("/submissions/active", async (req, res) => {
  try {
    const {
      testId,
      testType,
      submissionId,
      userId,
    } = req.query;

    const numericTestId = Number(testId);
    const normalizedTestType = String(testType || "").trim();

    if (!numericTestId || !normalizedTestType) {
      return res.status(400).json({ message: "Missing testId or testType." });
    }

    const submission = await findActiveCambridgeDraft({
      submissionId: Number(submissionId) || null,
      testId: numericTestId,
      testType: normalizedTestType,
      userId: Number(userId) || null,
    });

    return res.json({
      submission: submission ? submission.toJSON() : null,
      timing: submission ? buildTimingPayload(submission.expiresAt) : buildTimingPayload(null),
    });
  } catch (err) {
    console.error("❌ Error fetching active Cambridge draft:", err);
    return res.status(500).json({
      message: "Failed to fetch Cambridge draft.",
      error: err.message,
    });
  }
});

router.post(
  "/submissions/:submissionId/extend-time",
  requireAuth,
  requireTestPermission("cambridge"),
  async (req, res) => {
    try {
      const { submissionId } = req.params;
      const submission = await CambridgeSubmission.findByPk(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Không tìm thấy attempt" });
      }
      if (submission.finished) {
        return res.status(400).json({ message: "Attempt đã hoàn thành" });
      }

      const extensionMinutes = normalizeExtensionMinutes(
        req.body?.extraMinutes,
        DEFAULT_EXTENSION_MINUTES
      );
      const { expiresAtMs } = extendDeadline(submission.expiresAt, extensionMinutes);
      submission.expiresAt = new Date(expiresAtMs);
      submission.lastSavedAt = new Date();
      await submission.save();

      return res.json({
        message: `Đã gia hạn ${extensionMinutes} phút.`,
        submissionId: submission.id,
        extensionMinutes,
        expiresAt: submission.expiresAt,
        timing: buildTimingPayload(submission.expiresAt),
      });
    } catch (err) {
      console.error("❌ Error extending Cambridge submission:", err);
      return res.status(500).json({
        message: "Lỗi server khi gia hạn thời gian.",
        error: err.message,
      });
    }
  }
);

// POST submit listening test
router.post("/listening-tests/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      answers, 
      studentName, 
      studentPhone, 
      studentEmail,
      classCode,
      userId,
      submissionId,
      timeRemaining,
      timeSpent 
    } = req.body;

    // Validate
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: "Thiếu câu trả lời" });
    }

    // Get test
    const test = await CambridgeListening.findByPk(id);
    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    // Score the test
    const { score, total, percentage, detailedResults } = scoreTest(test, answers);

    // Get user info
    let finalStudentName = studentName;
    let finalClassCode = classCode || test.classCode;

    // If userId provided, try to get user info
    if (userId) {
      const { User } = require("../models");
      const user = await User.findByPk(userId);
      if (user) {
        finalStudentName = finalStudentName || user.name || user.username;
      }
    }

    let submission = await findActiveCambridgeDraft({
      submissionId: Number(submissionId) || null,
      testId: parseInt(id, 10),
      testType: test.testType,
      userId: userId || null,
    });

    const finalizedPayload = {
      testId: parseInt(id, 10),
      testType: test.testType,
      testTitle: test.title,
      studentName: finalStudentName || 'Unknown',
      studentPhone: studentPhone || null,
      studentEmail: studentEmail || null,
      classCode: finalClassCode,
      userId: userId || null,
      answers,
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
      timeSpent: timeSpent || null,
      timeRemaining: timeRemaining || null,
      teacherName: test.teacherName || null,
      status: 'submitted',
      finished: true,
      expiresAt: null,
      lastSavedAt: null,
      progressMeta: null,
      submittedAt: new Date(),
    };

    if (submission) {
      await submission.update(finalizedPayload);
    } else {
      submission = await CambridgeSubmission.create(finalizedPayload);
    }

    console.log(`✅ Nộp bài Cambridge Listening thành công: submission #${submission.id}, score: ${score}/${total}`);

    res.status(201).json({
      message: "Nộp bài thành công!",
      submissionId: submission.id,
      score,
      total,
      percentage,
      detailedResults,
      answers: detailedResults // For backward compatibility with frontend
    });

  } catch (err) {
    console.error("❌ Lỗi khi nộp bài Cambridge Listening:", err);
    logError("Lỗi khi nộp bài Cambridge Listening", err);
    res.status(500).json({ message: "Lỗi server khi nộp bài." });
  }
});

// POST submit reading test
router.post("/reading-tests/:id/submit", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      answers, 
      studentName, 
      studentPhone, 
      studentEmail,
      classCode,
      userId,
      submissionId,
      timeRemaining,
      timeSpent 
    } = req.body;

    // Validate
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: "Thiếu câu trả lời" });
    }

    // Get test
    const test = await CambridgeReading.findByPk(id);
    if (!test) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    // Score the test
    const { score, total, percentage, detailedResults } = scoreTest(test, answers);

    // Get user info
    let finalStudentName = studentName;
    let finalClassCode = classCode || test.classCode;

    // If userId provided, try to get user info
    if (userId) {
      const { User } = require("../models");
      const user = await User.findByPk(userId);
      if (user) {
        finalStudentName = finalStudentName || user.name || user.username;
      }
    }

    let submission = await findActiveCambridgeDraft({
      submissionId: Number(submissionId) || null,
      testId: parseInt(id, 10),
      testType: test.testType,
      userId: userId || null,
    });

    const finalizedPayload = {
      testId: parseInt(id, 10),
      testType: test.testType,
      testTitle: test.title,
      studentName: finalStudentName || 'Unknown',
      studentPhone: studentPhone || null,
      studentEmail: studentEmail || null,
      classCode: finalClassCode,
      userId: userId || null,
      answers,
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
      timeSpent: timeSpent || null,
      timeRemaining: timeRemaining || null,
      teacherName: test.teacherName || null,
      status: 'submitted',
      finished: true,
      expiresAt: null,
      lastSavedAt: null,
      progressMeta: null,
      submittedAt: new Date(),
    };

    if (submission) {
      await submission.update(finalizedPayload);
    } else {
      submission = await CambridgeSubmission.create(finalizedPayload);
    }

    console.log(`✅ Nộp bài Cambridge Reading thành công: submission #${submission.id}, score: ${score}/${total}`);

    res.status(201).json({
      message: "Nộp bài thành công!",
      submissionId: submission.id,
      score,
      total,
      percentage,
      detailedResults,
      answers: detailedResults // For backward compatibility with frontend
    });

  } catch (err) {
    console.error("❌ Lỗi khi nộp bài Cambridge Reading:", err);
    logError("Lỗi khi nộp bài Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi nộp bài." });
  }
});

// GET submissions for a specific test (for teachers)
router.get("/listening-tests/:id/submissions", async (req, res) => {
  try {
    const { id } = req.params;
    
    const submissions = await CambridgeSubmission.findAll({
      where: { 
        testId: parseInt(id),
        testType: { [Op.like]: '%-listening' },
        ...FINALIZED_CAMBRIDGE_WHERE,
      },
      order: [["submittedAt", "DESC"]],
      attributes: [
        "id", "studentName", "studentPhone", "classCode",
        "score", "totalQuestions", "percentage",
        "timeSpent", "status", "submittedAt", "feedbackSeen"
      ]
    });

    res.json(submissions);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách submissions:", err);
    logError("Lỗi khi lấy danh sách submissions", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách bài nộp." });
  }
});

// GET submissions for a specific reading test (for teachers)
router.get("/reading-tests/:id/submissions", async (req, res) => {
  try {
    const { id } = req.params;
    
    const submissions = await CambridgeSubmission.findAll({
      where: { 
        testId: parseInt(id),
        testType: { [Op.like]: '%-reading' },
        ...FINALIZED_CAMBRIDGE_WHERE,
      },
      order: [["submittedAt", "DESC"]],
      attributes: [
        "id", "studentName", "studentPhone", "classCode",
        "score", "totalQuestions", "percentage",
        "timeSpent", "status", "submittedAt", "feedbackSeen"
      ]
    });

    res.json(submissions);
  } catch (err) {
    console.error("❌ Lỗi khi lấy danh sách submissions:", err);
    logError("Lỗi khi lấy danh sách submissions", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách bài nộp." });
  }
});

// GET all submissions (for admin/teacher dashboard)
router.get("/submissions", async (req, res) => {
  try {
    const {
      testType,
      classCode,
      studentName,
      studentPhone,
      teacherName,
      feedbackBy,
      reviewStatus = "all",
      sortOrder = "newest",
      page = 1,
      limit = 50,
    } = req.query;
    const includeActive = ["1", "true", "yes"].includes(
      String(req.query.includeActive || "").toLowerCase()
    );
    const where = includeActive ? {} : { ...FINALIZED_CAMBRIDGE_WHERE };
    const andConditions = [];

    const pushContainsFilter = (fieldName, value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return;

      andConditions.push(
        sequelizeWhere(fn("LOWER", col(fieldName)), {
          [Op.like]: `%${normalized}%`,
        })
      );
    };

    if (testType) {
      const normalized = String(testType).trim().toLowerCase();

      // Support tab filters from frontend: reading | listening
      // Stored values are typically like: ket-reading, ket-listening, pet-reading...
      if (normalized === "reading") where.testType = { [Op.like]: "%-reading" };
      else if (normalized === "listening")
        where.testType = { [Op.like]: "%-listening" };
      else where.testType = testType;
    }
    pushContainsFilter("classCode", classCode);
    pushContainsFilter("studentName", studentName);
    pushContainsFilter("studentPhone", studentPhone);
    pushContainsFilter("teacherName", teacherName);
    pushContainsFilter("feedbackBy", feedbackBy);

    if (reviewStatus === "reviewed") {
      andConditions.push({
        [Op.or]: [
          { status: "reviewed" },
          { feedbackBy: { [Op.not]: null, [Op.ne]: "" } },
          { feedback: { [Op.not]: null, [Op.ne]: "" } },
        ],
      });
    } else if (reviewStatus === "pending") {
      andConditions.push({
        [Op.and]: [
          {
            [Op.or]: [{ status: { [Op.ne]: "reviewed" } }, { status: null }],
          },
          {
            [Op.or]: [{ feedbackBy: null }, { feedbackBy: "" }],
          },
          {
            [Op.or]: [{ feedback: null }, { feedback: "" }],
          },
        ],
      });
    }

    if (andConditions.length) {
      where[Op.and] = andConditions;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const direction = String(sortOrder).toLowerCase() === "oldest" ? "ASC" : "DESC";
    const submittedOrderExpr = fn("COALESCE", col("submittedAt"), col("createdAt"));

    const { count, rows: submissions } = await CambridgeSubmission.findAndCountAll({
      where,
      order: [[submittedOrderExpr, direction]],
      limit: parseInt(limit),
      offset,
      attributes: [
        "id", "testId", "testType", "testTitle",
        "studentName", "studentPhone", "classCode", "teacherName",
        "score", "totalQuestions", "percentage",
        "timeSpent", "status", "submittedAt", "feedbackSeen",
        "finished", "expiresAt", "lastSavedAt", "feedback", "feedbackBy", "feedbackAt", "createdAt",
        "detailedResults"
      ]
    });

    const normalizedSubmissions = submissions.map((submission) => {
      const json = submission.toJSON();
      const pendingManualCount = countPendingManualAnswers(json);
      delete json.detailedResults;

      return {
        ...json,
        pendingManualCount,
      };
    });

    res.json({
      submissions: normalizedSubmissions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy tất cả submissions:", err);
    logError("Lỗi khi lấy tất cả submissions", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách bài nộp." });
  }
});

// GET: List submissions for a student by phone (for MyFeedback)
router.get("/submissions/user/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ message: "Thiếu số điện thoại" });

    const submissions = await CambridgeSubmission.findAll({
      where: { studentPhone: phone, ...FINALIZED_CAMBRIDGE_WHERE },
      order: [["submittedAt", "DESC"]],
      attributes: [
        "id",
        "testId",
        "testType",
        "testTitle",
        "studentName",
        "studentPhone",
        "classCode",
        "score",
        "totalQuestions",
        "percentage",
        "teacherName",
        "feedback",
        "feedbackBy",
        "feedbackAt",
        "feedbackSeen",
        "status",
        "submittedAt",
      ],
    });

    res.json(submissions);
  } catch (err) {
    console.error("❌ Lỗi khi lấy Cambridge submissions theo user:", err);
    logError("Lỗi khi lấy Cambridge submissions theo user", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách bài nộp." });
  }
});

// GET: Count unseen feedback for a student by phone (for StudentNavbar bell)
router.get("/submissions/unseen-count/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) return res.json({ count: 0 });

    const count = await CambridgeSubmission.count({
      where: {
        studentPhone: phone,
        feedback: { [Op.ne]: null },
        feedbackSeen: false,
        ...FINALIZED_CAMBRIDGE_WHERE,
      },
    });

    res.json({ count });
  } catch (err) {
    console.error("❌ Lỗi khi đếm Cambridge feedback chưa xem:", err);
    res.status(500).json({ message: "Lỗi server." });
  }
});

// POST: Mark Cambridge feedback as seen (student action)
router.post("/submissions/mark-feedback-seen", async (req, res) => {
  try {
    const { phone, ids } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Thiếu số điện thoại" });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "❌ Thiếu danh sách IDs" });
    }

    const { Op } = require("sequelize");
    const [updatedCount] = await CambridgeSubmission.update(
      { feedbackSeen: true },
      { where: { studentPhone: phone, id: { [Op.in]: ids } } }
    );

    res.json({ message: "✅ Đã đánh dấu là đã xem", updatedCount });
  } catch (err) {
    console.error("❌ Lỗi khi đánh dấu Cambridge feedback đã xem:", err);
    res.status(500).json({ message: "❌ Server error khi đánh dấu đã xem" });
  }
});

// GET single submission detail (for review)
router.get("/submissions/:id", async (req, res) => {
  try {
    const submission = await CambridgeSubmission.findByPk(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Không tìm thấy bài nộp." });
    }

    res.json(submission);
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết submission:", err);
    logError("Lỗi khi lấy chi tiết submission", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết bài nộp." });
  }
});

// POST rescore a submission (recalculate score based on stored answers)
router.post("/submissions/:id/rescore", async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await CambridgeSubmission.findByPk(id);
    if (!submission) {
      return res.status(404).json({ message: "Không tìm thấy bài nộp." });
    }

    const parseJsonIfString = (val) => {
      if (typeof val !== "string") return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return val;
      }
    };

    const answers = parseJsonIfString(submission.answers);
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({
        message: "Submission không có answers hợp lệ để chấm lại.",
      });
    }

    // Determine which test model to use
    const tt = String(submission.testType || "").toLowerCase();
    const isListening = tt.includes("listening");
    const isReading = tt.includes("reading");

    let test = null;

    if (isListening) {
      test = await CambridgeListening.findByPk(submission.testId);
    } else if (isReading) {
      test = await CambridgeReading.findByPk(submission.testId);
    } else {
      // Fallback: try both if testType doesn't indicate
      test = await CambridgeReading.findByPk(submission.testId);
      if (!test) test = await CambridgeListening.findByPk(submission.testId);
    }

    if (!test) {
      return res.status(404).json({
        message: "Không tìm thấy đề thi tương ứng với submission này.",
      });
    }

    const testJson = test.toJSON();
    const rawParts = parseJsonIfString(testJson.parts);
    const processedParts = Array.isArray(rawParts) ? processTestParts(rawParts) : rawParts;

    const scoringTest = {
      ...testJson,
      parts: processedParts,
    };

    const before = {
      score: submission.score,
      totalQuestions: submission.totalQuestions,
      percentage: submission.percentage,
    };

    const { score, total, percentage, detailedResults } = scoreTest(scoringTest, answers);

    await submission.update({
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
    });

    res.json({
      message: "Rescore thành công!",
      submissionId: submission.id,
      before,
      after: { score, totalQuestions: total, percentage },
    });
  } catch (err) {
    console.error("❌ Lỗi khi rescore submission:", err);
    logError("Lỗi khi rescore submission", err);
    res.status(500).json({ message: "Lỗi server khi chấm lại bài nộp." });
  }
});

// PUT update submission (add feedback)
router.put("/submissions/:id", async (req, res) => {
  try {
    const submission = await CambridgeSubmission.findByPk(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Không tìm thấy bài nộp." });
    }

    const { feedback, feedbackBy, status } = req.body;

    await submission.update({
      feedback: feedback || submission.feedback,
      feedbackBy: feedbackBy || submission.feedbackBy,
      feedbackAt: feedback ? new Date() : submission.feedbackAt,
      status: status || (feedback ? 'reviewed' : submission.status)
    });

    res.json({
      message: "Cập nhật bài nộp thành công!",
      submission
    });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật submission:", err);
    logError("Lỗi khi cập nhật submission", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật bài nộp." });
  }
});

// PUT mark feedback as seen
router.put("/submissions/:id/seen", async (req, res) => {
  try {
    const submission = await CambridgeSubmission.findByPk(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Không tìm thấy bài nộp." });
    }

    await submission.update({ feedbackSeen: true });

    res.json({ message: "Đã đánh dấu đã xem feedback" });
  } catch (err) {
    console.error("❌ Lỗi khi cập nhật feedbackSeen:", err);
    res.status(500).json({ message: "Lỗi server." });
  }
});

router.scoreTest = scoreTest;

module.exports = router;
