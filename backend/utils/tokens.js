const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function getJwtAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing JWT_ACCESS_SECRET (or JWT_SECRET) in production');
  }
  return 'dev-secret-change-me';
}

function getAccessTokenExpiresIn(role) {
  const normalizedRole = String(role || '').trim().toLowerCase();

  if (normalizedRole === 'student') {
    return (
      process.env.JWT_ACCESS_EXPIRES_IN_STUDENT ||
      process.env.JWT_STUDENT_ACCESS_EXPIRES_IN ||
      '120m'
    );
  }

  if (normalizedRole === 'teacher') {
    return (
      process.env.JWT_ACCESS_EXPIRES_IN_TEACHER ||
      process.env.JWT_ACCESS_EXPIRES_IN ||
      '15m'
    );
  }

  if (normalizedRole === 'admin') {
    return (
      process.env.JWT_ACCESS_EXPIRES_IN_ADMIN ||
      process.env.JWT_ACCESS_EXPIRES_IN ||
      '15m'
    );
  }

  return process.env.JWT_ACCESS_EXPIRES_IN || '15m';
}

function signAccessToken({ userId, role }) {
  const secret = getJwtAccessSecret();
  const expiresIn = getAccessTokenExpiresIn(role);
  return jwt.sign(
    { sub: String(userId), role },
    secret,
    { expiresIn }
  );
}

function verifyAccessToken(token) {
  const secret = getJwtAccessSecret();
  return jwt.verify(token, secret);
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
};
