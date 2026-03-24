const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Submission = require('../models/Submission');             // writing
const ReadingSubmission = require('../models/ReadingSubmission');
const ListeningSubmission = require('../models/ListeningSubmission');
const CambridgeSubmission = require('../models/CambridgeSubmission');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { logError } = require('../logger');

// ─────────────────────────────────────────────────────────
//  USERS
// ─────────────────────────────────────────────────────────

// GET /api/admin/users?search=&role=
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { search = '', role } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
      ];
    }
    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'phone', 'email', 'role', 'canManageTests', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json(users);
  } catch (err) {
    logError('Lỗi lấy danh sách user', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PATCH /api/admin/users/:id — update name / email / phone / role / canManageTests
router.patch('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: 'Không thể tự sửa thông tin của chính mình qua trang này.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const { name, email, phone, role, canManageTests } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = String(email).trim() || null;
    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (trimmedPhone !== user.phone) {
        const existing = await User.findOne({ where: { phone: trimmedPhone } });
        if (existing) return res.status(409).json({ message: 'Số điện thoại đã tồn tại.' });
      }
      updates.phone = trimmedPhone;
    }
    if (role !== undefined && ['student', 'teacher', 'admin'].includes(role)) updates.role = role;
    if (canManageTests !== undefined) updates.canManageTests = !!canManageTests;

    await user.update(updates);
    const updated = user.toJSON();
    delete updated.password;
    res.json({ message: 'Cập nhật thành công.', user: updated });
  } catch (err) {
    logError('Lỗi cập nhật user', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PATCH /api/admin/users/:id/password — admin đặt lại mật khẩu cho user
router.patch('/users/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Huỷ tất cả refresh token cũ → bắt buộc đăng nhập lại
    await RefreshToken.destroy({ where: { userId: user.id } });

    res.json({ message: `Đã đặt lại mật khẩu cho "${user.name}".` });
  } catch (err) {
    logError('Lỗi đổi mật khẩu', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/users/:id — xóa user + toàn bộ dữ liệu liên quan
router.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'Không thể tự xóa tài khoản của chính mình.' });
    }
    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    // Xóa cascade thủ công
    await RefreshToken.destroy({ where: { userId: targetId } });
    await Submission.update({ userId: null }, { where: { userId: targetId } }); // giữ bài writing (SET NULL)
    await ReadingSubmission.destroy({ where: { userId: targetId } });
    await ListeningSubmission.destroy({ where: { userId: targetId } });
    await CambridgeSubmission.destroy({ where: { userId: targetId } });

    const userName = user.name;
    await user.destroy();

    res.json({ message: `Đã xóa người dùng "${userName}" và toàn bộ dữ liệu liên quan.` });
  } catch (err) {
    logError('Lỗi xóa user', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/admin/users/duplicates — tìm user có tên giống nhau
router.get('/users/duplicates', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'phone', 'email', 'role', 'createdAt'],
      order: [['name', 'ASC']],
    });
    // Nhóm theo tên (trim, lowercase)
    const groups = {};
    for (const u of users) {
      const key = u.name.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(u.toJSON());
    }
    const duplicates = Object.values(groups).filter((g) => g.length > 1);
    res.json(duplicates);
  } catch (err) {
    logError('Lỗi tìm trùng', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// ─────────────────────────────────────────────────────────
//  SUBMISSIONS
// ─────────────────────────────────────────────────────────

// GET /api/admin/submissions?userId=123
router.get('/submissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'Thiếu userId.' });
    const uid = parseInt(userId, 10);

    const [writing, reading, listening, cambridge] = await Promise.all([
      Submission.findAll({
        where: { userId: uid },
        order: [['createdAt', 'DESC']],
        limit: 100,
        attributes: ['id', 'userName', 'userPhone', 'testId', 'feedback', 'createdAt'],
      }),
      ReadingSubmission.findAll({
        where: { userId: uid },
        order: [['createdAt', 'DESC']],
        limit: 100,
        attributes: ['id', 'userName', 'testId', 'correct', 'total', 'band', 'createdAt'],
      }),
      ListeningSubmission.findAll({
        where: { userId: uid },
        order: [['createdAt', 'DESC']],
        limit: 100,
        attributes: ['id', 'userName', 'testId', 'correct', 'total', 'band', 'createdAt'],
      }),
      CambridgeSubmission.findAll({
        where: { userId: uid },
        order: [['createdAt', 'DESC']],
        limit: 100,
        attributes: ['id', 'studentName', 'testId', 'testType', 'score', 'totalQuestions', 'percentage', 'createdAt'],
      }),
    ]);

    res.json({ writing, reading, listening, cambridge });
  } catch (err) {
    logError('Lỗi lấy submissions', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/submissions/writing/:id
router.delete('/submissions/writing/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const n = await Submission.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Không tìm thấy bài làm.' });
    res.json({ message: 'Đã xóa bài làm Writing.' });
  } catch (err) {
    logError('Lỗi xóa writing submission', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/submissions/reading/:id
router.delete('/submissions/reading/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const n = await ReadingSubmission.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Không tìm thấy bài làm.' });
    res.json({ message: 'Đã xóa bài làm Reading.' });
  } catch (err) {
    logError('Lỗi xóa reading submission', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/submissions/listening/:id
router.delete('/submissions/listening/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const n = await ListeningSubmission.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Không tìm thấy bài làm.' });
    res.json({ message: 'Đã xóa bài làm Listening.' });
  } catch (err) {
    logError('Lỗi xóa listening submission', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/submissions/cambridge/:id
router.delete('/submissions/cambridge/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const n = await CambridgeSubmission.destroy({ where: { id: req.params.id } });
    if (!n) return res.status(404).json({ message: 'Không tìm thấy bài làm.' });
    res.json({ message: 'Đã xóa bài làm Cambridge.' });
  } catch (err) {
    logError('Lỗi xóa cambridge submission', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
