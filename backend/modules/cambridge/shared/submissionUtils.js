const { Op } = require('sequelize');
const {
  CambridgeListening,
  CambridgeReading,
  CambridgeSubmission,
  GatewayListening,
  GatewayReading,
  GatewaySubmission,
  GeneralListening,
  GeneralReading,
  GeneralSubmission,
} = require('../../../models');
const {
  getCambridgeResponseFeedbackText,
  hasCambridgeResponseFeedback,
} = require('./feedbackUtils');

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

  const detailedResults = parseDetailedResults(submission.detailedResults);
  if (!detailedResults) return 0;

  const openEndedEntries = Object.entries(detailedResults).filter(
    ([, result]) =>
      result &&
      typeof result === 'object' &&
      result.isCorrect === null &&
      Boolean(String(result.userAnswer || '').trim())
  );

  if (!openEndedEntries.length) return 0;

  const hasLegacyReview =
    Boolean(String(submission.feedback || '').trim()) ||
    (String(submission.status || '').toLowerCase() === 'reviewed' &&
      !hasCambridgeResponseFeedback(submission.responseFeedback));

  if (hasLegacyReview) return 0;

  return openEndedEntries.filter(
    ([key]) => !getCambridgeResponseFeedbackText(submission.responseFeedback, key)
  ).length;
};

const getCambridgeModelByType = (testType = '', platform = 'cambridge') => {
  const normalized = String(testType || '').trim().toLowerCase();
  const normalizedPlatform = String(platform || '').trim().toLowerCase();
  if (normalizedPlatform === 'gateway') {
    return normalized.includes('listening') ? GatewayListening : GatewayReading;
  }
  if (normalizedPlatform === 'general') {
    return normalized.includes('listening') ? GeneralListening : GeneralReading;
  }
  return normalized.includes('listening') ? CambridgeListening : CambridgeReading;
};

const getCambridgeTestRecord = async (testId, testType, platform = 'cambridge') => {
  const Model = getCambridgeModelByType(testType, platform);
  return Model.findByPk(testId);
};

const findActiveCambridgeDraft = async ({
  submissionId,
  testId,
  testType,
  userId,
  submissionModel = CambridgeSubmission,
}) => {
  if (submissionId) {
    const submission = await submissionModel.findByPk(submissionId);
    if (submission && submission.finished === false) {
      return submission;
    }
  }

  if (!userId) {
    return null;
  }

  return submissionModel.findOne({
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