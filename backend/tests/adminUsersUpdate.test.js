jest.mock('../models/User', () => ({
  findByPk: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../models/RefreshToken', () => ({ destroy: jest.fn() }));
jest.mock('../models/WritingTests', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/ReadingTest', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/ListeningTest', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/Submission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/ReadingSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/ListeningSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/CambridgeListening', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/CambridgeReading', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/CambridgeSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../middlewares/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../logger', () => ({ logError: jest.fn() }));

const User = require('../models/User');
const router = require('../routes/admin');

const getRouteHandler = (path, method) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('PATCH /admin/users/:id', () => {
  const updateUserHandler = getRouteHandler('/users/:id', 'patch');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows an admin to update their own profile fields without changing their role', async () => {
    const userRecord = {
      id: 1,
      name: 'Thanh',
      phone: '0900000001',
      email: 'old@example.com',
      role: 'admin',
      canManageTests: false,
      password: 'secret',
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
          canManageTests: this.canManageTests,
          password: this.password,
        };
      },
    };

    User.findByPk.mockResolvedValue(userRecord);
    User.findOne.mockResolvedValue(null);

    const req = {
      params: { id: '1' },
      user: { id: 1 },
      body: {
        name: 'Thanh Le',
        email: 'thanh@example.com',
        phone: '0900000001',
        role: 'student',
        canManageTests: true,
      },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn(function status(code) {
        this.statusCode = code;
        return this;
      }),
    };

    await updateUserHandler(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(userRecord.update).toHaveBeenCalledWith({
      name: 'Thanh Le',
      email: 'thanh@example.com',
      phone: '0900000001',
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cập nhật thành công.',
      user: {
        id: 1,
        name: 'Thanh Le',
        phone: '0900000001',
        email: 'thanh@example.com',
        role: 'admin',
        canManageTests: false,
      },
    });
  });
});