const express = require('express');
const readingTestsRoute = require('../../routes/readingTest');
const readingSubmissionRoutes = require('../../routes/reading-submission');

const router = express.Router();

router.use('/reading-tests', readingTestsRoute);
router.use('/reading-submissions', readingSubmissionRoutes);

module.exports = router;