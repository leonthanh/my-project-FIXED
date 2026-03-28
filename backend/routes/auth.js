const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const User = require("../models/User"); // Sequelize model
const RefreshToken = require('../models/RefreshToken');
const { logError, logWarn } = require("../logger"); // ✅ Import logger
const { validate } = require('../middlewares/validate');
const { AppError } = require('../utils/AppError');
const { signAccessToken, generateRefreshToken, hashRefreshToken } = require('../utils/tokens');

// ✅ Email OTP Configuration (Nodemailer + Gmail)
// Hướng dẫn:
// 1. Dùng Gmail: https://myaccount.google.com/apppasswords
// 2. Tạo app password (16 ký tự)
// 3. Thêm vào .env: EMAIL_USER và EMAIL_PASS
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw AppError.badRequest('Email OTP is not configured (EMAIL_USER/EMAIL_PASS missing)');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// Lưu OTP tạm thời (trong thực tế nên dùng Redis)
const otpStore = new Map();

const buildAuthLimiter = (overrides = {}) => rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json({ message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' });
  },
  ...overrides,
});

const authLimiter = buildAuthLimiter();
const loginLimiter = buildAuthLimiter({
  limit: 20,
  skipSuccessfulRequests: true,
});
const refreshLimiter = buildAuthLimiter({
  limit: 240,
  skipSuccessfulRequests: true,
});
const registerLimiter = buildAuthLimiter({
  limit: 20,
  skipSuccessfulRequests: true,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.' });
  },
});

function shouldReturnRefreshTokenInBody() {
  if (process.env.AUTH_REFRESH_IN_BODY === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

function setRefreshCookie(res, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  // No maxAge → session cookie: browser clears it automatically when all windows are closed
  res.cookie('rt', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth/refresh',
  });
}

async function issueTokens({ user, req, res }) {
  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken();

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.get('user-agent') || null,
    ip: req.ip || req.connection?.remoteAddress || null,
  });

  setRefreshCookie(res, refreshToken);

  return {
    accessToken,
    refreshToken: shouldReturnRefreshTokenInBody() ? refreshToken : undefined,
  };
}

const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(vnPhoneRegex),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  // role field is accepted but silently ignored — public registration always creates students
});

const loginSchema = z.object({
  phone: z.string().regex(vnPhoneRegex),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  phone: z.string().regex(vnPhoneRegex),
  verificationCode: z.string().min(4).max(10),
  newPassword: z.string().min(6),
});

const sendOtpSchema = z.object({
  phone: z.string().regex(vnPhoneRegex),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});
// Đăng ký
router.post(
  "/register",
  registerLimiter,
  validate({ body: registerSchema }),
  async (req, res) => {
    const { name, phone, email, password, role } = req.body; // ✅ Thêm email

  try {
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({
        message:
          "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.",
      });
    }

    // ✅ Tạo người dùng mới với mật khẩu
    // Role is always forced to 'student' — teacher/admin must be assigned by an admin after registration
    const newUser = await User.create({
      name,
      phone,
      email: email || null,
      password,
      role: 'student',
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
  }
);

// Đăng nhập
router.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  async (req, res) => {
    const { phone, password } = req.body; // ✅ Chỉ cần phone và password để đăng nhập

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

    const tokens = await issueTokens({ user, req, res });

    res.json({
      message: "Đăng nhập thành công",
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error("❌ Lỗi khi đăng nhập:", err);
    logError("Lỗi khi đăng nhập", err); // ✅ Ghi log vào error.log
    res.status(500).json({ message: "Lỗi server khi đăng nhập." });
  }
  }
);

// Refresh access token (rotating refresh token)
router.post(
  '/refresh',
  refreshLimiter,
  validate({ body: refreshSchema }),
  async (req, res) => {
    try {
      const provided = req.cookies?.rt || req.body.refreshToken;
      if (!provided) throw AppError.unauthorized('Missing refresh token');

      const tokenHash = hashRefreshToken(provided);
      const record = await RefreshToken.findOne({ where: { tokenHash } });

      if (!record || record.revokedAt) throw AppError.unauthorized('Invalid refresh token');
      if (new Date(record.expiresAt).getTime() <= Date.now()) throw AppError.unauthorized('Refresh token expired');

      // rotate
      record.revokedAt = new Date();
      await record.save();

      const user = await User.findByPk(record.userId);
      if (!user) throw AppError.unauthorized('User not found');

      const tokens = await issueTokens({ user, req, res });
      res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    } catch (err) {
      const appErr = err instanceof AppError ? err : AppError.unauthorized('Cannot refresh token');
      // Operational errors (invalid/expired tokens) are expected — log as warn, not error
      if (err instanceof AppError && err.isOperational) {
        logWarn('Refresh token rejected', err);
      } else {
        logError('Refresh token error', err);
      }
      res.status(appErr.statusCode).json({ message: appErr.message });
    }
  }
);

// Logout: revoke refresh token and clear cookie
router.post('/logout', authLimiter, async (req, res) => {
  try {
    const provided = req.cookies?.rt;
    if (provided) {
      const tokenHash = hashRefreshToken(provided);
      const record = await RefreshToken.findOne({ where: { tokenHash } });
      if (record && !record.revokedAt) {
        record.revokedAt = new Date();
        await record.save();
      }
    }
    res.clearCookie('rt', { path: '/api/auth/refresh' });
    res.json({ message: 'Đăng xuất thành công' });
  } catch (err) {
    logError('Logout error', err);
    res.status(500).json({ message: 'Lỗi server khi đăng xuất.' });
  }
});

// Reset mật khẩu
router.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res) => {
    const { phone, verificationCode, newPassword } = req.body;

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
  }
);

// Gửi OTP qua Email
router.post(
  "/send-otp",
  otpLimiter,
  validate({ body: sendOtpSchema }),
  async (req, res) => {
    const { phone } = req.body;

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
      const transporter = createTransporter();

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
    } catch (emailError) {
      console.error("❌ Lỗi khi gửi Email:", emailError.message);
      // Tiếp tục xử lý ngay cả khi lỗi Email (OTP vẫn được lưu)
    }

    res.json({
      message: "Mã xác thực đã được gửi. Vui lòng kiểm tra email của bạn.",
      // ✅ Chỉ để dev, tuyệt đối không bật ở production
      testOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err) {
    console.error("❌ Lỗi khi gửi OTP:", err);
    logError("Lỗi khi gửi OTP", err);
    res.status(500).json({ message: "Lỗi server khi gửi OTP." });
  }
  }
);

// ===== ADMIN: Quản lý danh sách giáo viên =====

const { requireAuth, requireRole } = require('../middlewares/auth');

// GET /api/auth/teachers — lấy danh sách tất cả giáo viên (chỉ admin)
router.get('/teachers', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'name', 'phone', 'email', 'canManageTests', 'createdAt'],
      order: [['name', 'ASC']],
    });
    res.json(teachers);
  } catch (err) {
    logError('Lỗi khi lấy danh sách giáo viên', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PATCH /api/auth/teachers/:id/permissions — bật/tắt quyền quản lý đề (chỉ admin)
router.patch('/teachers/:id/permissions', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const teacher = await User.findOne({ where: { id: req.params.id, role: 'teacher' } });
    if (!teacher) return res.status(404).json({ message: 'Không tìm thấy giáo viên.' });

    const { canManageTests } = req.body;
    if (typeof canManageTests !== 'boolean') {
      return res.status(400).json({ message: 'canManageTests phải là true hoặc false.' });
    }

    await teacher.update({ canManageTests });
    res.json({ message: 'Cập nhật quyền thành công.', id: teacher.id, canManageTests: teacher.canManageTests });
  } catch (err) {
    logError('Lỗi khi cập nhật quyền giáo viên', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PATCH /api/auth/users/:id/role — đổi role của user (chỉ admin, không thể tự đổi role của chính mình)
router.patch('/users/:id/role', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ message: 'Không thể tự đổi role của chính mình.' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const { role } = req.body;
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ message: 'Role hợp lệ: student, teacher.' });
    }

    await user.update({ role });
    res.json({ message: 'Cập nhật role thành công.', id: user.id, role: user.role });
  } catch (err) {
    logError('Lỗi khi cập nhật role', err);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
