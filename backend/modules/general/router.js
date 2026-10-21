const express = require('express');
const { optionalAuth, requireAuth } = require('../../middlewares/auth');
const { requireTestPermission } = require('../../middlewares/testPermissions');
const {
  GeneralListening,
  GeneralReading,
  GeneralSubmission,
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
const READING_TEST_TYPES = new Set([
  'general-reading',
  'general-reading-60',
]);
const LISTENING_TEST_TYPES = new Set(['general-listening']);
const generalSubmissionHandlers = createSubmissionHandlers({
  submissionModel: GeneralSubmission,
  platform: 'general',
});

const requireGeneralTest = (testModel, allowedTestTypes) => async (req, res, next) => {
  try {
    const test = await testModel.findByPk(req.params.id);
    const testType = String(test?.testType || '').trim().toLowerCase();
    if (!test || !allowedTestTypes.has(testType)) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi.' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

router.get(
  '/reading-tests',
  createListReadingTestsHandler({
    forcedTestType: 'general-reading-60',
    testModel: GeneralReading,
    logLabel: 'Error listing General reading tests',
  })
);
router.get(
  '/reading-tests/:id',
  requireGeneralTest(GeneralReading, READING_TEST_TYPES),
  createGetReadingTestHandler({
    testModel: GeneralReading,
    logLabel: 'Error fetching General reading test',
  })
);
router.post(
  '/reading-tests',
  requireAuth,
  requireTestPermission('general'),
  createCreateReadingTestHandler({
    forcedTestType: 'general-reading-60',
    testModel: GeneralReading,
    platform: 'general',
    logLabel: 'Error creating General reading test',
  })
);
router.put(
  '/reading-tests/:id',
  requireAuth,
  requireTestPermission('general'),
  requireGeneralTest(GeneralReading, READING_TEST_TYPES),
  createUpdateReadingTestHandler({
    testModel: GeneralReading,
    platform: 'general',
    logLabel: 'Error updating General reading test',
  })
);
router.delete(
  '/reading-tests/:id',
  requireAuth,
  requireTestPermission('general'),
  requireGeneralTest(GeneralReading, READING_TEST_TYPES),
  createDeleteReadingTestHandler({
    testModel: GeneralReading,
    logLabel: 'Error deleting General reading test',
  })
);
router.post(
  '/reading-tests/:id/submit',
  optionalAuth,
  requireGeneralTest(GeneralReading, READING_TEST_TYPES),
  createSubmitReadingTestHandler({
    testModel: GeneralReading,
    submissionModel: GeneralSubmission,
    platform: 'general',
    logLabel: 'Error submitting General reading test',
  })
);
router.get(
  '/reading-tests/:id/submissions',
  requireGeneralTest(GeneralReading, READING_TEST_TYPES),
  createListReadingTestSubmissionsHandler({
    testModel: GeneralReading,
    submissionModel: GeneralSubmission,
    logLabel: 'Error listing General reading submissions',
  })
);

router.get(
  '/listening-tests',
  createListListeningTestsHandler({
    forcedTestType: 'general-listening',
    testModel: GeneralListening,
    logLabel: 'Error listing General listening tests',
  })
);
router.get(
  '/listening-tests/:id',
  requireGeneralTest(GeneralListening, LISTENING_TEST_TYPES),
  createGetListeningTestHandler({
    testModel: GeneralListening,
    logLabel: 'Error fetching General listening test',
  })
);
router.post(
  '/listening-tests',
  requireAuth,
  requireTestPermission('general'),
  createCreateListeningTestHandler({
    forcedTestType: 'general-listening',
    testModel: GeneralListening,
    platform: 'general',
    logLabel: 'Error creating General listening test',
  })
);
router.put(
  '/listening-tests/:id',
  requireAuth,
  requireTestPermission('general'),
  requireGeneralTest(GeneralListening, LISTENING_TEST_TYPES),
  createUpdateListeningTestHandler({
    testModel: GeneralListening,
    platform: 'general',
    logLabel: 'Error updating General listening test',
  })
);
router.delete(
  '/listening-tests/:id',
  requireAuth,
  requireTestPermission('general'),
  requireGeneralTest(GeneralListening, LISTENING_TEST_TYPES),
  createDeleteListeningTestHandler({
    testModel: GeneralListening,
    logLabel: 'Error deleting General listening test',
  })
);
router.post(
  '/listening-tests/:id/submit',
  optionalAuth,
  requireGeneralTest(GeneralListening, LISTENING_TEST_TYPES),
  createSubmitListeningTestHandler({
    testModel: GeneralListening,
    submissionModel: GeneralSubmission,
    platform: 'general',
    logLabel: 'Error submitting General listening test',
  })
);
router.get(
  '/listening-tests/:id/submissions',
  requireGeneralTest(GeneralListening, LISTENING_TEST_TYPES),
  createListListeningTestSubmissionsHandler({
    testModel: GeneralListening,
    submissionModel: GeneralSubmission,
    logLabel: 'Error listing General listening submissions',
  })
);

router.post('/submissions/autosave', generalSubmissionHandlers.autosaveCambridgeSubmissionHandler);
router.get('/submissions/active', generalSubmissionHandlers.getActiveCambridgeDraftHandler);
router.post(
  '/submissions/:submissionId/extend-time',
  requireAuth,
  requireTestPermission('general'),
  generalSubmissionHandlers.extendCambridgeSubmissionTimeHandler
);
router.get('/submissions', generalSubmissionHandlers.listCambridgeSubmissionsHandler);
router.get(
  '/submissions/user/:phone',
  generalSubmissionHandlers.listCambridgeSubmissionsByPhoneHandler
);
router.get(
  '/submissions/unseen-count/:phone',
  generalSubmissionHandlers.countUnseenCambridgeFeedbackByPhoneHandler
);
router.post(
  '/submissions/mark-feedback-seen',
  generalSubmissionHandlers.markCambridgeFeedbackSeenHandler
);
router.get('/submissions/:id', generalSubmissionHandlers.getCambridgeSubmissionByIdHandler);
router.post(
  '/submissions/:id/rescore',
  generalSubmissionHandlers.rescoreCambridgeSubmissionHandler
);
router.put('/submissions/:id', generalSubmissionHandlers.updateCambridgeSubmissionHandler);
router.put('/submissions/:id/seen', generalSubmissionHandlers.markCambridgeSubmissionSeenHandler);

module.exports = router;
