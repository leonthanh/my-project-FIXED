jest.mock('../models/PlacementPackage', () => ({
  findOne: jest.fn(),
  findByPk: jest.fn(),
}));
jest.mock('../models/PlacementPackageItem', () => ({
  findAll: jest.fn(),
}));
jest.mock('../models/ReadingSubmission', () => ({}));
jest.mock('../models/ListeningSubmission', () => ({}));
jest.mock('../models/Submission', () => ({}));
jest.mock('../models/CambridgeSubmission', () => ({}));
jest.mock('../models/PlacementAttempt', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../models/PlacementAttemptItem', () => ({
  findAll: jest.fn(),
  bulkCreate: jest.fn(),
  destroy: jest.fn(),
}));

const PlacementPackage = require('../models/PlacementPackage');
const PlacementPackageItem = require('../models/PlacementPackageItem');
const PlacementAttempt = require('../models/PlacementAttempt');
const PlacementAttemptItem = require('../models/PlacementAttemptItem');
const placementService = require('../modules/placement/service');

describe('placement attempt resume sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds missing newly published package items when resuming an active attempt', async () => {
    const placementPackage = {
      id: 1,
      ownerUserId: 1,
      shareToken: 'pkg_share',
      title: 'Teacher Placement Package',
      toJSON() {
        return {
          id: this.id,
          ownerUserId: this.ownerUserId,
          shareToken: this.shareToken,
          title: this.title,
        };
      },
    };
    const activeAttempt = {
      id: 11,
      packageId: 1,
      ownerUserId: 1,
      attemptToken: 'attempt_existing',
      studentName: 'banh beo',
      studentPhone: '0784136678',
      status: 'active',
      update: jest.fn(async function update(values) {
        Object.assign(this, values);
        return this;
      }),
      toJSON() {
        return {
          id: this.id,
          packageId: this.packageId,
          ownerUserId: this.ownerUserId,
          attemptToken: this.attemptToken,
          studentName: this.studentName,
          studentPhone: this.studentPhone,
          status: this.status,
        };
      },
    };
    const existingWritingItem = {
      id: 801,
      attemptId: 11,
      packageItemId: 77,
      attemptItemToken: 'item_writing',
      platform: 'ix',
      skill: 'writing',
      testId: '27',
      testType: 'ix-writing',
      title: 'Writing 14 (old title)',
      subtitle: 'PRE-IX-1A - ECT • Teacher Thảo Lưu',
      badge: 'IX',
      questionsLabel: null,
      durationLabel: null,
      sortOrder: 8,
      status: 'assigned',
      runtimeSubmissionId: null,
      startedAt: null,
      submittedAt: null,
      update: jest.fn(async function update(values) {
        Object.assign(this, values);
        return this;
      }),
      toJSON() {
        return { ...this };
      },
    };
    const refreshedWritingItem = {
      ...existingWritingItem,
      title: 'Writing 14',
      packageItemId: 1077,
    };
    const addedReadingItem = {
      id: 802,
      attemptId: 11,
      packageItemId: 1013,
      attemptItemToken: 'item_reading4',
      platform: 'ix',
      skill: 'reading',
      testId: '13',
      testType: 'ix-reading',
      title: 'Reading 4',
      subtitle: '177-IX-2A-MCT • Teacher Thảo Lưu',
      badge: 'IX',
      questionsLabel: null,
      durationLabel: null,
      sortOrder: 10,
      status: 'assigned',
      runtimeSubmissionId: null,
      startedAt: null,
      submittedAt: null,
      toJSON() {
        return { ...this };
      },
    };

    PlacementPackage.findOne.mockResolvedValue(placementPackage);
    PlacementPackage.findByPk.mockResolvedValue(placementPackage);
    PlacementAttempt.findOne.mockResolvedValue(activeAttempt);
    PlacementPackageItem.findAll.mockResolvedValue([
      {
        id: 1077,
        packageId: 1,
        platform: 'ix',
        skill: 'writing',
        testId: '27',
        testType: 'ix-writing',
        title: 'Writing 14',
        subtitle: 'PRE-IX-1A - ECT • Teacher Thảo Lưu',
        badge: 'IX',
        questionsLabel: null,
        durationLabel: null,
        sortOrder: 8,
      },
      {
        id: 1013,
        packageId: 1,
        platform: 'ix',
        skill: 'reading',
        testId: '13',
        testType: 'ix-reading',
        title: 'Reading 4',
        subtitle: '177-IX-2A-MCT • Teacher Thảo Lưu',
        badge: 'IX',
        questionsLabel: null,
        durationLabel: null,
        sortOrder: 10,
      },
    ]);
    PlacementAttemptItem.findAll
      .mockResolvedValueOnce([existingWritingItem])
      .mockResolvedValueOnce([refreshedWritingItem, addedReadingItem]);

    const result = await placementService.createOrResumeAttemptForShareToken({
      shareToken: 'pkg_share',
      studentName: 'bánh bèo',
      studentPhone: '0784136678',
    });

    expect(existingWritingItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        packageItemId: 1077,
        title: 'Writing 14',
      })
    );
    expect(PlacementAttemptItem.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        attemptId: 11,
        packageItemId: 1013,
        platform: 'ix',
        skill: 'reading',
        testId: '13',
        testType: 'ix-reading',
        title: 'Reading 4',
        subtitle: '177-IX-2A-MCT • Teacher Thảo Lưu',
        sortOrder: 10,
        status: 'assigned',
      }),
    ]);
    expect(PlacementAttemptItem.destroy).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.title)).toEqual(['Writing 14', 'Reading 4']);
    expect(result.summary.total).toBe(2);
    expect(result.studentPhone).toBe('0784136678');
  });
});