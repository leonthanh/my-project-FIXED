const { logError } = require('../../../logger');
const submissionService = require('./service');

const handleSubmissionError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  res.status(statusCode).json({ message: err?.message || serverMessage });
};

const autosaveCambridgeSubmissionHandler = async (req, res) => {
  try {
    const result = await submissionService.autosaveCambridgeSubmission({ body: req.body });
    res.json({
      message: 'Draft saved.',
      submissionId: result.submission.id,
      savedAt: result.submission.lastSavedAt,
      expiresAt: result.submission.expiresAt,
      timing: result.timing,
    });
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Error autosaving Cambridge submission',
      serverMessage: 'Failed to autosave Cambridge submission.',
    });
  }
};

const getActiveCambridgeDraftHandler = async (req, res) => {
  try {
    const result = await submissionService.getActiveCambridgeDraft({ query: req.query });
    res.json(result);
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Error fetching active Cambridge draft',
      serverMessage: 'Failed to fetch Cambridge draft.',
    });
  }
};

const listCambridgeSubmissionsHandler = async (req, res) => {
  try {
    const result = await submissionService.listCambridgeSubmissions({ query: req.query });
    res.json(result);
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi lấy tất cả submissions',
      serverMessage: 'Lỗi server khi lấy danh sách bài nộp.',
    });
  }
};

const listCambridgeSubmissionsByPhoneHandler = async (req, res) => {
  try {
    const submissions = await submissionService.listCambridgeSubmissionsByPhone({
      phone: req.params.phone,
    });
    res.json(submissions);
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi lấy Cambridge submissions theo user',
      serverMessage: 'Lỗi server khi lấy danh sách bài nộp.',
    });
  }
};

const countUnseenCambridgeFeedbackByPhoneHandler = async (req, res) => {
  try {
    const result = await submissionService.countUnseenCambridgeFeedbackByPhone({
      phone: req.params.phone,
    });
    res.json(result);
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi đếm Cambridge feedback chưa xem',
      serverMessage: 'Lỗi server.',
    });
  }
};

const markCambridgeFeedbackSeenHandler = async (req, res) => {
  try {
    const result = await submissionService.markCambridgeFeedbackSeen({ body: req.body });
    res.json({ message: '✅ Đã đánh dấu là đã xem', updatedCount: result.updatedCount });
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi đánh dấu Cambridge feedback đã xem',
      serverMessage: '❌ Server error khi đánh dấu đã xem',
    });
  }
};

const extendCambridgeSubmissionTimeHandler = async (req, res) => {
  try {
    const result = await submissionService.extendCambridgeSubmissionTime({
      submissionId: req.params.submissionId,
      extraMinutes: req.body?.extraMinutes,
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
      logLabel: 'Error extending Cambridge submission',
      serverMessage: 'Lỗi server khi gia hạn thời gian.',
    });
  }
};

const getCambridgeSubmissionByIdHandler = async (req, res) => {
  try {
    const submission = await submissionService.getCambridgeSubmissionById({ id: req.params.id });
    res.json(submission);
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi lấy chi tiết submission',
      serverMessage: 'Lỗi server khi lấy chi tiết bài nộp.',
    });
  }
};

const updateCambridgeSubmissionHandler = async (req, res) => {
  try {
    const submission = await submissionService.updateCambridgeSubmission({
      id: req.params.id,
      body: req.body,
    });
    res.json({
      message: 'Cập nhật bài nộp thành công!',
      submission,
    });
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi cập nhật submission',
      serverMessage: 'Lỗi server khi cập nhật bài nộp.',
    });
  }
};

const markCambridgeSubmissionSeenHandler = async (req, res) => {
  try {
    await submissionService.markCambridgeSubmissionSeen({ id: req.params.id });
    res.json({ message: 'Đã đánh dấu đã xem feedback' });
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi cập nhật feedbackSeen',
      serverMessage: 'Lỗi server.',
    });
  }
};

const rescoreCambridgeSubmissionHandler = async (req, res) => {
  try {
    const result = await submissionService.rescoreCambridgeSubmission({ id: req.params.id });
    res.json({
      message: 'Rescore thành công!',
      submissionId: result.submission.id,
      before: result.before,
      after: result.after,
    });
  } catch (err) {
    handleSubmissionError(err, res, {
      logLabel: 'Lỗi khi rescore submission',
      serverMessage: 'Lỗi server khi chấm lại bài nộp.',
    });
  }
};

module.exports = {
  autosaveCambridgeSubmissionHandler,
  countUnseenCambridgeFeedbackByPhoneHandler,
  extendCambridgeSubmissionTimeHandler,
  getActiveCambridgeDraftHandler,
  getCambridgeSubmissionByIdHandler,
  listCambridgeSubmissionsByPhoneHandler,
  listCambridgeSubmissionsHandler,
  markCambridgeFeedbackSeenHandler,
  markCambridgeSubmissionSeenHandler,
  rescoreCambridgeSubmissionHandler,
  updateCambridgeSubmissionHandler,
};