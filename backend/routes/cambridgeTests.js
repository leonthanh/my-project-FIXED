const express = require("express");
const router = express.Router();
const { CambridgeListening, CambridgeReading, CambridgeSubmission } = require("../models");
const { logError } = require("../logger");
const { processTestParts } = require("../utils/clozParser");

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
      parts,
      totalQuestions,
      status,
    } = req.body;

    await test.update({
      title: title || test.title,
      classCode: classCode || test.classCode,
      teacherName: teacherName || test.teacherName,
      testType: testType || test.testType,
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

    res.json(test);
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

  const parts = typeof test.parts === 'string' ? JSON.parse(test.parts) : test.parts;

  parts?.forEach((part, partIdx) => {
    part.sections?.forEach((section, secIdx) => {
      section.questions?.forEach((question, qIdx) => {
        
        // Handle long-text-mc with nested questions
        if (section.questionType === 'long-text-mc' && question.questions && Array.isArray(question.questions)) {
          question.questions.forEach((nestedQ, nestedIdx) => {
            total++;
            const key = `${partIdx}-${secIdx}-${nestedIdx}`;
            const userAnswer = answers[key];
            const correctAnswer = nestedQ.correctAnswer;
            
            let isCorrect = scoreQuestion(userAnswer, correctAnswer, nestedQ.questionType);
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
        else if (section.questionType === 'cloze-mc' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            total++;
            const key = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = answers[key];
            const correctAnswer = blank.correctAnswer || question.correctAnswer;
            
            let isCorrect = scoreQuestion(userAnswer, correctAnswer, 'abc');
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
        else if (section.questionType === 'cloze-test' && question.blanks && Array.isArray(question.blanks)) {
          question.blanks.forEach((blank, blankIdx) => {
            total++;
            const key = `${partIdx}-${secIdx}-${blankIdx}`;
            const userAnswer = answers[key];
            const correctAnswer = blank.correctAnswer || question.correctAnswer;
            
            let isCorrect = scoreQuestion(userAnswer, correctAnswer, 'fill');
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
          total++;
          const key = `${partIdx}-${secIdx}-${qIdx}`;
          const userAnswer = answers[key];
          const correctAnswer = question.correctAnswer;
          
          let isCorrect = scoreQuestion(userAnswer, correctAnswer, question.questionType);
          if (isCorrect) score++;
          
          detailedResults[key] = {
            isCorrect,
            userAnswer: userAnswer || null,
            correctAnswer,
            questionType: question.questionType || 'fill',
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
  if (correctAnswer === undefined || correctAnswer === null) {
    return false;
  }

  if (!userAnswer) {
    return false;
  }

  // Fill-in-the-blank: case insensitive
  if (questionType === 'fill' || questionType === 'cloze-test') {
    const userNorm = String(userAnswer).trim().toLowerCase();
    const correctNorm = String(correctAnswer).trim().toLowerCase();
    
    // Support multiple correct answers separated by /
    if (typeof correctAnswer === 'string' && correctAnswer.includes('/')) {
      const acceptedAnswers = correctNorm.split('/').map(a => a.trim());
      return acceptedAnswers.includes(userNorm);
    }
    
    return userNorm === correctNorm;
  }
  // Multiple choice: exact match (A, B, C, D)
  else if (questionType === 'abc' || questionType === 'abcd' || questionType === 'matching') {
    return userAnswer === correctAnswer;
  }
  // Default: case-insensitive string comparison
  else {
    const userNorm = String(userAnswer).trim().toLowerCase();
    const correctNorm = String(correctAnswer).trim().toLowerCase();
    return userNorm === correctNorm;
  }
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
    
    const where = {};
    if (testType) where.testType = testType;
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
