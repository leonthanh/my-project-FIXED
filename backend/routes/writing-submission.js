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

    // Lưu submission
    const newSubmission = await Submission.create({
      task1,
      task2,
      timeLeft,
      userName: user?.name || 'N/A',
      userPhone: user?.phone || 'N/A',
      testId,
      userId: user?.id || null,
      feedbackSeen: false,
      submittedAt: new Date()
    });

    // Lấy thông tin đề
    const writingTest = await WritingTest.findByPk(testId);
    const index = writingTest?.index || 'Chưa rõ';
    const classCode = writingTest?.classCode || 'N/A';
    const teacherName = writingTest?.teacherName || 'N/A';

    // Gửi email
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: `📨 Bài viết mới từ ${user?.name || 'N/A'} – Writing ${index} – ${classCode} – ${teacherName}`,
        html: `
          <p><strong>👤 Học sinh:</strong> ${user?.name || 'N/A'}</p>
          <p><strong>📞 Số điện thoại:</strong> ${user?.phone || 'N/A'}</p>
          <p><strong>📝 Mã đề:</strong> Writing ${index}</p>
          <p><strong>🏫 Mã lớp:</strong> ${classCode}</p>
          <p><strong>👨‍🏫 Giáo viên ra đề:</strong> ${teacherName}</p>
          <h2>Task 1</h2>
          <p>${(task1 || '').replace(/\n/g, '<br>')}</p>
          <h2>Task 2</h2>
          <p>${(task2 || '').replace(/\n/g, '<br>')}</p>
          <p><b>⏳ Thời gian còn lại:</b> ${Math.floor(timeLeft / 60)} phút ${timeLeft % 60} giây</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email đã gửi thành công!');
    } catch (emailErr) {
      console.error('❌ Lỗi gửi email:', emailErr);
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

    const submissions = await Submission.findAll({
      where,
      include: [
  { model: WritingTest, attributes: ['index', 'classCode', 'teacherName', 'task1Image', 'task1', 'task2'] },
  { model: User, attributes: ['name', 'phone'] }
],

      order: [['createdAt', 'DESC']],
    });

    // Đảm bảo trả về mảng, tránh null → fix lỗi e.find is not a function
    const result = Array.isArray(submissions) ? submissions.map(s => ({
      ...s.toJSON(),
      user: s.User || null
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
