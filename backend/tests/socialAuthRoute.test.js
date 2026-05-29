const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('../models/User', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../models/RefreshToken', () => ({
  create: jest.fn(),
}));

jest.mock('../logger', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock('../utils/tokens', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
  hashRefreshToken: jest.fn(() => 'refresh-token-hash'),
}));

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const router = require('../routes/auth');

const getRouteHandler = (path, method) => {
  const layer = router.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods?.[method]
  );

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('social auth routes', () => {
  const socialLoginHandler = getRouteHandler('/social-login', 'post');
  const loginHandler = getRouteHandler('/login', 'post');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_IDS = 'google-client-id.apps.googleusercontent.com';
  });

  test('links an existing account by email during Google login and returns auth tokens', async () => {
    const userRecord = {
      id: 42,
      name: 'Teacher A',
      email: 'teacher@example.com',
      phone: '0912345678',
      role: 'teacher',
      password: 'hashed-password',
      googleId: null,
      facebookId: null,
      avatarUrl: null,
      emailVerifiedAt: null,
      update: jest.fn(async function applyUpdates(updates) {
        Object.assign(this, updates);
        return this;
      }),
      toJSON() {
        return {
          id: this.id,
          name: this.name,
          email: this.email,
          phone: this.phone,
          role: this.role,
          password: this.password,
          googleId: this.googleId,
          facebookId: this.facebookId,
          avatarUrl: this.avatarUrl,
          emailVerifiedAt: this.emailVerifiedAt,
        };
      },
    };

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-user-123',
        email: 'teacher@example.com',
        email_verified: true,
        name: 'Teacher A',
        picture: 'https://example.com/avatar.png',
      }),
    });
    User.findOne.mockResolvedValue(null);
    User.findAll.mockResolvedValue([userRecord]);
    RefreshToken.create.mockResolvedValue({});

    const req = {
      body: {
        provider: 'google',
        credential: 'google-id-token',
      },
      get: jest.fn(() => 'jest-agent'),
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };
    const res = {
      cookie: jest.fn(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await socialLoginHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(userRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        googleId: 'google-user-123',
        avatarUrl: 'https://example.com/avatar.png',
      })
    );
    expect(RefreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        tokenHash: 'refresh-token-hash',
      })
    );
    expect(res.cookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Signed in with Google successfully.',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        linkedExistingAccount: true,
        created: false,
        user: expect.objectContaining({
          id: 42,
          role: 'teacher',
          googleId: 'google-user-123',
        }),
      })
    );
  });

  test('rejects password login for social-only accounts', async () => {
    User.findOne.mockResolvedValue({
      googleId: 'google-user-123',
      facebookId: null,
      password: null,
      comparePassword: jest.fn(),
    });

    const req = {
      body: {
        phone: '0912345678',
        password: 'secret',
      },
    };
    const res = {
      status: jest.fn(function setStatus(code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(),
    };

    await loginHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This account uses Google sign-in. Please continue with the linked provider instead.',
    });
  });
});