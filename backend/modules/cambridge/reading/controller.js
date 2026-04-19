const { logError } = require('../../../logger');
const readingService = require('./service');

const handleReadingError = (err, res, { logLabel, serverMessage }) => {
  const statusCode = Number(err?.statusCode) || 500;

  if (statusCode >= 500) {
    console.error(`❌ ${logLabel}:`, err);
    logError(logLabel, err);
  }

  return res.status(statusCode).json({ message: err?.message || serverMessage });
};

const createListReadingTestsHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi lấy danh sách Cambridge Reading' } = {}) =>
  async (req, res) => {
    try {
      const tests = await readingService.listReadingTests({ query: req.query, forcedTestType });
      res.json(tests);
    } catch (err) {
      handleReadingError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi lấy danh sách đề thi.',
      });
    }
  };

const createGetReadingTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi lấy chi tiết Cambridge Reading' } = {}) =>
  async (req, res) => {
    try {
      const test = await readingService.getReadingTestById({ id: req.params.id, forcedTestType });
      res.json(test);
    } catch (err) {
      handleReadingError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi lấy chi tiết đề thi.',
      });
    }
  };

const createCreateReadingTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi tạo Cambridge Reading' } = {}) =>
  async (req, res) => {
    try {
      const test = await readingService.createReadingTest({ body: req.body, forcedTestType });
      res.status(201).json({
        message: 'Tạo đề thành công!',
        test,
      });
    } catch (err) {
      handleReadingError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi tạo đề thi.',
      });
    }
  };

const createUpdateReadingTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi cập nhật Cambridge Reading' } = {}) =>
  async (req, res) => {
    try {
      const test = await readingService.updateReadingTest({
        id: req.params.id,
        body: req.body,
        forcedTestType,
      });
      res.json({
        message: 'Cập nhật đề thành công!',
        test,
      });
    } catch (err) {
      handleReadingError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi cập nhật đề thi.',
      });
    }
  };

const createDeleteReadingTestHandler = ({ forcedTestType = null, logLabel = 'Lỗi khi xóa Cambridge Reading' } = {}) =>
  async (req, res) => {
    try {
      await readingService.deleteReadingTest({ id: req.params.id, forcedTestType });
      res.json({ message: 'Xóa đề thành công!' });
    } catch (err) {
      handleReadingError(err, res, {
        logLabel,
        serverMessage: 'Lỗi server khi xóa đề thi.',
      });
    }
  };

module.exports = {
  createCreateReadingTestHandler,
  createDeleteReadingTestHandler,
  createGetReadingTestHandler,
  createListReadingTestsHandler,
  createUpdateReadingTestHandler,
};