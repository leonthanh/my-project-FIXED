const { AppError } = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/tokens');

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) throw AppError.unauthorized('Missing access token');

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch (err) {
    // Preserve specific AppError where possible for clearer diagnostics
    if (err && err instanceof AppError) return next(err);

    // jwt may throw TokenExpiredError from jsonwebtoken
    if (err && err.name === 'TokenExpiredError') return next(AppError.unauthorized('Access token expired'));

    // Generic fallback
    console.debug('requireAuth failed:', err && err.message ? err.message : err);
    return next(AppError.unauthorized('Invalid or expired access token'));
  }
}

function requireRole(...allowed) {
  return (req, _res, next) => {
    const role = req.user?.role;
    if (!role) return next(AppError.unauthorized('Missing auth context'));
    if (!allowed.includes(role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
