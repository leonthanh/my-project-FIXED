const express = require('express');
const catalogRouter = require('./catalog/router');
const flyersReadingRouter = require('./flyers/reading/router');
const listeningRouter = require('./listening/router');
const maintenanceRouter = require('./maintenance/router');
const moversReadingRouter = require('./movers/reading/router');
const readingRouter = require('./reading/router');
const startersReadingRouter = require('./starters/reading/router');
const submissionsRouter = require('./submissions/router');

const router = express.Router();

router.use('/flyers', flyersReadingRouter);
router.use('/movers', moversReadingRouter);
router.use('/starters', startersReadingRouter);
router.use('/', catalogRouter);
router.use('/admin', maintenanceRouter);
router.use('/', listeningRouter);
router.use('/', readingRouter);
router.use('/', submissionsRouter);

module.exports = router;