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

const router = express.Router();

router.get('/reading-tests', createListReadingTestsHandler());
router.get('/reading-tests/:id', createGetReadingTestHandler());
router.post(
  '/reading-tests',
  requireAuth,
  requireTestPermission('cambridge'),
  createCreateReadingTestHandler()
);
router.put(
  '/reading-tests/:id',
  requireAuth,
  requireTestPermission('cambridge'),
  createUpdateReadingTestHandler()
);
router.delete('/reading-tests/:id', createDeleteReadingTestHandler());
router.post('/reading-tests/:id/submit', createSubmitReadingTestHandler());
router.get('/reading-tests/:id/submissions', createListReadingTestSubmissionsHandler());

module.exports = router;