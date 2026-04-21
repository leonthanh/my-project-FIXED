const express = require('express');
const writingTestsRoute = require('../../routes/writingTest');
const writingSubmissionRoutes = require('../../routes/writing-submission');

const router = express.Router();

router.use('/writing-tests', writingTestsRoute);
router.use('/writing', writingSubmissionRoutes);

module.exports = router;