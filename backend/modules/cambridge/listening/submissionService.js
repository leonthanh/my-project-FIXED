const { Op } = require('sequelize');
const { CambridgeListening, CambridgeSubmission, User } = require('../../../models');
const {
  FINALIZED_CAMBRIDGE_WHERE,
  findActiveCambridgeDraft,
} = require('../shared/submissionUtils');
const { scoreTest } = require('../shared/scoring');
const placementService = require('../../placement/service');

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeForcedTestType = (forcedTestType) => {
  const normalized = String(forcedTestType || '').trim().toLowerCase();
  return normalized || null;
};

const ensureListeningRecord = (record, forcedTestType) => {
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

const submitListeningTest = async ({ id, body = {}, forcedTestType = null } = {}) => {
  const {
    answers,
    studentName,
    studentPhone,
    studentEmail,
    classCode,
    userId,
    submissionId,
    placementAttemptItemToken,
    timeRemaining,
    timeSpent,
  } = body;

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createServiceError(400, 'Thiếu câu trả lời');
  }

  const test = ensureListeningRecord(await CambridgeListening.findByPk(id), forcedTestType);
  const { score, total, percentage, detailedResults } = scoreTest(test, answers);

  let placementContext = null;
  if (placementAttemptItemToken) {
    placementContext = await placementService.getRuntimeSubmissionForAttemptItem({
      attemptItemToken: placementAttemptItemToken,
      platform: 'orange',
      skill: 'listening',
      testId: String(parseInt(id, 10)),
      testType: test.testType,
    });
  }

  let finalStudentName = studentName || placementContext?.attempt?.studentName;
  const finalClassCode = classCode || test.classCode;
  const finalStudentPhone = studentPhone || placementContext?.attempt?.studentPhone || null;

  if (userId) {
    const user = await User.findByPk(userId);
    if (user) {
      finalStudentName = finalStudentName || user.name || user.username;
    }
  }

  let submission = placementContext?.submission || null;
  if (!submission) {
    submission = await findActiveCambridgeDraft({
      submissionId: Number(submissionId) || null,
      testId: parseInt(id, 10),
      testType: test.testType,
      userId: userId || null,
    });
  }

  const finalizedPayload = {
    testId: parseInt(id, 10),
    testType: test.testType,
    testTitle: test.title,
    studentName: finalStudentName || 'Unknown',
    studentPhone: finalStudentPhone,
    studentEmail: studentEmail || null,
    classCode: finalClassCode,
    userId: placementAttemptItemToken ? submission?.userId || null : userId || null,
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

  if (placementAttemptItemToken) {
    await placementService.syncRuntimeSubmissionForAttemptItem({
      attemptItemToken: placementAttemptItemToken,
      platform: 'orange',
      skill: 'listening',
      testId: String(parseInt(id, 10)),
      testType: test.testType,
      runtimeSubmissionModel: 'cambridge',
      runtimeSubmissionId: submission.id,
      status: 'submitted',
      correct: score,
      totalQuestions: total,
      percentage,
      band: null,
    });
  }

  return {
    submission,
    score,
    total,
    percentage,
    detailedResults,
  };
};

const listListeningTestSubmissions = async ({ id, forcedTestType = null } = {}) => {
  const numericId = parseInt(id, 10);
  const normalizedForced = normalizeForcedTestType(forcedTestType);
  const where = {
    testId: numericId,
    ...FINALIZED_CAMBRIDGE_WHERE,
  };

  if (normalizedForced) {
    where.testType = normalizedForced;
  } else {
    const test = await CambridgeListening.findByPk(numericId);
    const resolvedTestType = String(test?.testType || '').trim().toLowerCase();
    where.testType = resolvedTestType || { [Op.like]: '%-listening' };
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
  listListeningTestSubmissions,
  submitListeningTest,
};