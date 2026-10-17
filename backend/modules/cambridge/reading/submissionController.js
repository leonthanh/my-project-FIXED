const { logError } = require('../../../logger');
const { CambridgeReading, CambridgeSubmission } = require('../../../models');
const submissionService = require('./submissionService');
const { normalizeStudentResultVisibility } = require('../../../utils/studentResultVisibility');

const handleSubmissionError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  return res.status(statusCode).json({ message: err?.message || serverMessage });
};

const createSubmitReadingTestHandler = ({
  forcedTestType = null,
  testModel = CambridgeReading,
  submissionModel = CambridgeSubmission,
  platform = 'orange',
  logLabel = 'Lỗi khi nộp bài Cambridge Reading',
} = {}) =>
  async (req, res) => {
    try {
      const result = await submissionService.submitReadingTest({
        id: req.params.id,
        body: req.body,
        forcedTestType,
        testModel,
        submissionModel,
        platform,
      });
      const visibility = normalizeStudentResultVisibility(
        result.studentResultVisibility,
        result.showResultModal
      );
      const isStudentRequest = !req.user || req.user.role === 'student';

      if (isStudentRequest && visibility === 'confirmation') {
        return res.status(201).json({
          message: 'Nộp bài thành công!',
          submissionId: result.submission.id,
        });
      }

      return res.status(201).json({
        message: 'Nộp bài thành công!',
        submissionId: result.submission.id,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        ...(isStudentRequest && visibility !== 'details'
          ? {}
          : {
              detailedResults: result.detailedResults,
              answers: result.detailedResults,
            }),
        breakdown: result.breakdown,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi nộp bài.',
      });
    }
  };

const createListReadingTestSubmissionsHandler = ({
  forcedTestType = null,
  testModel = CambridgeReading,
  submissionModel = CambridgeSubmission,
  logLabel = 'Lỗi khi lấy danh sách submissions Cambridge Reading',
} = {}) =>
  async (req, res) => {
    try {
      const submissions = await submissionService.listReadingTestSubmissions({
        id: req.params.id,
        forcedTestType,
        testModel,
        submissionModel,
      });
      res.json(submissions);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi lấy danh sách bài nộp.',
      });
    }
  };

module.exports = {
  createListReadingTestSubmissionsHandler,
  createSubmitReadingTestHandler,
};