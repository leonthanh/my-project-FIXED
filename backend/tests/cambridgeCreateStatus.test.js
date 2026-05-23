jest.mock('../models', () => ({
  CambridgeListening: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  CambridgeReading: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { CambridgeListening, CambridgeReading } = require('../models');
const readingService = require('../modules/cambridge/reading/service');
const listeningService = require('../modules/cambridge/listening/service');

describe('Cambridge create status defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createReadingTest defaults new tests to published when no status is provided', async () => {
    CambridgeReading.create.mockResolvedValue({ id: 101 });

    await readingService.createReadingTest({
      body: {
        title: 'AUTHENTIC PRACTICE TEST 1',
        classCode: 'AUTH-01',
        teacherName: 'Admin User',
        testType: 'ket-reading',
        parts: [],
        totalQuestions: 0,
      },
    });

    expect(CambridgeReading.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'AUTHENTIC PRACTICE TEST 1',
        classCode: 'AUTH-01',
        status: 'published',
        testType: 'ket-reading',
      })
    );
  });

  test('createListeningTest preserves an explicit draft status on create', async () => {
    CambridgeListening.create.mockResolvedValue({ id: 202 });

    await listeningService.createListeningTest({
      body: {
        title: 'Movers Practice 1',
        classCode: 'MOV-01',
        teacherName: 'Teacher User',
        testType: 'movers-listening',
        mainAudioUrl: '',
        parts: [],
        totalQuestions: 25,
        status: 'draft',
      },
    });

    expect(CambridgeListening.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        testType: 'movers-listening',
      })
    );
  });
});