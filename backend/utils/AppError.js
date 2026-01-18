class AppError extends Error {
  /**
   * @param {object} opts
   * @param {string} opts.code
   * @param {string} opts.message
   * @param {number} [opts.statusCode]
   * @param {unknown} [opts.details]
   * @param {boolean} [opts.isOperational]
   */
  constructor({ code, message, statusCode = 500, details, isOperational = true }) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
  }

  static badRequest(message = 'Bad request', details) {
    return new AppError({ code: 'BAD_REQUEST', message, statusCode: 400, details });
  }

  static unauthorized(message = 'Unauthorized', details) {
    return new AppError({ code: 'UNAUTHORIZED', message, statusCode: 401, details });
  }

  static forbidden(message = 'Forbidden', details) {
    return new AppError({ code: 'FORBIDDEN', message, statusCode: 403, details });
  }

  static notFound(message = 'Not found', details) {
    return new AppError({ code: 'NOT_FOUND', message, statusCode: 404, details });
  }
}

module.exports = { AppError };
