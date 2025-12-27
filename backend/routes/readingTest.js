const express = require('express');
const router = express.Router();
const ReadingTest = require('../models/ReadingTest');

// Get all reading tests
router.get('/', async (req, res) => {
  try {
    const tests = await ReadingTest.findAll({ order: [['createdAt', 'DESC']] });
    // Parse passages JSON if it's a string
    const parsed = tests.map(test => {
      const data = test.toJSON();
      if (typeof data.passages === 'string') {
        data.passages = JSON.parse(data.passages);
      }
      return data;
    });
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single reading test by id
router.get('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    const data = test.toJSON();
    if (typeof data.passages === 'string') {
      data.passages = JSON.parse(data.passages);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new reading test
router.post('/', async (req, res) => {
  const { title, classCode, teacherName, passages } = req.body;

  try {
    const newTest = await ReadingTest.create({
      title,
      classCode,
      teacherName,
      passages
    });
    res.status(201).json({ message: '✅ Đã tạo đề Reading thành công!', test: newTest });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a reading test
router.put('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.update(req.body);
    const data = test.toJSON();
    if (typeof data.passages === 'string') {
      data.passages = JSON.parse(data.passages);
    }
    res.json({ message: '✅ Đã cập nhật đề Reading thành công!', test: data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Submit answers for a reading test and compute score
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body && req.body.answers ? req.body.answers : {};

    const test = await ReadingTest.findByPk(id);
    if (!test) return res.status(404).json({ message: 'Cannot find test' });

    // Normalize test passages
    const data = test.toJSON();
    const passages = typeof data.passages === 'string' ? JSON.parse(data.passages) : data.passages || [];

    // Use scorer helper
    const { scoreReadingTest } = require('../utils/readingScorer');
    const result = scoreReadingTest({ passages }, answers || {});

    // Store submission to DB
    try {
      const ReadingSubmission = require('../models/ReadingSubmission');
      const sub = await ReadingSubmission.create({
        testId: id,
        userName: req.body.studentName || (req.body.user && req.body.user.name) || 'Unknown',
        userId: req.body.user && req.body.user.id ? req.body.user.id : null,
        answers: answers || {},
        correct: result.correct,
        total: result.total,
        band: result.band,
        scorePercentage: result.scorePercentage
      });

      console.log(`✅ Saved reading submission id=${sub.id} (test=${id}, user=${sub.userName})`);

      // Try sending notification email (non-blocking for response)
      try {
        const nodemailer = require('nodemailer');
        let transporter;
        if (process.env.SMTP_HOST) {
          const smtpOpts = {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: (process.env.SMTP_SECURE === 'true') || (process.env.SMTP_PORT == 465),
          };
          if (process.env.SMTP_USER && process.env.SMTP_PASS) smtpOpts.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
          if (process.env.SMTP_TLS_REJECT === 'false') smtpOpts.tls = { rejectUnauthorized: false };
          transporter = nodemailer.createTransport(smtpOpts);
          console.log('ℹ️ Using SMTP transport for reading submission email');
        } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
          console.log('ℹ️ Using Gmail transport for reading submission email');
        } else {
          transporter = nodemailer.createTransport({ sendmail: true });
          console.log('ℹ️ Using sendmail transport (fallback) for reading submission email');
        }

        const mailOptions = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`,
          to: process.env.EMAIL_TO,
          subject: `📨 Reading submission from ${sub.userName} — test ${id}`,
          html: `
            <p><strong>👤 Học sinh:</strong> ${sub.userName}</p>
            <p><strong>📝 Test ID:</strong> ${id}</p>
            <p><strong>✅ Correct / Total:</strong> ${result.correct} / ${result.total}</p>
            <p><strong>🔢 Band (IDP):</strong> ${result.band} — ${result.scorePercentage}%</p>
            <p>Submission ID: <b>${sub.id}</b></p>
            <p><a href="${req.protocol}://${req.get('host')}/admin">Mở trang quản trị để xem chi tiết</a></p>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reading submission email sent', info && info.messageId ? info.messageId : 'no-message-id');
      } catch (emailErr) {
        console.error('❌ Error sending reading submission email:', emailErr && (emailErr.stack || emailErr));
      }

      return res.json({ submissionId: sub.id, ...result });
    } catch (e) {
      console.error('Error saving submission:', e);
      // Still return result if DB save fails
      return res.json(result);
    }

  } catch (err) {
    console.error('Error scoring reading test:', err);
    res.status(500).json({ message: err.message });
  }
});

// Delete a reading test
router.delete('/:id', async (req, res) => {
  try {
    const test = await ReadingTest.findByPk(req.params.id);
    if (!test) {
      return res.status(404).json({ message: 'Cannot find test' });
    }
    await test.destroy();
    res.json({ message: 'Deleted Test' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
