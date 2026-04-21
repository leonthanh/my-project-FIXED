const express = require('express');
const { requireAuth } = require('../../../middlewares/auth');
const { requireTestPermission } = require('../../../middlewares/testPermissions');
const {
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
} = require('./controller');

const router = express.Router();

router.post('/submissions/autosave', autosaveCambridgeSubmissionHandler);
router.get('/submissions/active', getActiveCambridgeDraftHandler);
router.post(
  '/submissions/:submissionId/extend-time',
  requireAuth,
  requireTestPermission('cambridge'),
  extendCambridgeSubmissionTimeHandler
);
router.get('/submissions', listCambridgeSubmissionsHandler);
router.get('/submissions/user/:phone', listCambridgeSubmissionsByPhoneHandler);
router.get('/submissions/unseen-count/:phone', countUnseenCambridgeFeedbackByPhoneHandler);
router.post('/submissions/mark-feedback-seen', markCambridgeFeedbackSeenHandler);
router.get('/submissions/:id', getCambridgeSubmissionByIdHandler);
router.post('/submissions/:id/rescore', rescoreCambridgeSubmissionHandler);
router.put('/submissions/:id', updateCambridgeSubmissionHandler);
router.put('/submissions/:id/seen', markCambridgeSubmissionSeenHandler);

module.exports = router;