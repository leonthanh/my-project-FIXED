const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op, fn, col } = require('sequelize');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const WritingTest = require('../models/WritingTests');
const ReadingTest = require('../models/ReadingTest');
const ListeningTest = require('../models/ListeningTest');
const Submission = require('../models/Submission');             // writing
const ReadingSubmission = require('../models/ReadingSubmission');
const ListeningSubmission = require('../models/ListeningSubmission');
const CambridgeListening = require('../models/CambridgeListening');
const CambridgeReading = require('../models/CambridgeReading');
const CambridgeSubmission = require('../models/CambridgeSubmission');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { logError } = require('../logger');

const toPlain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : record);

const getCountValue = (row) => Number(row?.count ?? row?.dataValues?.count ?? 0);

const buildCountMap = (rows = [], keyBuilder) =>
  rows.reduce((map, row) => {
    map.set(String(keyBuilder(row)), getCountValue(row));
    return map;
  }, new Map());

const getIxStatus = (test = {}) => (test.isArchived ? 'archived' : 'published');
const isIxHiddenFromStudents = (test = {}) => Boolean(test.isArchived);
const getCambridgeStatus = (test = {}) => String(test.status || 'draft').trim().toLowerCase() || 'draft';
const isCambridgeHiddenFromStudents = (test = {}) => getCambridgeStatus(test) !== 'published';

const formatIxWritingTitle = (test = {}) => `IX Writing ${test.index || test.id}`;
const formatIxListeningTitle = (test = {}) => `IX Listening ${test.id}`;

const formatCambridgeTypeLabel = (testType = '', category = '') => {
  const normalizedType = String(testType || '').trim().toLowerCase();
  if (normalizedType === 'pet-writing') return 'PET Writing';

  const [level = 'cambridge', skill = category || 'reading'] = normalizedType.split('-');
  const levelLabel = level.toUpperCase();
  const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
  return `${levelLabel} ${skillLabel}`;
};

const buildWritingTestPayload = (test, submissionCount = 0, scope = 'ix-writing') => ({
  id: test.id,
  title: formatIxWritingTitle(test),
  classCode: test.classCode || '',
  teacherName: test.teacherName || '',
  testType: test.testType || 'writing',
  index: test.index || null,
  createdAt: test.createdAt,
  updatedAt: test.updatedAt,
  submissionCount,
  status: getIxStatus(test),
  hiddenFromStudents: isIxHiddenFromStudents(test),
  deleteScope: scope,
});

const buildReadingTestPayload = (test, submissionCount = 0) => ({
  id: test.id,
  title: test.title || `IX Reading ${test.id}`,
  classCode: test.classCode || '',
  teacherName: test.teacherName || '',
  createdAt: test.createdAt,
  updatedAt: test.updatedAt,
  submissionCount,
  status: getIxStatus(test),
  hiddenFromStudents: isIxHiddenFromStudents(test),
  deleteScope: 'ix-reading',
});

const buildListeningTestPayload = (test, submissionCount = 0) => ({
  id: test.id,
  title: formatIxListeningTitle(test),
  classCode: test.classCode || '',
  teacherName: test.teacherName || '',
  createdAt: test.createdAt,
  updatedAt: test.updatedAt,
  submissionCount,
  status: getIxStatus(test),
  hiddenFromStudents: isIxHiddenFromStudents(test),
  deleteScope: 'ix-listening',
});

const buildCambridgeTestPayload = (test, submissionCount = 0, category = 'reading') => ({
  id: test.id,
  title: test.title || formatCambridgeTypeLabel(test.testType, category),
  classCode: test.classCode || '',
  teacherName: test.teacherName || '',
  testType: test.testType || '',
  category,
  status: getCambridgeStatus(test),
  totalQuestions: test.totalQuestions || 0,
  createdAt: test.createdAt,
  updatedAt: test.updatedAt,
  submissionCount,
  hiddenFromStudents: isCambridgeHiddenFromStudents(test),
  deleteScope: `cambridge-${category}`,
  typeLabel: formatCambridgeTypeLabel(test.testType, category),
});

const resolveAdminTestScope = (scope) => {
  switch (String(scope || '').toLowerCase()) {
    case 'ix-writing':
      return {
        Model: WritingTest,
        label: 'đề IX Writing',
        extraGuard: (test) => String(test.testType || '').toLowerCase() !== 'pet-writing',
        visibilityField: 'isArchived',
      };
    case 'ix-reading':
      return {
        Model: ReadingTest,
        label: 'đề IX Reading',
        visibilityField: 'isArchived',
      };
    case 'ix-listening':
      return {
        Model: ListeningTest,
        label: 'đề IX Listening',
        visibilityField: 'isArchived',
      };
    case 'cambridge-writing':
      return {
        Model: WritingTest,
        label: 'đề Cambridge Writing',
        extraGuard: (test) => String(test.testType || '').toLowerCase() === 'pet-writing',
        visibilityField: 'isArchived',
      };
    case 'cambridge-reading':
      return {
        Model: CambridgeReading,
        label: 'đề Cambridge Reading',
        visibilityField: 'status',
      };
    case 'cambridge-listening':
      return {
        Model: CambridgeListening,
        label: 'đề Cambridge Listening',
        visibilityField: 'status',
      };
    default:
      return null;
  }
};

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

    user.password = newPassword; // beforeUpdate hook in User.js will hash it
    await user.save();

    // Huỷ tất cả refresh token cũ → bắt buộc đăng nhập lại
    await RefreshToken.destroy({ where: { userId: user.id } });

    res.json({ message: `Đã đặt lại mật khẩu cho "${user.name}".` });
  } catch (err) {
    logError('Lỗi đổi mật khẩu', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/users/bulk — xóa nhiều user cùng lúc
router.delete('/users/bulk', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Thiếu danh sách ids.' });
    // Không cho xóa chính mình
    const safeIds = ids.filter((id) => String(id) !== String(req.user.id)).map(Number);
    if (safeIds.length === 0) return res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình.' });

    await RefreshToken.destroy({ where: { userId: safeIds } });
    await Submission.update({ userId: null }, { where: { userId: safeIds } });
    await ReadingSubmission.destroy({ where: { userId: safeIds } });
    await ListeningSubmission.destroy({ where: { userId: safeIds } });
    await CambridgeSubmission.destroy({ where: { userId: safeIds } });
    const deleted = await User.destroy({ where: { id: safeIds } });

    res.json({ message: `Đã xóa ${deleted} người dùng và toàn bộ dữ liệu liên quan.`, deleted });
  } catch (err) {
    logError('Lỗi xóa bulk user', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/submissions/bulk — xóa nhiều bài làm cùng lúc
// body: { items: [{type: 'reading', id: 5}, ...] }
router.delete('/submissions/bulk', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Thiếu danh sách items.' });
    const modelMap = { writing: Submission, reading: ReadingSubmission, listening: ListeningSubmission, cambridge: CambridgeSubmission };
    let deleted = 0;
    for (const { type, id } of items) {
      const Model = modelMap[type];
      if (!Model) continue;
      deleted += await Model.destroy({ where: { id } });
    }
    res.json({ message: `Đã xóa ${deleted} bài làm.`, deleted });
  } catch (err) {
    logError('Lỗi xóa bulk submission', err);
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

// GET /api/admin/tests — consolidated test management payload for admin UI
router.get('/tests', requireAuth, requireRole('admin'), async (_req, res) => {
  try {
    const [
      writingTests,
      readingTests,
      listeningTests,
      cambridgeReadingTests,
      cambridgeListeningTests,
      writingSubmissionCounts,
      readingSubmissionCounts,
      listeningSubmissionCounts,
      cambridgeSubmissionCounts,
    ] = await Promise.all([
      WritingTest.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'index', 'testType', 'classCode', 'teacherName', 'isArchived', 'createdAt', 'updatedAt'],
      }),
      ReadingTest.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'title', 'classCode', 'teacherName', 'isArchived', 'createdAt', 'updatedAt'],
      }),
      ListeningTest.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'classCode', 'teacherName', 'isArchived', 'createdAt', 'updatedAt'],
      }),
      CambridgeReading.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'title', 'classCode', 'teacherName', 'testType', 'totalQuestions', 'status', 'createdAt', 'updatedAt'],
      }),
      CambridgeListening.findAll({
        order: [['createdAt', 'DESC']],
        attributes: ['id', 'title', 'classCode', 'teacherName', 'testType', 'totalQuestions', 'status', 'createdAt', 'updatedAt'],
      }),
      Submission.findAll({
        attributes: ['testId', [fn('COUNT', col('id')), 'count']],
        where: {
          testId: { [Op.ne]: null },
          [Op.or]: [{ isDraft: false }, { isDraft: null }],
        },
        group: ['testId'],
        raw: true,
      }),
      ReadingSubmission.findAll({
        attributes: ['testId', [fn('COUNT', col('id')), 'count']],
        group: ['testId'],
        raw: true,
      }),
      ListeningSubmission.findAll({
        attributes: ['testId', [fn('COUNT', col('id')), 'count']],
        group: ['testId'],
        raw: true,
      }),
      CambridgeSubmission.findAll({
        attributes: ['testId', 'testType', [fn('COUNT', col('id')), 'count']],
        group: ['testId', 'testType'],
        raw: true,
      }),
    ]);

    const writingCountMap = buildCountMap(writingSubmissionCounts, (row) => row.testId);
    const readingCountMap = buildCountMap(readingSubmissionCounts, (row) => row.testId);
    const listeningCountMap = buildCountMap(listeningSubmissionCounts, (row) => row.testId);
    const cambridgeCountMap = buildCountMap(
      cambridgeSubmissionCounts,
      (row) => `${String(row.testType || '').toLowerCase()}:${row.testId}`
    );

    const plainWritingTests = writingTests.map(toPlain);
    const ixWriting = plainWritingTests
      .filter((test) => String(test.testType || '').toLowerCase() !== 'pet-writing')
      .map((test) => buildWritingTestPayload(test, writingCountMap.get(String(test.id)) || 0, 'ix-writing'));

    const cambridgeWriting = plainWritingTests
      .filter((test) => String(test.testType || '').toLowerCase() === 'pet-writing')
      .map((test) => ({
        ...buildWritingTestPayload(test, writingCountMap.get(String(test.id)) || 0, 'cambridge-writing'),
        category: 'writing',
        typeLabel: 'PET Writing',
        totalQuestions: 0,
      }));

    const ixReading = readingTests
      .map(toPlain)
      .map((test) => buildReadingTestPayload(test, readingCountMap.get(String(test.id)) || 0));

    const ixListening = listeningTests
      .map(toPlain)
      .map((test) => buildListeningTestPayload(test, listeningCountMap.get(String(test.id)) || 0));

    const cambridge = [
      ...cambridgeWriting,
      ...cambridgeReadingTests.map(toPlain).map((test) =>
        buildCambridgeTestPayload(
          test,
          cambridgeCountMap.get(`${String(test.testType || '').toLowerCase()}:${test.id}`) || 0,
          'reading'
        )
      ),
      ...cambridgeListeningTests.map(toPlain).map((test) =>
        buildCambridgeTestPayload(
          test,
          cambridgeCountMap.get(`${String(test.testType || '').toLowerCase()}:${test.id}`) || 0,
          'listening'
        )
      ),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ ixWriting, ixReading, ixListening, cambridge });
  } catch (err) {
    logError('Lỗi lấy danh sách đề thi admin', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PATCH /api/admin/tests/:scope/:id/visibility — hide/show a test from student lists without deleting data
router.patch('/tests/:scope/:id/visibility', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { scope } = req.params;
    const testId = Number(req.params.id);
    const hidden = req.body?.hidden;

    if (!Number.isFinite(testId) || testId <= 0) {
      return res.status(400).json({ message: 'ID đề thi không hợp lệ.' });
    }

    if (typeof hidden !== 'boolean') {
      return res.status(400).json({ message: 'Thiếu trạng thái ẩn/hiện hợp lệ.' });
    }

    const target = resolveAdminTestScope(scope);
    if (!target) {
      return res.status(400).json({ message: 'Loại đề thi không hợp lệ.' });
    }

    const test = await target.Model.findByPk(testId);
    if (!test || (typeof target.extraGuard === 'function' && !target.extraGuard(test))) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi.' });
    }

    if (target.visibilityField === 'status') {
      await test.update({ status: hidden ? 'archived' : 'published' });
    } else {
      await test.update({ isArchived: hidden });
    }

    const normalizedStatus = target.visibilityField === 'status'
      ? getCambridgeStatus(test)
      : getIxStatus(test);

    res.json({
      message: hidden
        ? `${target.label} đã được ẩn khỏi danh sách học sinh.`
        : `${target.label} đã hiển thị lại cho học sinh.`,
      test: {
        id: testId,
        deleteScope: scope,
        hiddenFromStudents: hidden,
        status: normalizedStatus,
      },
    });
  } catch (err) {
    logError('Lỗi cập nhật trạng thái hiển thị đề thi admin', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/admin/tests/:scope/:id — delete a test by admin-only scope
router.delete('/tests/:scope/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { scope } = req.params;
    const testId = Number(req.params.id);
    if (!Number.isFinite(testId) || testId <= 0) {
      return res.status(400).json({ message: 'ID đề thi không hợp lệ.' });
    }

    const target = resolveAdminTestScope(scope);
    if (!target) {
      return res.status(400).json({ message: 'Loại đề thi không hợp lệ.' });
    }

    const test = await target.Model.findByPk(testId);
    if (!test || (typeof target.extraGuard === 'function' && !target.extraGuard(test))) {
      return res.status(404).json({ message: 'Không tìm thấy đề thi.' });
    }

    await test.destroy();

    res.json({
      message: `Đã xóa ${target.label}.`,
      deletedId: testId,
      scope,
    });
  } catch (err) {
    logError('Lỗi xóa đề thi admin', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/admin/submissions?userId=123
router.get('/submissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'Thiếu userId.' });
    const uid = parseInt(userId, 10);

    const [writing, reading, listening, cambridge] = await Promise.all([
      Submission.findAll({
        where: {
          userId: uid,
          [Op.or]: [{ isDraft: false }, { isDraft: null }],
        },
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
