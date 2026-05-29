jest.mock('../models/User', () => ({
  findByPk: jest.fn(),
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

describe('PATCH /me phone locking', () => {
  const updateMeHandler = getRouteHandler('/me', 'patch');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows a user with no phone to save one once', async () => {
    const userRecord = {
      id: 12,
      name: 'Social Student',
      phone: null,
      email: 'social@example.com',
      role: 'student',
      password: null,
      update: jest.fn(async function applyUpdates(updates) {
        Object.assign(this, updates);
        return this;
      }),
      toJSON() {
        return {
          id: this.id,
          name: this.name,
          phone: this.phone,
          email: this.email,
          role: this.role,
          password: this.password,
        };
      },
    };

    User.findByPk.mockResolvedValue(userRecord);
    User.findOne.mockResolvedValue(null);

    const req = {
      user: { id: 12 },
      body: { phone: '0912345678' },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateMeHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(userRecord.update).toHaveBeenCalledWith({ phone: '0912345678' });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cập nhật hồ sơ thành công.',
      user: expect.objectContaining({
        id: 12,
        phone: '0912345678',
      }),
    });
  });

  test('rejects changing a phone number after it has been locked', async () => {
    const userRecord = {
      id: 12,
      name: 'Locked User',
      phone: '0901123456',
      email: 'locked@example.com',
      role: 'student',
      update: jest.fn(),
    };

    User.findByPk.mockResolvedValue(userRecord);

    const req = {
      user: { id: 12 },
      body: { phone: '0912345678' },
    };
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await updateMeHandler(req, res, next);

    expect(userRecord.update).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'BAD_REQUEST',
        message: 'Số điện thoại đã được khóa và không thể chỉnh sửa.',
      })
    );
  });
});
