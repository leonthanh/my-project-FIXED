const path = require('path');
const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

// Structured JSON logs. In production, keep console logging (for containers) and also write to a file.
// NOTE: pino destination creates the file if missing.
const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
        'refreshToken',
        '*.refreshToken',
        'accessToken',
        '*.accessToken',
      ],
      remove: true,
    },
  },
  pino.multistream([
    { stream: process.stdout },
    { stream: pino.destination({ dest: path.join(__dirname, 'app.log'), sync: false }) },
  ])
);

/**
 * Backward compatible API used across routes.
 */
function logError(message, error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err }, message);
}

module.exports = { logger, logError };