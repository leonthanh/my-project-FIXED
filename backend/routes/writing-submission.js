const express = require('express');
const router = express.Router();
const { Submission, WritingTest, User } = require('../models'); // ✅ Lấy từ index.js
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

/**
 * ✅ Học sinh gửi bài viết
 */
router.post('/submit', async (req, res) => {
  try {
    const { task1, task2, timeLeft, user, testId } = req.body;

    if (!testId) {
      return res.status(400).json({ message: '❌ Không có mã đề để nộp.' });
    }

    // Look up user from DB by ID rather than trusting the client-supplied object.
    // This prevents N/A when the client's localStorage is stale, missing, or spoofed.
    const userId = user?.id || null;
    let userName = 'N/A';
    let userPhone = 'N/A';
    if (userId) {
      const dbUser = await User.findByPk(userId, { attributes: ['name', 'phone'] });
      if (dbUser) {
        userName = dbUser.name;
        userPhone = dbUser.phone;
      }
    }

    // Lưu submission
    const newSubmission = await Submission.create({
      task1,
      task2,
      timeLeft,
      userName,
      userPhone,
      testId,
      userId,
      feedbackSeen: false,
      submittedAt: new Date()
    });

    // Lấy thông tin đề
    const writingTest = await WritingTest.findByPk(testId);
    const index = writingTest?.index || 'Chưa rõ';
    const classCode = writingTest?.classCode || 'N/A';
    const teacherName = writingTest?.teacherName || 'N/A';
    const testType = writingTest?.testType || 'writing';
    const label = testType === 'pet-writing' ? 'PET Writing' : 'Writing';

    // Gửi email — chọn transporter theo biến môi trường. Nếu deploy trên cPanel
    // thường nên dùng SMTP do host cung cấp hoặc dùng sendmail nếu có.
    try {
      let transporter;

      // Prefer explicit SMTP settings (recommended for cPanel)
      if (process.env.SMTP_HOST) {
        const smtpOpts = {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: (process.env.SMTP_SECURE === 'true') || (process.env.SMTP_PORT == 465),
        };
        // only set auth when both user and pass are provided (avoid empty creds causing PLAIN error)
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
          smtpOpts.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
        }
        // allow self-signed certs in some shared hosting setups (optional)
        if (process.env.SMTP_TLS_REJECT === 'false') smtpOpts.tls = { rejectUnauthorized: false };

        transporter = nodemailer.createTransport(smtpOpts);
        console.log('ℹ️ Using SMTP transport:', { host: smtpOpts.host, port: smtpOpts.port, secure: smtpOpts.secure });
      } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Fallback to Gmail service (works locally with app password)
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        console.log('ℹ️ Using Gmail transport (service).');
      } else {
        // Last resort: try sendmail on host (cPanel often supports sendmail)
        transporter = nodemailer.createTransport({ sendmail: true });
        console.log('ℹ️ Using sendmail transport as fallback.');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`,
        to: process.env.EMAIL_TO,
        subject: `📨 Bài viết mới từ ${user?.name || 'N/A'} – ${label} ${index} – ${classCode} – ${teacherName}`,
        html: `
          <p><strong>👤 Học sinh:</strong> ${user?.name || 'N/A'}</p>
          <p><strong>📞 Số điện thoại:</strong> ${user?.phone || 'N/A'}</p>
          <p><strong>📝 Mã đề:</strong> ${label} ${index}</p>
          <p><strong>🏫 Mã lớp:</strong> ${classCode}</p>
          <p><strong>👨‍🏫 Giáo viên ra đề:</strong> ${teacherName}</p>
          <h2>Task 1</h2>
          <p>${(task1 || '').replace(/\n/g, '<br>')}</p>
          <h2>Task 2</h2>
          <p>${(task2 || '').replace(/\n/g, '<br>')}</p>
          <p><b>⏳ Thời gian còn lại:</b> ${Math.floor(timeLeft / 60)} phút ${timeLeft % 60} giây</p>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email đã gửi thành công!', info && info.messageId ? info.messageId : 'no-message-id');
    } catch (emailErr) {
      // Log full error for server-side debugging (check logs on cPanel)
      console.error('❌ Lỗi gửi email:', emailErr && (emailErr.stack || emailErr));
      // optionally return error information in response when in non-production
      if (process.env.NODE_ENV !== 'production') {
        // attach email error to response message for easier debugging
        return res.status(500).json({ message: '❌ Lỗi khi gửi email (xem logs)', emailError: (emailErr && (emailErr.message || emailErr)) });
      }
    }

    res.json({ message: '✅ Bài viết đã được lưu và gửi email!' });
  } catch (err) {
    console.error('❌ Lỗi khi submit bài:', err);
    res.status(500).json({ message: '❌ Server error khi lưu bài viết' });
  }
});

/**
 * ✅ Lấy danh sách bài viết
 */
router.get('/list', async (req, res) => {
  try {
    const where = {};
    if (req.query.phone) {
      where.userPhone = req.query.phone;
    }

    let submissions;
    try {
      submissions = await Submission.findAll({
        where,
        include: [
          { model: WritingTest, attributes: ['index', 'classCode', 'teacherName', 'task1Image', 'task1', 'task2', 'testType'] },
          { model: User, attributes: ['name', 'phone'] }
        ],
        order: [['createdAt', 'DESC']],
      });
    } catch (includeErr) {
      console.error('⚠️ GET /writing/list include failed; falling back to plain submissions query:', includeErr);
      submissions = await Submission.findAll({
        where,
        order: [['createdAt', 'DESC']],
      });
    }

    // Đảm bảo trả về mảng, tránh null → fix lỗi e.find is not a function
    const result = Array.isArray(submissions) ? submissions.map(s => ({
      ...s.toJSON(),
      user: s.User || null,
      WritingTest: s.WritingTest || null,
      User: s.User || null,
    })) : [];

    res.json(result);
  } catch (err) {
    console.error('❌ Lỗi lấy danh sách:', err);
    res.status(500).json({ message: '❌ Server error khi lấy submissions' });
  }
});

/**
 * ✅ Giáo viên gửi nhận xét
 */
router.post('/comment', async (req, res) => {
  try {
    const { submissionId, feedback, teacherName } = req.body;

    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    submission.feedback = feedback;
    submission.feedbackBy = teacherName;
    submission.feedbackAt = new Date();
    submission.feedbackSeen = false;
    await submission.save();

    res.json({ message: '✅ Nhận xét đã được lưu thành công' });
  } catch (err) {
    console.error('❌ Lỗi khi lưu nhận xét:', err);
    res.status(500).json({ message: '❌ Server error khi lưu nhận xét' });
  }
});

/**
 * ✅ Học sinh đánh dấu đã xem nhận xét
 */
router.post('/mark-feedback-seen', async (req, res) => {
  try {
    const { phone, ids } = req.body;

    let where = {};
    if (phone) where.userPhone = phone;
    if (ids?.length > 0) where.id = { [Op.in]: ids };

    const updated = await Submission.update(
      { feedbackSeen: true },
      { where }
    );

    res.json({ message: '✅ Đã đánh dấu là đã xem', updated });
  } catch (err) {
    console.error('❌ Lỗi khi đánh dấu đã xem:', err);
    res.status(500).json({ message: '❌ Server error khi đánh dấu đã xem' });
  }
});

module.exports = router;

// Debug route: quick SMTP test (GET /api/writing-submission/email-test)
// Use this to verify SMTP/sendmail configuration on the server.
router.get('/email-test', async (req, res) => {
  try {
    // reuse transporter selection logic
    let transporter;
    if (process.env.SMTP_HOST) {
      const smtpOpts = {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: (process.env.SMTP_SECURE === 'true') || (process.env.SMTP_PORT == 465),
      };
      // only set auth when both user and pass are provided to avoid Missing credentials for "PLAIN"
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        smtpOpts.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
      }
      if (process.env.SMTP_TLS_REJECT === 'false') smtpOpts.tls = { rejectUnauthorized: false };
      transporter = nodemailer.createTransport(smtpOpts);
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    } else {
      transporter = nodemailer.createTransport({ sendmail: true });
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@${req.hostname}`,
      to: process.env.EMAIL_TO,
      subject: 'Test email từ hệ thống',
      text: 'Đây là email kiểm tra cấu hình SMTP/sendmail.'
    });

    res.json({ ok: true, info });
  } catch (err) {
    console.error('Email test error:', err && (err.stack || err));
    res.status(500).json({ ok: false, error: err && (err.message || err) });
  }
});
