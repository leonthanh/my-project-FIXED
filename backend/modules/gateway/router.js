const express = require('express');
const { optionalAuth, requireAuth } = require('../../middlewares/auth');
const { requireTestPermission } = require('../../middlewares/testPermissions');
const {
  GatewayListening,
  GatewayReading,
  GatewaySubmission,
} = require('../../models');
const {
  createCreateReadingTestHandler,
  createDeleteReadingTestHandler,
  createGetReadingTestHandler,
  createListReadingTestsHandler,
  createUpdateReadingTestHandler,
} = require('../cambridge/reading/controller');
const {
  createListReadingTestSubmissionsHandler,
  createSubmitReadingTestHandler,
} = require('../cambridge/reading/submissionController');
const {
  createCreateListeningTestHandler,
  createDeleteListeningTestHandler,
  createGetListeningTestHandler,
  createListListeningTestsHandler,
  createUpdateListeningTestHandler,
} = require('../cambridge/listening/controller');
const {
  createListListeningTestSubmissionsHandler,
  createSubmitListeningTestHandler,
} = require('../cambridge/listening/submissionController');
const { createSubmissionHandlers } = require('../cambridge/submissions/controller');

const router = express.Router();
const GATEWAY_READING_TYPE = 'gateway-reading-writing';
const GATEWAY_LISTENING_TYPE = 'gateway-listening';
const gatewaySubmissionHandlers = createSubmissionHandlers({
  submissionModel: GatewaySubmission,
  platform: 'gateway',
});

router.get(
  '/reading-tests',
  createListReadingTestsHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    logLabel: 'Error listing Gateway reading tests',
  })
);
router.get(
  '/reading-tests/:id',
  createGetReadingTestHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    logLabel: 'Error fetching Gateway reading test',
  })
);
router.post(
  '/reading-tests',
  requireAuth,
  requireTestPermission('gateway'),
  createCreateReadingTestHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    platform: 'gateway',
    logLabel: 'Error creating Gateway reading test',
  })
);
router.put(
  '/reading-tests/:id',
  requireAuth,
  requireTestPermission('gateway'),
  createUpdateReadingTestHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    platform: 'gateway',
    logLabel: 'Error updating Gateway reading test',
  })
);
router.delete(
  '/reading-tests/:id',
  requireAuth,
  requireTestPermission('gateway'),
  createDeleteReadingTestHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    logLabel: 'Error deleting Gateway reading test',
  })
);
router.post(
  '/reading-tests/:id/submit',
  optionalAuth,
  createSubmitReadingTestHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    submissionModel: GatewaySubmission,
    platform: 'gateway',
    logLabel: 'Error submitting Gateway reading test',
  })
);
router.get(
  '/reading-tests/:id/submissions',
  createListReadingTestSubmissionsHandler({
    forcedTestType: GATEWAY_READING_TYPE,
    testModel: GatewayReading,
    submissionModel: GatewaySubmission,
    logLabel: 'Error listing Gateway reading submissions',
  })
);

router.get(
  '/listening-tests',
  createListListeningTestsHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    logLabel: 'Error listing Gateway listening tests',
  })
);
router.get(
  '/listening-tests/:id',
  createGetListeningTestHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    logLabel: 'Error fetching Gateway listening test',
  })
);
router.post(
  '/listening-tests',
  requireAuth,
  requireTestPermission('gateway'),
  createCreateListeningTestHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    platform: 'gateway',
    logLabel: 'Error creating Gateway listening test',
  })
);
router.put(
  '/listening-tests/:id',
  requireAuth,
  requireTestPermission('gateway'),
  createUpdateListeningTestHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    platform: 'gateway',
    logLabel: 'Error updating Gateway listening test',
  })
);
router.delete(
  '/listening-tests/:id',
  requireAuth,
  requireTestPermission('gateway'),
  createDeleteListeningTestHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    logLabel: 'Error deleting Gateway listening test',
  })
);
router.post(
  '/listening-tests/:id/submit',
  optionalAuth,
  createSubmitListeningTestHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    submissionModel: GatewaySubmission,
    platform: 'gateway',
    logLabel: 'Error submitting Gateway listening test',
  })
);
router.get(
  '/listening-tests/:id/submissions',
  createListListeningTestSubmissionsHandler({
    forcedTestType: GATEWAY_LISTENING_TYPE,
    testModel: GatewayListening,
    submissionModel: GatewaySubmission,
    logLabel: 'Error listing Gateway listening submissions',
  })
);

router.post('/submissions/autosave', gatewaySubmissionHandlers.autosaveCambridgeSubmissionHandler);
router.get('/submissions/active', gatewaySubmissionHandlers.getActiveCambridgeDraftHandler);
router.post(
  '/submissions/:submissionId/extend-time',
  requireAuth,
  requireTestPermission('gateway'),
  gatewaySubmissionHandlers.extendCambridgeSubmissionTimeHandler
);
router.get('/submissions', gatewaySubmissionHandlers.listCambridgeSubmissionsHandler);
router.get('/submissions/user/:phone', gatewaySubmissionHandlers.listCambridgeSubmissionsByPhoneHandler);
router.get(
  '/submissions/unseen-count/:phone',
  gatewaySubmissionHandlers.countUnseenCambridgeFeedbackByPhoneHandler
);
router.post(
  '/submissions/mark-feedback-seen',
  gatewaySubmissionHandlers.markCambridgeFeedbackSeenHandler
);
router.get('/submissions/:id', gatewaySubmissionHandlers.getCambridgeSubmissionByIdHandler);
router.post(
  '/submissions/:id/rescore',
  gatewaySubmissionHandlers.rescoreCambridgeSubmissionHandler
);
router.put('/submissions/:id', gatewaySubmissionHandlers.updateCambridgeSubmissionHandler);
router.put('/submissions/:id/seen', gatewaySubmissionHandlers.markCambridgeSubmissionSeenHandler);

module.exports = router;
