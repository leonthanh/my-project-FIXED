const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');
const { logger } = require('../logger');

function zodDetails(err) {
  if (!(err instanceof ZodError)) return undefined;
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
}

function notFound(_req, _res, next) {
  next(AppError.notFound('Route not found'));
}

function errorHandler(err, req, res, _next) {
  const requestId = req.id || req.headers['x-request-id'];

  // Normalize unknown errors
  let appErr = err;

  if (err instanceof ZodError) {
    appErr = new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Validation error',
      statusCode: 400,
      details: zodDetails(err),
    });
  } else if (!(err instanceof AppError)) {
    appErr = new AppError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error',
      statusCode: 500,
      details: process.env.NODE_ENV === 'production' ? undefined : String(err?.message || err),
      isOperational: false,
    });
  }

  const status = appErr.statusCode || 500;

  // Log server-side with context
  logger.error(
    {
      err: err instanceof Error ? err : new Error(String(err)),
      requestId,
      status,
      code: appErr.code,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
      role: req.user?.role,
    },
    appErr.message
  );

  res.status(status).json({
    error: {
      code: appErr.code,
      message: appErr.message,
      details: appErr.details,
    },
    requestId: requestId || null,
  });
}

module.exports = { notFound, errorHandler };
