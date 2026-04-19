const { logError } = require('../../../logger');
const catalogService = require('./service');

const listCambridgeTestsHandler = async (req, res) => {
  try {
    const tests = await catalogService.listCambridgeTests({ query: req.query });
    res.json(tests);
  } catch (err) {
    console.error('❌ Lỗi khi lấy danh sách Cambridge tests:', err);
    logError('Lỗi khi lấy danh sách Cambridge tests', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề thi.' });
  }
};

module.exports = {
  listCambridgeTestsHandler,
};