const express = require('express');
const { recalculateCambridgeTotalQuestionsHandler } = require('./controller');

const router = express.Router();

router.post('/recalculate-total-questions', recalculateCambridgeTotalQuestionsHandler);

module.exports = router;