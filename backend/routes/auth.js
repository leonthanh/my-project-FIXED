const express = require("express");
const router = express.Router();
const User = require("../models/User"); // Sequelize model
const { logError } = require("../logger"); // ✅ Import logger

// ✅ Import Twilio (cần cài: npm install twilio)
// const twilio = require("twilio");
// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
// const client = twilio(accountSid, authToken);

// Lưu OTP tạm thời (trong thực tế nên dùng Redis)
const otpStore = new Map();
// Đăng ký
router.post("/register", async (req, res) => {
  const { name, phone, password, role } = req.body; // ✅ Thêm password

  if (!name || !phone || !password) {
    // ✅ Yêu cầu password khi đăng ký
    return res.status(400).json({
      message: "Vui lòng nhập đầy đủ họ tên, số điện thoại và mật khẩu.",
    });
  }

  try {
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({
        message:
          "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.",
      });
    }

    // ✅ Tạo người dùng mới với mật khẩu
    const newUser = await User.create({
      name,
      phone,
      password,
      role: role || "student",
    });

    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    res
      .status(201)
      .json({ user: userResponse, message: "Đăng ký thành công!" }); // ✅ Trả về 201 Created
  } catch (err) {
    console.error("❌ Lỗi khi đăng ký:", err);
    logError("Lỗi khi đăng ký", err); // ✅ Ghi log vào error.log
    res.status(500).json({ message: "Lỗi server khi đăng ký." });
  }
});

// Đăng nhập
router.post("/login", async (req, res) => {
  const { phone, password } = req.body; // ✅ Chỉ cần phone và password để đăng nhập

  if (!phone || !password) {
    // ✅ Yêu cầu phone và password
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ số điện thoại và mật khẩu." });
  }

  try {
    const user = await User.findOne({ where: { phone } });

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      return res
        .status(404)
        .json({ message: "Số điện thoại không tồn tại. Vui lòng đăng ký." });
    }

    // ✅ So sánh mật khẩu
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng." }); // 401 Unauthorized
    }

    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({ message: "Đăng nhập thành công", user: userResponse });
  } catch (err) {
    console.error("❌ Lỗi khi đăng nhập:", err);
    logError("Lỗi khi đăng nhập", err); // ✅ Ghi log vào error.log
    res.status(500).json({ message: "Lỗi server khi đăng nhập." });
  }
});

// Reset mật khẩu
router.post("/reset-password", async (req, res) => {
  const { phone, verificationCode, newPassword } = req.body;

  if (!phone || !verificationCode || !newPassword) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin." });
  }

  try {
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({ message: "Số điện thoại không tồn tại." });
    }

    // TODO: Kiểm tra mã xác thực (cần triển khai hệ thống gửi SMS/OTP)
    // Hiện tại chỉ accept mã '123456' để test
    if (verificationCode !== "123456") {
      return res.status(401).json({ message: "Mã xác thực không đúng." });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    res.json({
      message: "Mật khẩu đã được reset thành công! Vui lòng đăng nhập lại.",
    });
  } catch (err) {
    console.error("❌ Lỗi khi reset mật khẩu:", err);
    logError("Lỗi khi reset mật khẩu", err);
    res.status(500).json({ message: "Lỗi server khi reset mật khẩu." });
  }
});

module.exports = router;
