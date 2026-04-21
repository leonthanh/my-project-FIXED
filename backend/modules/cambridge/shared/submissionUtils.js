const { Op } = require('sequelize');
const { CambridgeListening, CambridgeReading, CambridgeSubmission } = require('../../../models');

const BASE_READING_CAMBRIDGE_TEST_TYPES = ['flyers', 'movers', 'starters'];

const FINALIZED_CAMBRIDGE_WHERE = {
  [Op.or]: [{ finished: true }, { finished: null }],
};

const parseDetailedResults = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  return null;
};

const countPendingManualAnswers = (submission) => {
  if (!submission || submission.finished === false) return 0;

  const hasReview =
    String(submission.status || '').toLowerCase() === 'reviewed' ||
    Boolean(String(submission.feedbackBy || '').trim()) ||
    Boolean(String(submission.feedback || '').trim());

  if (hasReview) return 0;

  const detailedResults = parseDetailedResults(submission.detailedResults);
  if (!detailedResults) return 0;

  return Object.values(detailedResults).filter(
    (result) =>
      result &&
      typeof result === 'object' &&
      result.isCorrect === null &&
      Boolean(String(result.userAnswer || '').trim())
  ).length;
};

const getCambridgeModelByType = (testType = '') => {
  const normalized = String(testType || '').trim().toLowerCase();
  return normalized.includes('listening') ? CambridgeListening : CambridgeReading;
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
    const submission = await CambridgeSubmission.findByPk(submissionId);
    if (submission && submission.finished === false) {
      return submission;
    }
  }

  if (!userId) {
    return null;
  }

  return CambridgeSubmission.findOne({
    where: {
      testId: Number(testId),
      testType: String(testType || ''),
      userId: Number(userId),
      finished: false,
    },
    order: [['updatedAt', 'DESC']],
  });
};

module.exports = {
  BASE_READING_CAMBRIDGE_TEST_TYPES,
  FINALIZED_CAMBRIDGE_WHERE,
  countPendingManualAnswers,
  findActiveCambridgeDraft,
  getCambridgeModelByType,
  getCambridgeTestRecord,
};