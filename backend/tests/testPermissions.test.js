const { requireTestPermission } = require('../middlewares/testPermissions');
const User = require('../models/User');

jest.mock('../models/User');

describe('requireTestPermission middleware', () => {
  const next = jest.fn();
  const mockRes = {
    status: jest.fn(() => mockRes),
    json: jest.fn(() => mockRes),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows admin for any category', async () => {
    User.findByPk.mockResolvedValue({ id: 1, role: 'admin', phone: '0912345678' });
    const mw = requireTestPermission('reading');
    const req = { user: { id: 1 } };
    await mw(req, mockRes, next);
    expect(next).toHaveBeenCalled();
  });

  test('allows privileged teacher for reading/listening/cambridge', async () => {
    User.findByPk.mockResolvedValue({ id: 2, role: 'teacher', phone: '0784611179' });
    const req = { user: { id: 2 } };
    const mwRead = requireTestPermission('reading');
    await mwRead(req, mockRes, next);
    expect(next).toHaveBeenCalled();

    const mwCam = requireTestPermission('cambridge');
    await mwCam(req, mockRes, next);
    expect(next).toHaveBeenCalled();
  });

  test('denies non-privileged teacher for reading/listening/cambridge', async () => {
    User.findByPk.mockResolvedValue({ id: 3, role: 'teacher', phone: '0912345678' });
    const req = { user: { id: 3 } };
    const mwRead = requireTestPermission('reading');
    await mwRead(req, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);

    const mwCam = requireTestPermission('cambridge');
    await mwCam(req, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  test('allows any teacher for writing', async () => {
    User.findByPk.mockResolvedValue({ id: 4, role: 'teacher', phone: '0912345678' });
    const req = { user: { id: 4 } };
    const mwWrite = requireTestPermission('writing');
    await mwWrite(req, mockRes, next);
    expect(next).toHaveBeenCalled();
  });
});
