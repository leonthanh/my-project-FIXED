const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Sequelize model

// Đăng ký
router.post('/register', async (req, res) => {
  const { name, phone, password, role } = req.body; // ✅ Thêm password

  if (!name || !phone || !password) { // ✅ Yêu cầu password khi đăng ký
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên, số điện thoại và mật khẩu.' });
  }

  try {
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({ message: 'Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.' });
    }

    // ✅ Tạo người dùng mới với mật khẩu
    const newUser = await User.create({ name, phone, password, role: role || 'student' });
    
    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res.status(201).json({ user: userResponse, message: 'Đăng ký thành công!' }); // ✅ Trả về 201 Created

  } catch (err) {
    console.error('❌ Lỗi khi đăng ký:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng ký.' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  const { phone, password } = req.body; // ✅ Chỉ cần phone và password để đăng nhập

  if (!phone || !password) { // ✅ Yêu cầu phone và password
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu.' });
  }

  try {
    const user = await User.findOne({ where: { phone } });

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      return res.status(404).json({ message: 'Số điện thoại không tồn tại. Vui lòng đăng ký.' });
    }

    // ✅ So sánh mật khẩu
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu không đúng.' }); // 401 Unauthorized
    }
    
    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ message: 'Đăng nhập thành công', user: userResponse });

  } catch (err) {
    console.error('❌ Lỗi khi đăng nhập:', err);
    res.status(500).json({ message: 'Lỗi server khi đăng nhập.' });
  }
});

module.exports = router;