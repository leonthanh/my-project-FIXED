const express = require('express');
const { requireAuth } = require('../../../middlewares/auth');
const { requireTestPermission } = require('../../../middlewares/testPermissions');
const {
  createCreateReadingTestHandler,
  createDeleteReadingTestHandler,
  createGetReadingTestHandler,
  createListReadingTestsHandler,
  createUpdateReadingTestHandler,
} = require('./controller');
const {
  createListReadingTestSubmissionsHandler,
  createSubmitReadingTestHandler,
} = require('./submissionController');

const createForcedReadingRouter = ({ forcedTestType, label }) => {
  const router = express.Router();
  const readingLabel = `Cambridge ${label} Reading`;

  router.get(
    '/reading-tests',
    createListReadingTestsHandler({
      forcedTestType,
      logLabel: `Lỗi khi lấy danh sách ${readingLabel}`,
    })
  );

  router.get(
    '/reading-tests/:id',
    createGetReadingTestHandler({
      forcedTestType,
      logLabel: `Lỗi khi lấy chi tiết ${readingLabel}`,
    })
  );

  router.post(
    '/reading-tests',
    requireAuth,
    requireTestPermission('cambridge'),
    createCreateReadingTestHandler({
      forcedTestType,
      logLabel: `Lỗi khi tạo ${readingLabel}`,
    })
  );

  router.put(
    '/reading-tests/:id',
    requireAuth,
    requireTestPermission('cambridge'),
    createUpdateReadingTestHandler({
      forcedTestType,
      logLabel: `Lỗi khi cập nhật ${readingLabel}`,
    })
  );

  router.delete(
    '/reading-tests/:id',
    createDeleteReadingTestHandler({
      forcedTestType,
      logLabel: `Lỗi khi xóa ${readingLabel}`,
    })
  );

  router.post(
    '/reading-tests/:id/submit',
    createSubmitReadingTestHandler({
      forcedTestType,
      logLabel: `Lỗi khi nộp bài ${readingLabel}`,
    })
  );

  router.get(
    '/reading-tests/:id/submissions',
    createListReadingTestSubmissionsHandler({
      forcedTestType,
      logLabel: `Lỗi khi lấy submissions ${readingLabel}`,
    })
  );

  return router;
};

module.exports = {
  createForcedReadingRouter,
};