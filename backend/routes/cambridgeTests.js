const express = require("express");
const router = express.Router();
const { CambridgeListening, CambridgeReading, CambridgeSubmission } = require("../models");
const { logError } = require("../logger");
const { processTestParts } = require("../utils/clozParser");

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

        // Fallback for single question items
        total += 1;
      });
    });
  });

  return total;
};

// Backward-compatible alias used below
const countTotalQuestions = countTotalQuestionsFromParts;

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
    const where = testType ? { testType } : {};

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
    
    const where = testType ? { testType } : {};
    
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
router.post("/listening-tests", async (req, res) => {
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

    const newTest = await CambridgeListening.create({
      title,
      classCode,
      teacherName: teacherName || '',
      testType,
      mainAudioUrl: mainAudioUrl || null,
      parts: JSON.stringify(parts),
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
router.put("/listening-tests/:id", async (req, res) => {
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

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
      mainAudioUrl: mainAudioUrl ?? test.mainAudioUrl,
      parts: parts || test.parts, // JSON type - Sequelize handles serialization
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
    
    const where = testType ? { testType } : {};
    
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
      parts: processedParts,
      totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
    });
  } catch (err) {
    console.error("❌ Lỗi khi lấy chi tiết Cambridge Reading:", err);
    logError("Lỗi khi lấy chi tiết Cambridge Reading", err);
    res.status(500).json({ message: "Lỗi server khi lấy chi tiết đề thi." });
  }
});

// POST create reading test
router.post("/reading-tests", async (req, res) => {
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
router.put("/reading-tests/:id", async (req, res) => {
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
            const userAnswer = pickAnswer(key, [legacyKey]);
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

  // Fill-in-the-blank style: case-insensitive, allow multiple answers
  if (questionType === 'fill' || questionType === 'cloze-test') {
    const userNorm = normalize(userAnswer);
    return acceptedAnswers.some((ans) => normalize(ans) === userNorm);
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

    // Create submission
    const submission = await CambridgeSubmission.create({
      testId: parseInt(id),
      testType: test.testType,
      testTitle: test.title,
      studentName: finalStudentName || 'Unknown',
      studentPhone: studentPhone || null,
      studentEmail: studentEmail || null,
      classCode: finalClassCode,
      userId: userId || null,
      answers: answers,
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
      timeSpent: timeSpent || null,
      timeRemaining: timeRemaining || null,
      teacherName: test.teacherName || null,
      status: 'submitted',
      submittedAt: new Date()
    });

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

    // Create submission
    const submission = await CambridgeSubmission.create({
      testId: parseInt(id),
      testType: test.testType,
      testTitle: test.title,
      studentName: finalStudentName || 'Unknown',
      studentPhone: studentPhone || null,
      studentEmail: studentEmail || null,
      classCode: finalClassCode,
      userId: userId || null,
      answers: answers,
      score,
      totalQuestions: total,
      percentage,
      detailedResults,
      timeSpent: timeSpent || null,
      timeRemaining: timeRemaining || null,
      teacherName: test.teacherName || null,
      status: 'submitted',
      submittedAt: new Date()
    });

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
        testType: { [require('sequelize').Op.like]: '%-listening' }
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
        testType: { [require('sequelize').Op.like]: '%-reading' }
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
    const { testType, classCode, page = 1, limit = 50 } = req.query;
    const { Op } = require("sequelize");
    
    const where = {};
    if (testType) {
      const normalized = String(testType).trim().toLowerCase();

      // Support tab filters from frontend: reading | listening
      // Stored values are typically like: ket-reading, ket-listening, pet-reading...
      if (normalized === "reading") where.testType = { [Op.like]: "%-reading" };
      else if (normalized === "listening")
        where.testType = { [Op.like]: "%-listening" };
      else where.testType = testType;
    }
    if (classCode) where.classCode = classCode;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: submissions } = await CambridgeSubmission.findAndCountAll({
      where,
      order: [["submittedAt", "DESC"]],
      limit: parseInt(limit),
      offset,
      attributes: [
        "id", "testId", "testType", "testTitle",
        "studentName", "studentPhone", "classCode",
        "score", "totalQuestions", "percentage",
        "timeSpent", "status", "submittedAt", "feedbackSeen"
      ]
    });

    res.json({
      submissions,
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
      where: { studentPhone: phone },
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

    const { Op } = require("sequelize");
    const count = await CambridgeSubmission.count({
      where: {
        studentPhone: phone,
        feedback: { [Op.ne]: null },
        feedbackSeen: false,
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

module.exports = router;
