const getRouteHandler = (router, path, method) => {
  const layer = router.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods?.[method]
  );

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('social auth dependency failures', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.GOOGLE_CLIENT_IDS = 'google-client-id.apps.googleusercontent.com';
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('reports Google login as unavailable when google-auth-library cannot be loaded', async () => {
    jest.doMock('google-auth-library', () => {
      const err = new Error("Cannot find module 'google-auth-library'");
      err.code = 'MODULE_NOT_FOUND';
      throw err;
    });

    const logError = jest.fn();

    jest.doMock('../models/User', () => ({
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
    }));

    jest.doMock('../models/RefreshToken', () => ({
      create: jest.fn(),
    }));

    jest.doMock('../logger', () => ({
      logError,
      logWarn: jest.fn(),
    }));

    jest.doMock('../utils/tokens', () => ({
      signAccessToken: jest.fn(() => 'access-token'),
      generateRefreshToken: jest.fn(() => 'refresh-token'),
      hashRefreshToken: jest.fn(() => 'refresh-token-hash'),
    }));

    const router = require('../routes/auth');
    const socialLoginHandler = getRouteHandler(router, '/social-login', 'post');
    const next = jest.fn();

    await socialLoginHandler(
      {
        body: {
          provider: 'google',
          credential: 'google-id-token',
        },
        get: jest.fn(() => 'jest-agent'),
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      },
      {},
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SERVICE_UNAVAILABLE',
        statusCode: 503,
        message: 'Google login is temporarily unavailable on the server.',
      })
    );
    expect(logError).toHaveBeenCalledWith(
      'Google auth library could not be loaded on the server.',
      expect.any(Error)
    );
  });
});