const { logError } = require('../../../logger');
const submissionService = require('./submissionService');

const handleSubmissionError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  return res.status(statusCode).json({ message: err?.message || serverMessage });
};

const createSubmitListeningTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi nộp bài Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const result = await submissionService.submitListeningTest({
        id: req.params.id,
        body: req.body,
        forcedTestType,
      });

      res.status(201).json({
        message: 'Nộp bài thành công!',
        submissionId: result.submission.id,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        detailedResults: result.detailedResults,
        answers: result.detailedResults,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi nộp bài.',
      });
    }
  };

const createListListeningTestSubmissionsHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi lấy danh sách submissions Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const submissions = await submissionService.listListeningTestSubmissions({
        id: req.params.id,
        forcedTestType,
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
  createListListeningTestSubmissionsHandler,
  createSubmitListeningTestHandler,
};