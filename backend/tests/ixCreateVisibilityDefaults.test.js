jest.mock('../models/ReadingTest', () => ({
  create: jest.fn(),
}));
jest.mock('../models/ReadingSubmission', () => ({}));
jest.mock('../models/ListeningTest', () => ({
  create: jest.fn(),
}));
jest.mock('../models/ListeningSubmission', () => ({}));
jest.mock('../models/WritingTests', () => ({
  count: jest.fn(),
  create: jest.fn(),
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

const ReadingTest = require('../models/ReadingTest');
const ListeningTest = require('../models/ListeningTest');
const WritingTest = require('../models/WritingTests');

const readingRouter = require('../routes/readingTest');
const listeningRouter = require('../routes/listeningTests');
const writingRouter = require('../routes/writingTest');

const getRouteHandler = (router, path, method) => {
  const layer = router.stack.find((entry) => entry.route?.path === path && entry.route.methods?.[method]);

  if (!layer) {
    throw new Error(`Could not find ${method.toUpperCase()} ${path} route.`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('IX create visibility defaults', () => {
  const createReadingHandler = getRouteHandler(readingRouter, '/', 'post');
  const createListeningHandler = getRouteHandler(listeningRouter, '/', 'post');
  const createWritingHandler = getRouteHandler(writingRouter, '/', 'post');
  const createWritingWithImageHandler = getRouteHandler(writingRouter, '/with-image', 'post');

  const makeRes = () => {
    const res = {
      json: jest.fn(),
      status: jest.fn(() => res),
    };
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    WritingTest.count.mockResolvedValue(10);
    ReadingTest.create.mockResolvedValue({ id: 11 });
    ListeningTest.create.mockResolvedValue({ id: 12 });
    WritingTest.create.mockResolvedValue({ id: 13 });
  });

  test('reading create defaults new tests to visible', async () => {
    const req = {
      body: {
        title: 'IX Reading 1',
        classCode: 'READ-01',
        teacherName: 'Admin User',
        showResultModal: true,
        passages: [],
      },
    };
    const res = makeRes();

    await createReadingHandler(req, res);

    expect(ReadingTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'IX Reading 1',
        isArchived: false,
      })
    );
  });

  test('listening create defaults new tests to visible', async () => {
    const req = {
      body: {
        title: 'IX Listening 1',
        classCode: 'LIST-01',
        teacherName: 'Admin User',
        passages: JSON.stringify([
          {
            title: 'Part 1',
            sections: [
              {
                questionType: 'fill',
                questions: [
                  {
                    questionText: 'Question 1',
                    correctAnswer: 'A',
                  },
                ],
              },
            ],
          },
        ]),
        showResultModal: true,
      },
      files: [],
    };
    const res = makeRes();

    await createListeningHandler(req, res);

    expect(ListeningTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'LIST-01',
        isArchived: false,
      })
    );
  });

  test('writing create defaults new tests to visible', async () => {
    const req = {
      body: {
        task1: 'Task 1',
        task2: 'Task 2',
        classCode: 'WRITE-01',
        teacherName: 'Admin User',
        testType: 'writing',
      },
    };
    const res = makeRes();

    await createWritingHandler(req, res);

    expect(WritingTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'WRITE-01',
        isArchived: false,
      })
    );
  });

  test('writing with-image create also defaults new tests to visible', async () => {
    const req = {
      body: {
        task1: 'Task 1',
        task2: 'Task 2',
        classCode: 'WRITE-02',
        teacherName: 'Admin User',
        testType: 'writing',
      },
      file: null,
    };
    const res = makeRes();

    await createWritingWithImageHandler(req, res);

    expect(WritingTest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        classCode: 'WRITE-02',
        isArchived: false,
      })
    );
  });
});