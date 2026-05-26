jest.mock('../models/PlacementPackage', () => ({}));
jest.mock('../models/PlacementPackageItem', () => ({}));
jest.mock('../models/ReadingSubmission', () => ({}));
jest.mock('../models/ListeningSubmission', () => ({}));
jest.mock('../models/Submission', () => ({}));
jest.mock('../models/CambridgeSubmission', () => ({}));
jest.mock('../models/PlacementAttempt', () => ({
  findAll: jest.fn(),
}));
jest.mock('../models/PlacementAttemptItem', () => ({
  findAll: jest.fn(),
}));

const PlacementAttempt = require('../models/PlacementAttempt');
const PlacementAttemptItem = require('../models/PlacementAttemptItem');
const placementService = require('../modules/placement/service');

describe('placement runtime contact lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps anonymous runtime submissions back to placement student contacts', async () => {
    PlacementAttemptItem.findAll.mockResolvedValue([
      {
        id: 8,
        attemptId: 41,
        attemptItemToken: 'item_abc',
        runtimeSubmissionId: 901,
      },
    ]);
    PlacementAttempt.findAll.mockResolvedValue([
      {
        id: 41,
        studentName: 'Placement Student',
        studentPhone: ' 0912 345 678 ',
      },
    ]);

    const contacts = await placementService.getPlacementContactsForRuntimeSubmissions({
      runtimeSubmissionModel: 'reading',
      runtimeSubmissionIds: [901],
    });

    expect(PlacementAttemptItem.findAll).toHaveBeenCalledWith({
      where: {
        runtimeSubmissionModel: 'reading',
        runtimeSubmissionId: { [require('sequelize').Op.in]: [901] },
      },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    });
    expect(contacts.get('901')).toEqual({
      attemptId: 41,
      attemptItemToken: 'item_abc',
      studentName: 'Placement Student',
      studentPhone: '0912345678',
    });
  });
});