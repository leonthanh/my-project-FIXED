const express = require('express');
const { requireAuth } = require('../../../middlewares/auth');
const { requireTestPermission } = require('../../../middlewares/testPermissions');
const {
  createCreateListeningTestHandler,
  createDeleteListeningTestHandler,
  createGetListeningTestHandler,
  createListListeningTestsHandler,
  createUpdateListeningTestHandler,
} = require('./controller');
const {
  createListListeningTestSubmissionsHandler,
  createSubmitListeningTestHandler,
} = require('./submissionController');

const router = express.Router();

router.get('/listening-tests', createListListeningTestsHandler());
router.get('/listening-tests/:id', createGetListeningTestHandler());
router.post(
  '/listening-tests',
  requireAuth,
  requireTestPermission('cambridge'),
  createCreateListeningTestHandler()
);
router.put(
  '/listening-tests/:id',
  requireAuth,
  requireTestPermission('cambridge'),
  createUpdateListeningTestHandler()
);
router.delete('/listening-tests/:id', createDeleteListeningTestHandler());
router.post('/listening-tests/:id/submit', createSubmitListeningTestHandler());
router.get('/listening-tests/:id/submissions', createListListeningTestSubmissionsHandler());

module.exports = router;