jest.mock('../models/User', () => ({}));
jest.mock('../models/RefreshToken', () => ({}));
jest.mock('../models/WritingTests', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/ReadingTest', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/ListeningTest', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/Submission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/ReadingSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/ListeningSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/CambridgeReading', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/CambridgeListening', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/CambridgeSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../middlewares/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../logger', () => ({ logError: jest.fn() }));

const WritingTest = require('../models/WritingTests');
const ReadingTest = require('../models/ReadingTest');
const ListeningTest = require('../models/ListeningTest');
const Submission = require('../models/Submission');
const ReadingSubmission = require('../models/ReadingSubmission');
const ListeningSubmission = require('../models/ListeningSubmission');
const CambridgeReading = require('../models/CambridgeReading');
const CambridgeListening = require('../models/CambridgeListening');
const CambridgeSubmission = require('../models/CambridgeSubmission');
const router = require('../routes/admin');

const getRouteHandler = (path, method) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('GET /admin/tests payload', () => {
  const getTestsHandler = getRouteHandler('/tests', 'get');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps PET Writing in the Cambridge bucket with a PET title', async () => {
    WritingTest.findAll.mockResolvedValue([
      {
        id: 7,
        index: 7,
        testType: 'writing',
        classCode: 'IELTS-A',
        teacherName: 'IX Teacher',
        isArchived: false,
        createdAt: '2026-05-16T00:00:00.000Z',
        updatedAt: '2026-05-16T00:00:00.000Z',
      },
      {
        id: 16,
        index: 16,
        testType: 'pet-writing',
        classCode: 'AUTHENTIC PRACTICE TEST 2',
        teacherName: 'Thanh Le',
        isArchived: false,
        createdAt: '2026-05-17T00:00:00.000Z',
        updatedAt: '2026-05-17T00:00:00.000Z',
      },
    ]);
    ReadingTest.findAll.mockResolvedValue([]);
    ListeningTest.findAll.mockResolvedValue([]);
    CambridgeReading.findAll.mockResolvedValue([]);
    CambridgeListening.findAll.mockResolvedValue([]);
    Submission.findAll.mockResolvedValue([
      { testId: 7, count: 0 },
      { testId: 16, count: 1 },
    ]);
    ReadingSubmission.findAll.mockResolvedValue([]);
    ListeningSubmission.findAll.mockResolvedValue([]);
    CambridgeSubmission.findAll.mockResolvedValue([]);

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };

    await getTestsHandler({}, res);

    expect(res.status).not.toHaveBeenCalled();

    const payload = res.json.mock.calls[0][0];

    expect(payload.ixWriting).toEqual([
      expect.objectContaining({
        id: 7,
        title: 'IX Writing 7',
        deleteScope: 'ix-writing',
      }),
    ]);
    expect(payload.ixWriting.find((test) => test.id === 16)).toBeUndefined();
    expect(payload.cambridge).toEqual([
      expect.objectContaining({
        id: 16,
        title: 'PET Writing 16',
        typeLabel: 'PET Writing',
        deleteScope: 'cambridge-writing',
      }),
    ]);
    expect(payload.cambridge[0].title).not.toMatch(/^IX Writing/i);
  });
});