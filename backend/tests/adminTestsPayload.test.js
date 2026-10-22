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
jest.mock('../models/GatewayReading', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/GatewayListening', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/GatewaySubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../models/GeneralReading', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/GeneralListening', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../models/GeneralSubmission', () => ({ findAll: jest.fn(), destroy: jest.fn() }));
jest.mock('../middlewares/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  optionalAuth: (_req, _res, next) => next(),
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
const GatewayReading = require('../models/GatewayReading');
const GatewayListening = require('../models/GatewayListening');
const GatewaySubmission = require('../models/GatewaySubmission');
const GeneralReading = require('../models/GeneralReading');
const GeneralListening = require('../models/GeneralListening');
const GeneralSubmission = require('../models/GeneralSubmission');
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
    GeneralReading.findAll.mockResolvedValue([]);
    GeneralListening.findAll.mockResolvedValue([]);
    GeneralSubmission.findAll.mockResolvedValue([]);
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
    GatewayReading.findAll.mockResolvedValue([]);
    GatewayListening.findAll.mockResolvedValue([]);
    Submission.findAll.mockResolvedValue([
      { testId: 7, count: 0 },
      { testId: 16, count: 1 },
    ]);
    ReadingSubmission.findAll.mockResolvedValue([]);
    ListeningSubmission.findAll.mockResolvedValue([]);
    CambridgeSubmission.findAll.mockResolvedValue([]);
    GatewaySubmission.findAll.mockResolvedValue([]);

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

  test('returns Gateway tests in a separate bucket and uses Gateway submission counts', async () => {
    WritingTest.findAll.mockResolvedValue([]);
    ReadingTest.findAll.mockResolvedValue([]);
    ListeningTest.findAll.mockResolvedValue([]);
    CambridgeReading.findAll.mockResolvedValue([]);
    CambridgeListening.findAll.mockResolvedValue([]);
    GatewayReading.findAll.mockResolvedValue([
      {
        id: 55,
        title: 'Gateway Reading-Writing',
        testType: 'gateway-reading-writing',
        classCode: 'GW-A',
        teacherName: 'Gateway Teacher',
        totalQuestions: 50,
        status: 'published',
        createdAt: '2026-05-17T00:00:00.000Z',
      },
    ]);
    GatewayListening.findAll.mockResolvedValue([]);
    Submission.findAll.mockResolvedValue([]);
    ReadingSubmission.findAll.mockResolvedValue([]);
    ListeningSubmission.findAll.mockResolvedValue([]);
    CambridgeSubmission.findAll.mockResolvedValue([]);
    GatewaySubmission.findAll.mockResolvedValue([
      { testId: 55, testType: 'gateway-reading-writing', count: 3 },
    ]);

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };
    await getTestsHandler({}, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.cambridge).toEqual([]);
    expect(payload.gateway).toEqual([
      expect.objectContaining({
        id: 55,
        typeLabel: 'Gateway Reading-Writing',
        submissionCount: 3,
        deleteScope: 'gateway-reading',
      }),
    ]);
  });

  test('returns General tests and submissions in their own bucket', async () => {
    WritingTest.findAll.mockResolvedValue([]);
    ReadingTest.findAll.mockResolvedValue([]);
    ListeningTest.findAll.mockResolvedValue([]);
    CambridgeReading.findAll.mockResolvedValue([]);
    CambridgeListening.findAll.mockResolvedValue([]);
    GatewayReading.findAll.mockResolvedValue([]);
    GatewayListening.findAll.mockResolvedValue([]);
    GeneralReading.findAll.mockResolvedValue([
      {
        id: 71,
        title: 'General Reading',
        testType: 'general-reading-60',
        classCode: 'GEN-A',
        teacherName: 'General Teacher',
        totalQuestions: 30,
        status: 'published',
        createdAt: '2026-05-18T00:00:00.000Z',
      },
    ]);
    GeneralListening.findAll.mockResolvedValue([]);
    Submission.findAll.mockResolvedValue([]);
    ReadingSubmission.findAll.mockResolvedValue([]);
    ListeningSubmission.findAll.mockResolvedValue([]);
    CambridgeSubmission.findAll.mockResolvedValue([]);
    GatewaySubmission.findAll.mockResolvedValue([]);
    GeneralSubmission.findAll.mockResolvedValue([
      { testId: 71, testType: 'general-reading-60', count: 2 },
    ]);

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };
    await getTestsHandler({}, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.cambridge).toEqual([]);
    expect(payload.general).toEqual([
      expect.objectContaining({
        id: 71,
        typeLabel: 'General Reading',
        submissionCount: 2,
        deleteScope: 'general-reading',
      }),
    ]);
  });
});