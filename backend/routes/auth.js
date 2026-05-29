const express = require("express");
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const nodemailer = require("nodemailer");
const path = require('path');
const rateLimit = require('express-rate-limit');
const { fn, col, where } = require('sequelize');
const { z } = require('zod');
const User = require("../models/User"); // Sequelize model
const RefreshToken = require('../models/RefreshToken');
const { logError, logWarn } = require("../logger"); // ✅ Import logger
const { requireAuth, requireRole } = require('../middlewares/auth');
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

const normalizeAuthLimiterValue = (value) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
};

const extractAuthRateLimitKey = (req) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const query = req.query && typeof req.query === 'object' ? req.query : {};

  const phone = normalizeAuthLimiterValue(
    body.phone || body.studentPhone || query.phone
  );
  if (phone) return `phone:${phone}`;

  const email = normalizeAuthLimiterValue(body.email || query.email);
  if (email) return `email:${email.toLowerCase()}`;

  return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
};

const buildAuthLimiter = (overrides = {}) => rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 50,
  keyGenerator: extractAuthRateLimitKey,
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
  keyGenerator: extractAuthRateLimitKey,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: 'Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.' });
  },
});

const avatarUploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Chỉ cho phép upload avatar dạng JPEG, PNG, GIF hoặc WebP.'));
  },
});

const sanitizeUser = (user) => {
  const userResponse = user.toJSON();
  delete userResponse.password;
  return userResponse;
};

let googleOAuthClient = null;
let googleAuthLibraryUnavailable = false;

const createGoogleLoginUnavailableError = () => new AppError({
  code: 'SERVICE_UNAVAILABLE',
  message: 'Google login is temporarily unavailable on the server.',
  statusCode: 503,
});

const getGoogleOAuthClient = () => {
  if (googleOAuthClient) {
    return googleOAuthClient;
  }

  if (googleAuthLibraryUnavailable) {
    throw createGoogleLoginUnavailableError();
  }

  try {
    const { OAuth2Client } = require('google-auth-library');
    googleOAuthClient = new OAuth2Client();
    return googleOAuthClient;
  } catch (err) {
    if (err?.code === 'MODULE_NOT_FOUND') {
      googleAuthLibraryUnavailable = true;
      logError('Google auth library could not be loaded on the server.', err);
      throw createGoogleLoginUnavailableError();
    }

    throw err;
  }
};

const socialProviderLabels = {
  google: 'Google',
  facebook: 'Facebook',
};

const socialProviderColumns = {
  google: 'googleId',
  facebook: 'facebookId',
};

const normalizeNullableTrimmedString = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const trimStringValue = (value) => String(value ?? '').trim();

const normalizeEmailValue = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized || null;
};

const getSocialProviderLabel = (provider) => socialProviderLabels[provider] || 'social';

const getSocialProviderColumn = (provider) => {
  const providerColumn = socialProviderColumns[provider];
  if (!providerColumn) {
    throw AppError.badRequest('Unsupported social login provider.');
  }

  return providerColumn;
};

const getConfiguredGoogleClientIds = () => {
  const raw = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '';
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeSocialAvatarUrl = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const findUsersByNormalizedEmail = async (email) => {
  if (!email) return [];

  return User.findAll({
    where: where(fn('LOWER', col('email')), email),
  });
};

const fetchJsonOrThrow = async (url, errorMessage, options = {}) => {
  let response;

  try {
    response = await fetch(url, options);
  } catch (err) {
    logWarn('Social auth upstream request failed', err);
    throw AppError.unauthorized(errorMessage);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw AppError.unauthorized(errorMessage);
  }

  return data;
};

const buildLinkedProvidersLabel = (user) => {
  const providers = [
    user.googleId ? socialProviderLabels.google : null,
    user.facebookId ? socialProviderLabels.facebook : null,
  ].filter(Boolean);

  if (!providers.length) return 'your linked provider';
  if (providers.length === 1) return providers[0];
  return `${providers.slice(0, -1).join(', ')} or ${providers[providers.length - 1]}`;
};

const applySocialProfileToExistingUser = async (user, socialProfile) => {
  const updates = {};
  const providerColumn = getSocialProviderColumn(socialProfile.provider);
  const currentEmail = normalizeEmailValue(user.email);

  if (!user[providerColumn]) {
    updates[providerColumn] = socialProfile.providerUserId;
  }

  if (!currentEmail && socialProfile.email) {
    updates.email = socialProfile.email;
  }

  if (!user.name && socialProfile.name) {
    updates.name = socialProfile.name;
  }

  if ((!user.avatarUrl || /^https?:\/\//i.test(String(user.avatarUrl))) && socialProfile.avatarUrl) {
    updates.avatarUrl = socialProfile.avatarUrl;
  }

  if (!user.emailVerifiedAt && socialProfile.emailVerified) {
    updates.emailVerifiedAt = new Date();
  }

  if (Object.keys(updates).length > 0) {
    await user.update(updates);
  }

  return user;
};

const resolveSocialUser = async (socialProfile) => {
  const providerColumn = getSocialProviderColumn(socialProfile.provider);
  const providerLabel = getSocialProviderLabel(socialProfile.provider);

  let user = await User.findOne({ where: { [providerColumn]: socialProfile.providerUserId } });
  if (user) {
    await applySocialProfileToExistingUser(user, socialProfile);
    return { user, created: false, linkedExistingAccount: false };
  }

  const emailMatches = await findUsersByNormalizedEmail(socialProfile.email);
  if (emailMatches.length > 1) {
    throw AppError.badRequest('This email is already attached to multiple accounts. Please contact admin before using social login.');
  }

  user = emailMatches[0] || null;
  if (user) {
    if (user[providerColumn] && user[providerColumn] !== socialProfile.providerUserId) {
      throw AppError.badRequest(`${providerLabel} login could not be linked to this account.`);
    }

    await applySocialProfileToExistingUser(user, socialProfile);
    return { user, created: false, linkedExistingAccount: true };
  }

  user = await User.create({
    name: socialProfile.name || `${providerLabel} user`,
    phone: null,
    email: socialProfile.email,
    password: null,
    role: 'student',
    avatarUrl: socialProfile.avatarUrl,
    emailVerifiedAt: socialProfile.emailVerified ? new Date() : null,
    [providerColumn]: socialProfile.providerUserId,
  });

  return { user, created: true, linkedExistingAccount: false };
};

const verifyGoogleCredential = async (credential) => {
  const audiences = getConfiguredGoogleClientIds();
  if (!audiences.length) {
    throw AppError.badRequest('Google login is not configured on the server.');
  }

  const googleClient = getGoogleOAuthClient();

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: audiences,
    });
  } catch (err) {
    logWarn('Google token verification failed', err);
    throw AppError.unauthorized('Google account verification failed.');
  }

  const payload = ticket.getPayload();
  const email = normalizeEmailValue(payload?.email);

  if (!payload?.sub || !email || payload.email_verified !== true) {
    throw AppError.unauthorized('Google account verification failed. Please use an email-verified Google account.');
  }

  return {
    provider: 'google',
    providerUserId: String(payload.sub),
    email,
    name: trimStringValue(payload.name || 'Google user'),
    avatarUrl: normalizeSocialAvatarUrl(payload.picture),
    emailVerified: true,
  };
};

const verifyFacebookAccessToken = async (accessToken) => {
  const appId = String(process.env.FACEBOOK_APP_ID || '').trim();
  const appSecret = String(process.env.FACEBOOK_APP_SECRET || '').trim();
  if (!appId || !appSecret) {
    throw AppError.badRequest('Facebook login is not configured on the server.');
  }

  const debugTokenUrl = new URL('https://graph.facebook.com/debug_token');
  debugTokenUrl.search = new URLSearchParams({
    input_token: accessToken,
    access_token: `${appId}|${appSecret}`,
  }).toString();

  const debugPayload = await fetchJsonOrThrow(
    debugTokenUrl,
    'Facebook account verification failed.'
  );

  const tokenData = debugPayload?.data;
  if (!tokenData?.is_valid || String(tokenData.app_id) !== appId || !tokenData.user_id) {
    throw AppError.unauthorized('Facebook account verification failed.');
  }

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.search = new URLSearchParams({
    fields: 'id,name,email,picture.type(large)',
    access_token: accessToken,
  }).toString();

  const profilePayload = await fetchJsonOrThrow(
    profileUrl,
    'Unable to load Facebook profile.'
  );

  const email = normalizeEmailValue(profilePayload?.email);
  if (!profilePayload?.id || !email) {
    throw AppError.badRequest('Facebook login requires access to your email address.');
  }

  return {
    provider: 'facebook',
    providerUserId: String(profilePayload.id),
    email,
    name: trimStringValue(profilePayload.name || 'Facebook user'),
    avatarUrl: normalizeSocialAvatarUrl(profilePayload?.picture?.data?.url),
    emailVerified: true,
  };
};

const nullableEmailSchema = z.preprocess(
  normalizeNullableTrimmedString,
  z.string().email().max(100).nullable()
);

const vnPhoneRegex = /^(0)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

const nullableAddressSchema = z.preprocess(
  normalizeNullableTrimmedString,
  z.string().max(255).nullable()
);

const nullableBioSchema = z.preprocess(
  normalizeNullableTrimmedString,
  z.string().max(1200).nullable()
);

const updateProfileSchema = z.object({
  name: z.preprocess(trimStringValue, z.string().min(1).max(100)).optional(),
  email: nullableEmailSchema.optional(),
  phone: z.preprocess(
    (value) => (value === undefined ? undefined : String(value).trim()),
    z.string().regex(vnPhoneRegex)
  ).optional(),
  address: nullableAddressSchema.optional(),
  bio: nullableBioSchema.optional(),
});

const changeOwnPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const confirmEmailVerificationSchema = z.object({
  code: z.preprocess(trimStringValue, z.string().min(4).max(10)),
});

const managedAvatarPrefix = '/uploads/avatars/';
const emailVerificationCodeExpiresMs = 10 * 60 * 1000;

const buildEmailVerificationStoreKey = (userId) => `email-verification:${userId}`;

const resolveManagedAvatarPath = (avatarUrl) => {
  const normalized = String(avatarUrl || '').trim();
  if (!normalized.startsWith(managedAvatarPrefix)) {
    return null;
  }

  const filename = path.basename(normalized);
  if (!filename || filename === '.' || filename === '..') {
    return null;
  }

  return path.join(avatarUploadDir, filename);
};

const removeManagedAvatar = (avatarUrl) => {
  const filePath = resolveManagedAvatarPath(avatarUrl);
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  fs.unlinkSync(filePath);
};

const getCurrentUserOrThrow = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw AppError.notFound('Không tìm thấy người dùng.');
  }

  return user;
};

const clearEmailVerificationCode = (userId) => {
  otpStore.delete(buildEmailVerificationStoreKey(userId));
};

const createEmailVerificationHtml = (name, code) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #eff6ff;">
    <div style="background: #ffffff; border-radius: 18px; padding: 28px; box-shadow: 0 12px 28px rgba(30, 64, 175, 0.12);">
      <p style="margin: 0 0 12px; color: #1e3a8a; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;">Email verification</p>
      <h2 style="margin: 0 0 14px; color: #0f172a; font-size: 24px;">Xác thực email cho hồ sơ của bạn</h2>
      <p style="margin: 0 0 18px; color: #334155; font-size: 15px; line-height: 1.65;">${name ? `Chào ${name},` : 'Xin chào,'} hãy nhập mã dưới đây tại trang hồ sơ để hoàn tất xác thực email.</p>
      <div style="margin: 0 0 18px; padding: 18px; border-radius: 16px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); text-align: center;">
        <span style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 0.32em; color: #ffffff;">${code}</span>
      </div>
      <p style="margin: 0 0 8px; color: #334155; font-size: 14px; line-height: 1.6;">Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu xác thực, bạn có thể bỏ qua email này.</p>
      <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">Email này được gửi tự động từ hệ thống giáo viên.</p>
    </div>
  </div>
`;

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

const registerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(vnPhoneRegex),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6),
  // role field is accepted but silently ignored — public registration always creates students
});

const socialLoginSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  credential: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  if (value.provider === 'google' && !value.credential) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['credential'],
      message: 'Google credential is required.',
    });
  }

  if (value.provider === 'facebook' && !value.accessToken) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['accessToken'],
      message: 'Facebook access token is required.',
    });
  }
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

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getCurrentUserOrThrow(req.user.id);
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  async (req, res, next) => {
    try {
      const user = await getCurrentUserOrThrow(req.user.id);
      const { name, email, phone, address, bio } = req.body;
      const updates = {};
      const currentEmail = normalizeEmailValue(user.email);
      const currentPhone = String(user.phone || '').trim();

      if (name !== undefined) updates.name = name;
      if (email !== undefined) {
        const nextEmail = normalizeEmailValue(email);
        if (nextEmail && nextEmail !== currentEmail) {
          const emailUsers = await findUsersByNormalizedEmail(nextEmail);
          const emailInUse = emailUsers.some((candidate) => Number(candidate.id) !== Number(user.id));
          if (emailInUse) {
            throw AppError.badRequest('Email này đã được sử dụng bởi tài khoản khác.');
          }
        }

        updates.email = nextEmail;
        if (nextEmail !== currentEmail) {
          updates.emailVerifiedAt = null;
          clearEmailVerificationCode(user.id);
        }
      }
      if (phone !== undefined) {
        const nextPhone = String(phone || '').trim();

        if (currentPhone && nextPhone !== currentPhone) {
          throw AppError.badRequest('Số điện thoại đã được khóa và không thể chỉnh sửa.');
        }

        if (!currentPhone && nextPhone) {
          const existingPhoneUser = await User.findOne({ where: { phone: nextPhone } });
          const phoneInUse = existingPhoneUser && Number(existingPhoneUser.id) !== Number(user.id);
          if (phoneInUse) {
            throw AppError.badRequest('Số điện thoại này đã được sử dụng bởi tài khoản khác.');
          }

          updates.phone = nextPhone;
        }
      }
      if (address !== undefined) updates.address = address;
      if (bio !== undefined) updates.bio = bio;

      await user.update(updates);

      res.json({
        message: 'Cập nhật hồ sơ thành công.',
        user: sanitizeUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/me/email-verification/request', requireAuth, otpLimiter, async (req, res, next) => {
  try {
    const user = await getCurrentUserOrThrow(req.user.id);
    const email = String(user.email || '').trim().toLowerCase();

    if (!email) {
      throw AppError.badRequest('Vui lòng cập nhật email trước khi xác thực.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(buildEmailVerificationStoreKey(user.id), {
      code,
      email,
      expiresAt: Date.now() + emailVerificationCodeExpiresMs,
    });

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Xác thực email hồ sơ giáo viên',
        html: createEmailVerificationHtml(user.name, code),
      });
    } catch (emailError) {
      console.error('❌ Lỗi khi gửi email xác thực:', emailError.message);
    }

    res.json({
      message: 'Mã xác thực email đã được gửi. Vui lòng kiểm tra hộp thư của bạn.',
      testOtp: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/me/email-verification/confirm',
  requireAuth,
  otpLimiter,
  validate({ body: confirmEmailVerificationSchema }),
  async (req, res, next) => {
    try {
      const user = await getCurrentUserOrThrow(req.user.id);
      const email = String(user.email || '').trim().toLowerCase();

      if (!email) {
        throw AppError.badRequest('Vui lòng cập nhật email trước khi xác thực.');
      }

      const storedOtp = otpStore.get(buildEmailVerificationStoreKey(user.id));
      if (!storedOtp || storedOtp.email !== email) {
        throw AppError.unauthorized('Mã xác thực email không hợp lệ hoặc đã hết hạn.');
      }

      if (Date.now() > storedOtp.expiresAt) {
        clearEmailVerificationCode(user.id);
        throw AppError.unauthorized('Mã xác thực email đã hết hạn. Vui lòng yêu cầu mã mới.');
      }

      if (String(req.body.code || '').trim() !== String(storedOtp.code)) {
        throw AppError.unauthorized('Mã xác thực email không đúng.');
      }

      user.emailVerifiedAt = new Date();
      await user.save();
      clearEmailVerificationCode(user.id);

      res.json({
        message: 'Email đã được xác thực thành công.',
        user: sanitizeUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/me/password',
  requireAuth,
  validate({ body: changeOwnPasswordSchema }),
  async (req, res, next) => {
    try {
      const user = await getCurrentUserOrThrow(req.user.id);
      const { currentPassword, newPassword } = req.body;

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw AppError.unauthorized('Mật khẩu hiện tại không đúng.');
      }

      if (currentPassword === newPassword) {
        throw AppError.badRequest('Mật khẩu mới phải khác mật khẩu hiện tại.');
      }

      user.password = newPassword;
      await user.save();

      res.json({ message: 'Đổi mật khẩu thành công.' });
    } catch (err) {
      next(err);
    }
  }
);

router.post('/me/avatar', requireAuth, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const statusCode = uploadErr instanceof multer.MulterError || uploadErr?.message
        ? 400
        : 500;
      res.status(statusCode).json({ message: uploadErr.message || 'Không thể upload avatar.' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'Không có file avatar được upload.' });
      return;
    }

    const nextAvatarUrl = `/uploads/avatars/${req.file.filename}`;

    try {
      const user = await getCurrentUserOrThrow(req.user.id);
      const previousAvatarUrl = user.avatarUrl;

      user.avatarUrl = nextAvatarUrl;
      await user.save();

      if (previousAvatarUrl && previousAvatarUrl !== nextAvatarUrl) {
        removeManagedAvatar(previousAvatarUrl);
      }

      res.json({
        message: 'Cập nhật avatar thành công.',
        user: sanitizeUser(user),
      });
    } catch (err) {
      removeManagedAvatar(nextAvatarUrl);
      next(err);
    }
  });
});

router.delete('/me/avatar', requireAuth, async (req, res, next) => {
  try {
    const user = await getCurrentUserOrThrow(req.user.id);
    const previousAvatarUrl = user.avatarUrl;

    if (!previousAvatarUrl) {
      res.json({
        message: 'Avatar đã được xóa.',
        user: sanitizeUser(user),
      });
      return;
    }

    user.avatarUrl = null;
    await user.save();
    removeManagedAvatar(previousAvatarUrl);

    res.json({
      message: 'Xóa avatar thành công.',
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

// Đăng ký
router.post(
  "/register",
  registerLimiter,
  validate({ body: registerSchema }),
  async (req, res) => {
    const { name, phone, email, password } = req.body; // ✅ Thêm email
    const normalizedEmail = normalizeEmailValue(email);

  try {
    const existing = await User.findOne({ where: { phone } });
    if (existing) {
      return res.status(409).json({
        message:
          "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc sử dụng số điện thoại khác.",
      });
    }

    if (normalizedEmail) {
      const existingEmailUsers = await findUsersByNormalizedEmail(normalizedEmail);
      if (existingEmailUsers.length) {
        return res.status(409).json({
          message: 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.',
        });
      }
    }

    // ✅ Tạo người dùng mới với mật khẩu
    // Role is always forced to 'student' — teacher/admin must be assigned by an admin after registration
    const newUser = await User.create({
      name,
      phone,
      email: normalizedEmail,
      password,
      role: 'student',
    });

    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = sanitizeUser(newUser);

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

    if (!user.password) {
      return res.status(400).json({
        message: `This account uses ${buildLinkedProvidersLabel(user)} sign-in. Please continue with the linked provider instead.`,
      });
    }

    // ✅ So sánh mật khẩu
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng." }); // 401 Unauthorized
    }

    // Loại bỏ mật khẩu khỏi đối tượng user trước khi gửi về client
    const userResponse = sanitizeUser(user);

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

router.post(
  '/social-login',
  loginLimiter,
  validate({ body: socialLoginSchema }),
  async (req, res, next) => {
    try {
      const { provider, credential, accessToken } = req.body;
      const socialProfile = provider === 'google'
        ? await verifyGoogleCredential(credential)
        : await verifyFacebookAccessToken(accessToken);

      const { user, created, linkedExistingAccount } = await resolveSocialUser(socialProfile);
      const tokens = await issueTokens({ user, req, res });
      const providerLabel = getSocialProviderLabel(provider);

      res.json({
        message: created
          ? `Created a new student account with ${providerLabel}.`
          : `Signed in with ${providerLabel} successfully.`,
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        created,
        linkedExistingAccount,
      });
    } catch (err) {
      next(err);
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
      const userResponse = sanitizeUser(user);

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: userResponse,
      });
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
