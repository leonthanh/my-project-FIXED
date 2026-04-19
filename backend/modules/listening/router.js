const express = require('express');
const listeningTestsRoute = require('../../routes/listeningTests');
const listeningSubmissionRoutes = require('../../routes/listening-submission');

const router = express.Router();

router.use('/listening-tests', listeningTestsRoute);
router.use('/listening-submissions', listeningSubmissionRoutes);

module.exports = router;