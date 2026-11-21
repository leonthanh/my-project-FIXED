const express = require('express');
const path = require('path');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { AppError } = require('../utils/AppError');

const REPORT_FILES = new Map([
  ['general', path.join(__dirname, '..', 'private', 'progress-reports', 'progress-report.html')],
  ['ielts', path.join(__dirname, '..', 'private', 'progress-reports', 'ielts-progress-report.html')],
]);

const router = express.Router();

router.get('/:reportId', requireAuth, requireRole('teacher', 'admin'), (req, res, next) => {
  const reportPath = REPORT_FILES.get(req.params.reportId);
  if (!reportPath) return next(AppError.notFound('Progress report not found'));

  res.set('Cache-Control', 'private, no-store');
  res.sendFile(reportPath, (error) => {
    if (error) next(error);
  });
});

module.exports = router;
