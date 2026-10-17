const { logError } = require('../../../logger');
const { CambridgeSubmission } = require('../../../models');
const submissionService = require('./service');

const handleSubmissionError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  res.status(statusCode).json({ message: err?.message || serverMessage });
};

const createSubmissionHandlers = ({
  submissionModel = CambridgeSubmission,
  platform = null,
} = {}) => ({
  autosaveCambridgeSubmissionHandler: async (req, res) => {
    try {
      const result = await submissionService.autosaveCambridgeSubmission({
        body: req.body,
        submissionModel,
        platform,
      });
      res.json({
        message: 'Draft saved.',
        submissionId: result.submission.id,
        savedAt: result.submission.lastSavedAt,
        expiresAt: result.submission.expiresAt,
        timing: result.timing,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Error autosaving ${platform} submission`,
        serverMessage: `Failed to autosave ${platform} submission.`,
      });
    }
  },

  getActiveCambridgeDraftHandler: async (req, res) => {
    try {
      const result = await submissionService.getActiveCambridgeDraft({
        query: req.query,
        submissionModel,
        platform,
      });
      res.json(result);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Error fetching active ${platform} draft`,
        serverMessage: `Failed to fetch ${platform} draft.`,
      });
    }
  },

  listCambridgeSubmissionsHandler: async (req, res) => {
    try {
      const result = await submissionService.listCambridgeSubmissions({
        query: req.query,
        submissionModel,
        platform,
      });
      res.json(result);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: 'Lỗi khi lấy tất cả submissions',
        serverMessage: 'Lỗi server khi lấy danh sách bài nộp.',
      });
    }
  },

  listCambridgeSubmissionsByPhoneHandler: async (req, res) => {
    try {
      const submissions = await submissionService.listCambridgeSubmissionsByPhone({
        phone: req.params.phone,
        submissionModel,
        platform,
      });
      res.json(submissions);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi lấy ${platform} submissions theo user`,
        serverMessage: 'Lỗi server khi lấy danh sách bài nộp.',
      });
    }
  },

  countUnseenCambridgeFeedbackByPhoneHandler: async (req, res) => {
    try {
      const result = await submissionService.countUnseenCambridgeFeedbackByPhone({
        phone: req.params.phone,
        submissionModel,
      });
      res.json(result);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi đếm ${platform} feedback chưa xem`,
        serverMessage: 'Lỗi server.',
      });
    }
  },

  markCambridgeFeedbackSeenHandler: async (req, res) => {
    try {
      const result = await submissionService.markCambridgeFeedbackSeen({
        body: req.body,
        submissionModel,
      });
      res.json({ message: '✅ Đã đánh dấu là đã xem', updatedCount: result.updatedCount });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi đánh dấu ${platform} feedback đã xem`,
        serverMessage: '❌ Server error khi đánh dấu đã xem',
      });
    }
  },

  extendCambridgeSubmissionTimeHandler: async (req, res) => {
    try {
      const result = await submissionService.extendCambridgeSubmissionTime({
        submissionId: req.params.submissionId,
        extraMinutes: req.body?.extraMinutes,
        submissionModel,
      });
      res.json({
        message: `Đã gia hạn ${result.extensionMinutes} phút.`,
        submissionId: result.submission.id,
        extensionMinutes: result.extensionMinutes,
        expiresAt: result.submission.expiresAt,
        timing: result.timing,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Error extending ${platform} submission`,
        serverMessage: 'Lỗi server khi gia hạn thời gian.',
      });
    }
  },

  getCambridgeSubmissionByIdHandler: async (req, res) => {
    try {
      const submission = await submissionService.getCambridgeSubmissionById({
        id: req.params.id,
        submissionModel,
      });
      res.json(submission);
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi lấy chi tiết ${platform} submission`,
        serverMessage: 'Lỗi server khi lấy chi tiết bài nộp.',
      });
    }
  },

  updateCambridgeSubmissionHandler: async (req, res) => {
    try {
      const submission = await submissionService.updateCambridgeSubmission({
        id: req.params.id,
        body: req.body,
        submissionModel,
      });
      res.json({
        message: 'Cập nhật bài nộp thành công!',
        submission,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi cập nhật ${platform} submission`,
        serverMessage: 'Lỗi server khi cập nhật bài nộp.',
      });
    }
  },

  markCambridgeSubmissionSeenHandler: async (req, res) => {
    try {
      await submissionService.markCambridgeSubmissionSeen({
        id: req.params.id,
        submissionModel,
      });
      res.json({ message: 'Đã đánh dấu đã xem feedback' });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi cập nhật ${platform} feedbackSeen`,
        serverMessage: 'Lỗi server.',
      });
    }
  },

  rescoreCambridgeSubmissionHandler: async (req, res) => {
    try {
      const result = await submissionService.rescoreCambridgeSubmission({
        id: req.params.id,
        submissionModel,
        platform,
      });
      res.json({
        message: 'Rescore thành công!',
        submissionId: result.submission.id,
        before: result.before,
        after: result.after,
      });
    } catch (err) {
      handleSubmissionError(err, res, {
        logLabel: `Lỗi khi chấm lại ${platform} submission`,
        serverMessage: 'Lỗi server khi chấm lại bài nộp.',
      });
    }
  },
});

module.exports = {
  ...createSubmissionHandlers(),
  createSubmissionHandlers,
};
