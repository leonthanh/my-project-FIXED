const { logError } = require('../../../logger');
const listeningService = require('./service');

const handleListeningError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  return res.status(statusCode).json({ message: err?.message || serverMessage });
};

const createListListeningTestsHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi lấy danh sách Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const tests = await listeningService.listListeningTests({
        query: req.query,
        forcedTestType,
      });
      res.json(tests);
    } catch (err) {
      handleListeningError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi lấy danh sách đề thi.',
      });
    }
  };

const createGetListeningTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi lấy chi tiết Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const test = await listeningService.getListeningTestById({
        id: req.params.id,
        forcedTestType,
      });
      res.json(test);
    } catch (err) {
      handleListeningError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi lấy chi tiết đề thi.',
      });
    }
  };

const createCreateListeningTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi tạo Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const test = await listeningService.createListeningTest({
        body: req.body,
        forcedTestType,
      });
      console.log(`✅ Tạo đề Cambridge Listening thành công: ${test.id}`);
      res.status(201).json({
        message: 'Tạo đề thành công!',
        test,
      });
    } catch (err) {
      handleListeningError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi tạo đề thi.',
      });
    }
  };

const createUpdateListeningTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi cập nhật Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      const test = await listeningService.updateListeningTest({
        id: req.params.id,
        body: req.body,
        forcedTestType,
      });
      res.json({
        message: 'Cập nhật đề thành công!',
        test,
      });
    } catch (err) {
      handleListeningError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi cập nhật đề thi.',
      });
    }
  };

const createDeleteListeningTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi xóa Cambridge Listening' } = {}) =>
  async (req, res) => {
    try {
      await listeningService.deleteListeningTest({
        id: req.params.id,
        forcedTestType,
      });
      res.json({ message: 'Xóa đề thành công!' });
    } catch (err) {
      handleListeningError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi xóa đề thi.',
      });
    }
  };

module.exports = {
  createCreateListeningTestHandler,
  createDeleteListeningTestHandler,
  createGetListeningTestHandler,
  createListListeningTestsHandler,
  createUpdateListeningTestHandler,
};