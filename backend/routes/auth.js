const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const User = require("../models/User"); // Sequelize model
const { logError } = require("../logger"); // ✅ Import logger

// ✅ Email OTP Configuration (Nodemailer + Gmail)
// Hướng dẫn:
// 1. Dùng Gmail: https://myaccount.google.com/apppasswords
// 2. Tạo app password (16 ký tự)
// 3. Thêm vào .env: EMAIL_USER và EMAIL_PASS
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "stareduelt@gmail.com",
    pass: process.env.EMAIL_PASS, // App password từ Google
  },
});

// Lưu OTP tạm thời (trong thực tế nên dùng Redis)
const otpStore = new Map();
// Đăng ký
router.post("/register", async (req, res) => {
  const { name, phone, email, password, role } = req.body; // ✅ Thêm email

  if (!name || !phone || !password) {
    // ✅ Yêu cầu password khi đăng ký
    return res.status(400).json({
      message: "Vui lòng nhập đầy đủ họ tên, số điện thoại và mật khẩu.",
    });
  }

  // ✅ Validate số điện thoại Việt Nam
  const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
  if (!vnPhoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.",
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
      email: email || null,
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

  // ✅ Validate số điện thoại Việt Nam
  const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
  if (!vnPhoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.",
    });
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

  // ✅ Validate số điện thoại Việt Nam
  const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
  if (!vnPhoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.",
    });
  }

  try {
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({ message: "Số điện thoại không tồn tại." });
    }

    // Kiểm tra OTP từ lưu trữ tạm thời
    const storedOtp = otpStore.get(phone);
    if (!storedOtp || storedOtp.code !== verificationCode) {
      return res
        .status(401)
        .json({ message: "Mã xác thực không đúng hoặc đã hết hạn." });
    }

    // Kiểm tra hết hạn OTP (5 phút)
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(phone);
      return res
        .status(401)
        .json({ message: "Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới." });
    }

    // Cập nhật mật khẩu mới
    user.password = newPassword;
    await user.save();

    // Xoá OTP sau khi dùng
    otpStore.delete(phone);

    res.json({
      message: "Mật khẩu đã được reset thành công! Vui lòng đăng nhập lại.",
    });
  } catch (err) {
    console.error("❌ Lỗi khi reset mật khẩu:", err);
    logError("Lỗi khi reset mật khẩu", err);
    res.status(500).json({ message: "Lỗi server khi reset mật khẩu." });
  }
});

// Gửi OTP qua Email
router.post("/send-otp", async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: "Vui lòng nhập số điện thoại." });
  }

  // ✅ Validate số điện thoại Việt Nam
  const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
  if (!vnPhoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam hợp lệ.",
    });
  }

  try {
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      return res.status(404).json({ message: "Số điện thoại không tồn tại." });
    }

    // Tạo mã OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu OTP với thời gian hết hạn 5 phút
    otpStore.set(phone, {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 phút
    });

    // Gửi Email qua Nodemailer
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">🔐 Xác Thực Mật Khẩu</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
              Mã xác thực của bạn là:
            </p>
            <div style="background-color: #00a8e8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 5px;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 14px; margin: 20px 0;">
              ⏱️ Mã này có hiệu lực trong <strong>5 phút</strong>
            </p>
            <p style="color: #999; font-size: 14px;">
              ⚠️ Đừng chia sẻ mã này với ai khác. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Email này được gửi tự động. Vui lòng không reply email này.
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email || process.env.EMAIL_TO,
        subject: "🔐 Mã Xác Thực Đặt Lại Mật Khẩu",
        html: htmlContent,
      });

      console.log(
        `✅ Email gửi thành công tới ${user.email || process.env.EMAIL_TO}`
      );
    } catch (emailError) {
      console.error("❌ Lỗi khi gửi Email:", emailError.message);
      // Tiếp tục xử lý ngay cả khi lỗi Email (OTP vẫn được lưu)
    }

    // Phát triển: Log OTP để test
    console.log(`✅ OTP cho ${phone}: ${otp}`);

    res.json({
      message: "Mã xác thực đã được gửi. Vui lòng kiểm tra email của bạn.",
      // ✅ Chỉ để dev, xoá ở production
      testOtp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    console.error("❌ Lỗi khi gửi OTP:", err);
    logError("Lỗi khi gửi OTP", err);
    res.status(500).json({ message: "Lỗi server khi gửi OTP." });
  }
});

module.exports = router;
