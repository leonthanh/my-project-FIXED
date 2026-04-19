const express = require('express');
const { listCambridgeTestsHandler } = require('./controller');

const router = express.Router();

router.get('/', listCambridgeTestsHandler);

module.exports = router;