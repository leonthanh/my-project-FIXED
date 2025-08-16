const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Sequelize model

// Đăng ký
router.post('/register', async (req, res) => {
  const { name, phone, role } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  try {
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
    }

    const newUser = await User.create({ name, phone, role: role || 'student' });
    res.json({ user: newUser });

  } catch (err) {
    console.error('❌ Lỗi khi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng ký' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { name, phone, role } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Thiếu thông tin' });
  }

  try {
    let user = await User.findOne({ where: { phone } });

    // Nếu chưa có user, tạo mới
    if (!user) {
      user = await User.create({ name, phone, role: role || 'student' });
    }

    res.json({ message: 'Đăng nhập thành công', user });

  } catch (err) {
    console.error('❌ Lỗi khi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
  }
});

module.exports = router;
