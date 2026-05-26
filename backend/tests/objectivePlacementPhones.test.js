jest.mock('../models/User', () => ({}));
jest.mock('../models/ReadingTest', () => ({ findAll: jest.fn() }));
jest.mock('../models/ListeningTest', () => ({ findAll: jest.fn() }));
jest.mock('../models/ReadingSubmission', () => ({ findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() }));
jest.mock('../models/ListeningSubmission', () => ({ findAll: jest.fn(), findByPk: jest.fn() }));
jest.mock('../middlewares/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
}));
jest.mock('../middlewares/testPermissions', () => ({
  requireTestPermission: () => (_req, _res, next) => next(),
}));
jest.mock('../modules/placement/service', () => ({
  getPlacementContactsForRuntimeSubmissions: jest.fn(),
  getRuntimeSubmissionForAttemptItem: jest.fn(),
  syncRuntimeSubmissionForAttemptItem: jest.fn(),
}));

const ReadingTest = require('../models/ReadingTest');
const ListeningTest = require('../models/ListeningTest');
const ReadingSubmission = require('../models/ReadingSubmission');
const ListeningSubmission = require('../models/ListeningSubmission');
const placementService = require('../modules/placement/service');
const readingRouter = require('../routes/reading-submission');
const listeningRouter = require('../routes/listening-submission');

const getRouteHandler = (router, path, method) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('objective placement phone backfill', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /reading-submissions/admin/list backfills phone for placement submissions', async () => {
    const handler = getRouteHandler(readingRouter, '/admin/list', 'get');

    ReadingSubmission.findAll.mockResolvedValue([
      {
        id: 301,
        testId: '13',
        toJSON: () => ({ id: 301, testId: '13', userName: 'Unknown', User: null }),
      },
    ]);
    ReadingTest.findAll.mockResolvedValue([
      { id: 13, title: 'Reading #13', classCode: 'R13', teacherName: 'Teacher Review' },
    ]);
    placementService.getPlacementContactsForRuntimeSubmissions.mockResolvedValue(
      new Map([['301', { studentName: 'Placement Student', studentPhone: '0912345678' }]])
    );

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };

    await handler({}, res);

    expect(placementService.getPlacementContactsForRuntimeSubmissions).toHaveBeenCalledWith({
      runtimeSubmissionModel: 'reading',
      runtimeSubmissionIds: [301],
    });
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 301,
        userName: 'Placement Student',
        userPhone: '0912345678',
      }),
    ]);
  });

  test('GET /reading-submissions/:submissionId backfills placement name and phone for unknown legacy rows', async () => {
    const handler = getRouteHandler(readingRouter, '/:submissionId', 'get');

    ReadingSubmission.findByPk.mockResolvedValue({
      id: 302,
      toJSON: () => ({ id: 302, userName: 'Unknown', userPhone: null }),
    });
    placementService.getPlacementContactsForRuntimeSubmissions.mockResolvedValue(
      new Map([['302', { studentName: 'Placement Detail', studentPhone: '0911002200' }]])
    );

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };

    await handler({ params: { submissionId: '302' } }, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 302,
        userName: 'Placement Detail',
        userPhone: '0911002200',
      })
    );
  });

  test('POST /reading-submissions/:testId/autosave uses placement student name for anonymous attempts', async () => {
    const handler = getRouteHandler(readingRouter, '/:testId/autosave', 'post');
    const createdAt = new Date('2026-05-26T03:10:00.000Z');

    placementService.getRuntimeSubmissionForAttemptItem.mockResolvedValue({
      attemptItem: { attemptItemToken: 'item_reading_active' },
      attempt: { studentName: 'Placement Active Student' },
      submission: null,
    });
    ReadingSubmission.create.mockResolvedValue({
      id: 777,
      lastSavedAt: createdAt,
      expiresAt: null,
    });

    const req = {
      params: { testId: '13' },
      body: {
        placementAttemptItemToken: 'item_reading_active',
        answers: { q1: 'A' },
      },
    };
    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };

    await handler(req, res);

    expect(ReadingSubmission.create).toHaveBeenCalledWith(
      expect.objectContaining({
        testId: '13',
        userId: null,
        userName: 'Placement Active Student',
        finished: false,
      })
    );
    expect(placementService.syncRuntimeSubmissionForAttemptItem).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptItemToken: 'item_reading_active',
        runtimeSubmissionModel: 'reading',
        runtimeSubmissionId: 777,
        status: 'started',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('GET /listening-submissions/admin/list backfills phone for placement submissions', async () => {
    const handler = getRouteHandler(listeningRouter, '/admin/list', 'get');

    ListeningSubmission.findAll.mockResolvedValue([
      {
        id: 401,
        testId: 9,
        toJSON: () => ({
          id: 401,
          testId: 9,
          userName: 'Placement Listener',
          User: null,
          answers: {},
          details: [],
          correct: 0,
          total: 0,
          scorePercentage: 0,
        }),
      },
    ]);
    ListeningTest.findAll.mockResolvedValue([
      { id: 9, title: 'Listening #9', classCode: 'L9', teacherName: 'Teacher Review', questions: '[]', partInstructions: '[]' },
    ]);
    placementService.getPlacementContactsForRuntimeSubmissions.mockResolvedValue(
      new Map([['401', { studentName: 'Placement Listener', studentPhone: '0987654321' }]])
    );

    const res = {
      json: jest.fn(),
      status: jest.fn(function status() { return this; }),
    };

    await handler({}, res);

    expect(placementService.getPlacementContactsForRuntimeSubmissions).toHaveBeenCalledWith({
      runtimeSubmissionModel: 'listening',
      runtimeSubmissionIds: [401],
    });
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 401,
        userName: 'Placement Listener',
        userPhone: '0987654321',
      }),
    ]);
  });
});