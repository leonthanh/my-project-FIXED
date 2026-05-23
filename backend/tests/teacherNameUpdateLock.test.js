jest.mock('../models/ReadingTest', () => ({
  findByPk: jest.fn(),
}));
jest.mock('../models/ReadingSubmission', () => ({}));
jest.mock('../models/ListeningTest', () => ({
  findByPk: jest.fn(),
}));
jest.mock('../models/ListeningSubmission', () => ({}));
jest.mock('../models/WritingTests', () => ({
  findByPk: jest.fn(),
}));
jest.mock('../modules/placement/service', () => ({}));
jest.mock('../utils/readingQuestionUtils', () => ({
  countClozeBlanks: jest.fn(() => 0),
}));
jest.mock('../utils/flowchartHelpers', () => ({
  countFlowchartQuestionSlots: jest.fn(() => 0),
  getFlowchartBlankEntries: jest.fn(() => []),
}));
jest.mock('../utils/listeningTableQuestions', () => ({
  countListeningTableBlanks: jest.fn(() => 0),
  getListeningSectionType: jest.fn(() => 'fill'),
  getListeningTableBlankEntries: jest.fn(() => []),
  normalizeListeningPassages: jest.fn((value) => value),
  LISTENING_CLOZE_TYPE: 'listening-cloze',
}));
jest.mock('../middlewares/auth', () => ({
  requireAuth: (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../middlewares/testPermissions', () => ({
  requireTestPermission: () => (_req, _res, next) => next(),
}));
jest.mock('../models', () => ({
  CambridgeListening: {
    findByPk: jest.fn(),
  },
  CambridgeReading: {
    findByPk: jest.fn(),
  },
}));

const ReadingTest = require('../models/ReadingTest');
const ListeningTest = require('../models/ListeningTest');
const WritingTest = require('../models/WritingTests');
const { CambridgeListening, CambridgeReading } = require('../models');

const readingRouter = require('../routes/readingTest');
const listeningRouter = require('../routes/listeningTests');
const writingRouter = require('../routes/writingTest');
const readingService = require('../modules/cambridge/reading/service');
const listeningService = require('../modules/cambridge/listening/service');

const getRouteHandler = (router, path, method) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('teacherName update lock', () => {
  const updateReadingHandler = getRouteHandler(readingRouter, '/:id', 'put');
  const updateListeningHandler = getRouteHandler(listeningRouter, '/:id', 'put');
  const updateWritingHandler = getRouteHandler(writingRouter, '/:id', 'put');

  const makeRes = () => {
    const res = {
      json: jest.fn(() => res),
      status: jest.fn(() => res),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('IX reading update preserves the stored teacher name', async () => {
    const testRecord = {
      teacherName: 'Original Teacher',
      update: jest.fn(),
      toJSON: jest.fn(() => ({ passages: [], teacherName: 'Original Teacher' })),
    };
    ReadingTest.findByPk.mockResolvedValue(testRecord);

    await updateReadingHandler(
      {
        params: { id: '12' },
        body: { classCode: 'NEW-CLASS', teacherName: 'Mutated Teacher' },
      },
      makeRes()
    );

    expect(testRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'NEW-CLASS',
        teacherName: 'Original Teacher',
      })
    );
  });

  test('IX listening update preserves the stored teacher name', async () => {
    const testRecord = {
      teacherName: 'Original Teacher',
      mainAudioUrl: '',
      partAudioUrls: {},
      update: jest.fn(),
      reload: jest.fn(),
    };
    ListeningTest.findByPk.mockResolvedValue(testRecord);

    await updateListeningHandler(
      {
        params: { id: '22' },
        body: { classCode: 'NEW-CLASS', teacherName: 'Mutated Teacher' },
        files: [],
      },
      makeRes()
    );

    expect(testRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'NEW-CLASS',
        teacherName: 'Original Teacher',
      })
    );
  });

  test('writing update preserves the stored teacher name', async () => {
    const testRecord = {
      teacherName: 'Original Teacher',
      task1Image: '/uploads/existing.png',
      update: jest.fn(),
    };
    WritingTest.findByPk.mockResolvedValue(testRecord);

    await updateWritingHandler(
      {
        params: { id: '32' },
        body: {
          classCode: 'NEW-CLASS',
          teacherName: 'Mutated Teacher',
          task1: 'Task 1',
          task2: 'Task 2',
          questions: [],
          testType: 'writing',
        },
      },
      makeRes()
    );

    expect(testRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'NEW-CLASS',
        teacherName: 'Original Teacher',
      })
    );
  });

  test('Orange reading update preserves the stored teacher name', async () => {
    const testRecord = {
      teacherName: 'Original Teacher',
      title: 'Test title',
      classCode: 'CLASS-1',
      testType: 'ket-reading',
      parts: [],
      totalQuestions: 0,
      status: 'published',
      update: jest.fn(),
    };
    CambridgeReading.findByPk.mockResolvedValue(testRecord);

    await readingService.updateReadingTest({
      id: 41,
      body: { teacherName: 'Mutated Teacher', classCode: 'NEW-CLASS' },
    });

    expect(testRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'NEW-CLASS',
        teacherName: 'Original Teacher',
      })
    );
  });

  test('Orange listening update preserves the stored teacher name', async () => {
    const testRecord = {
      teacherName: 'Original Teacher',
      title: 'Test title',
      classCode: 'CLASS-1',
      testType: 'ket-listening',
      mainAudioUrl: '',
      parts: [],
      totalQuestions: 0,
      status: 'published',
      update: jest.fn(),
    };
    CambridgeListening.findByPk.mockResolvedValue(testRecord);

    await listeningService.updateListeningTest({
      id: 51,
      body: { teacherName: 'Mutated Teacher', classCode: 'NEW-CLASS' },
    });

    expect(testRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'NEW-CLASS',
        teacherName: 'Original Teacher',
      })
    );
  });
});