const { Op } = require('sequelize');
const { CambridgeReading, CambridgeSubmission, User } = require('../../../models');
const {
  BASE_READING_CAMBRIDGE_TEST_TYPES,
  FINALIZED_CAMBRIDGE_WHERE,
  findActiveCambridgeDraft,
} = require('../shared/submissionUtils');
const { scoreTest } = require('../shared/scoring');

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeForcedTestType = (forcedTestType) => {
  const normalized = String(forcedTestType || '').trim().toLowerCase();
  return normalized || null;
};

const ensureReadingRecord = (record, forcedTestType) => {
  if (!record) {
    throw createServiceError(404, 'Không tìm thấy đề thi');
  }

  const normalizedForced = normalizeForcedTestType(forcedTestType);
  if (!normalizedForced) {
    return record;
  }

  if (String(record.testType || '').trim().toLowerCase() !== normalizedForced) {
    throw createServiceError(404, 'Không tìm thấy đề thi');
  }

  return record;
};

const submitReadingTest = async ({ id, body = {}, forcedTestType = null } = {}) => {
  const {
    answers,
    studentName,
    studentPhone,
    studentEmail,
    classCode,
    userId,
    submissionId,
    timeRemaining,
    timeSpent,
  } = body;

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createServiceError(400, 'Thiếu câu trả lời');
  }

  const test = ensureReadingRecord(await CambridgeReading.findByPk(id), forcedTestType);
  const { score, total, percentage, detailedResults } = scoreTest(test, answers);

  let finalStudentName = studentName;
  const finalClassCode = classCode || test.classCode;

  if (userId) {
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

  return {
    submission,
    score,
    total,
    percentage,
    detailedResults,
  };
};

const listReadingTestSubmissions = async ({ id, forcedTestType = null } = {}) => {
  const numericId = parseInt(id, 10);
  const normalizedForced = normalizeForcedTestType(forcedTestType);
  const where = {
    testId: numericId,
    ...FINALIZED_CAMBRIDGE_WHERE,
  };

  if (normalizedForced) {
    where.testType = normalizedForced;
  } else {
    const test = await CambridgeReading.findByPk(numericId);
    const resolvedTestType = String(test?.testType || '').trim().toLowerCase();

    if (resolvedTestType) {
      where.testType = resolvedTestType;
    } else {
      where[Op.or] = [
        { testType: { [Op.like]: '%-reading' } },
        { testType: { [Op.in]: BASE_READING_CAMBRIDGE_TEST_TYPES } },
      ];
    }
  }

  return CambridgeSubmission.findAll({
    where,
    order: [['submittedAt', 'DESC']],
    attributes: [
      'id', 'studentName', 'studentPhone', 'classCode',
      'score', 'totalQuestions', 'percentage',
      'timeSpent', 'status', 'submittedAt', 'feedbackSeen',
    ],
  });
};

module.exports = {
  listReadingTestSubmissions,
  submitReadingTest,
};