const { logError } = require('../../../logger');
const maintenanceService = require('./service');

const createMaintenanceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertAdminKeyIfConfigured = (req) => {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return;

  const got = req.headers['x-admin-key'];
  if (got && String(got) === String(expected)) {
    return;
  }

  throw createMaintenanceError(403, 'Forbidden');
};

const recalculateCambridgeTotalQuestionsHandler = async (req, res) => {
  try {
    assertAdminKeyIfConfigured(req);
    const result = await maintenanceService.recalculateCambridgeTotalQuestions({ query: req.query });
    res.json(result);
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 500;

    if (statusCode >= 500) {
      console.error('❌ Lỗi khi recalculate totalQuestions:', err);
      logError('Lỗi khi recalculate totalQuestions', err);
    }

    res.status(statusCode).json({
      message: err?.message || 'Lỗi server khi recalculate totalQuestions.',
    });
  }
};

module.exports = {
  recalculateCambridgeTotalQuestionsHandler,
};