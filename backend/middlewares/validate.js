const { ZodError } = require('zod');
const { AppError } = require('../utils/AppError');

function formatZodError(err) {
  if (!(err instanceof ZodError)) return undefined;
  return err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
}

function validate({ body, params, query } = {}) {
  return (req, _res, next) => {
    try {
      if (body) {
        const parsed = body.safeParse(req.body);
        if (!parsed.success) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            statusCode: 400,
            details: formatZodError(parsed.error),
          });
        }
        req.body = parsed.data;
      }

      if (params) {
        const parsed = params.safeParse(req.params);
        if (!parsed.success) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request params',
            statusCode: 400,
            details: formatZodError(parsed.error),
          });
        }
        req.params = parsed.data;
      }

      if (query) {
        const parsed = query.safeParse(req.query);
        if (!parsed.success) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid request query',
            statusCode: 400,
            details: formatZodError(parsed.error),
          });
        }
        req.query = parsed.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate };
