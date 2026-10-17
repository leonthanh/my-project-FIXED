jest.mock('../db', () => ({
  transaction: jest.fn(async (callback) => callback({ transaction: true })),
}));

jest.mock('../models', () => ({
  CambridgeReading: { findAll: jest.fn(), destroy: jest.fn() },
  CambridgeListening: { findAll: jest.fn(), destroy: jest.fn() },
  CambridgeSubmission: { findAll: jest.fn(), destroy: jest.fn() },
  GatewayReading: { rawAttributes: { id: {}, title: {} }, bulkCreate: jest.fn() },
  GatewayListening: { rawAttributes: { id: {}, title: {} }, bulkCreate: jest.fn() },
  GatewaySubmission: { rawAttributes: { id: {}, score: {} }, bulkCreate: jest.fn() },
}));

const sequelize = require('../db');
const models = require('../models');
const migrateGatewayData = require('../scripts/migrate-gateway-data');

describe('Gateway data migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.CambridgeReading.findAll.mockResolvedValue([
      { id: 12, title: 'Gateway Reading', testType: 'gateway-reading-writing' },
    ]);
    models.CambridgeListening.findAll.mockResolvedValue([]);
    models.CambridgeSubmission.findAll.mockResolvedValue([
      { id: 34, testId: 12, testType: 'gateway-reading-writing', score: 43 },
    ]);
  });

  test('copies Gateway rows with IDs intact and deletes source rows in one transaction', async () => {
    await expect(migrateGatewayData()).resolves.toEqual({
      readingTests: 1,
      listeningTests: 0,
      submissions: 1,
    });

    const transaction = { transaction: true };
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(models.GatewayReading.bulkCreate).toHaveBeenCalledWith(
      [{ id: 12, title: 'Gateway Reading', testType: 'gateway-reading-writing' }],
      expect.objectContaining({ transaction, updateOnDuplicate: ['title'] })
    );
    expect(models.CambridgeReading.destroy).toHaveBeenCalledWith({
      where: { id: { [require('sequelize').Op.in]: [12] } },
      transaction,
    });
    expect(models.GatewaySubmission.bulkCreate).toHaveBeenCalledWith(
      [{ id: 34, testId: 12, testType: 'gateway-reading-writing', score: 43 }],
      expect.objectContaining({ transaction, updateOnDuplicate: ['score'] })
    );
    expect(models.CambridgeSubmission.destroy).toHaveBeenCalledWith({
      where: { id: { [require('sequelize').Op.in]: [34] } },
      transaction,
    });
  });
});
