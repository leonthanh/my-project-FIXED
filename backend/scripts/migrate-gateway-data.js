const { Op } = require('sequelize');
const sequelize = require('../db');
const {
  CambridgeListening,
  CambridgeReading,
  CambridgeSubmission,
  GatewayListening,
  GatewayReading,
  GatewaySubmission,
} = require('../models');

const migrateGatewayRows = async (sourceModel, targetModel, transaction) => {
  const rows = await sourceModel.findAll({
    where: { testType: { [Op.like]: 'gateway-%' } },
    raw: true,
    transaction,
  });

  if (!rows.length) {
    return 0;
  }

  const updateOnDuplicate = Object.keys(targetModel.rawAttributes).filter((field) => field !== 'id');
  await targetModel.bulkCreate(rows, { transaction, updateOnDuplicate });
  await sourceModel.destroy({
    where: { id: { [Op.in]: rows.map(({ id }) => id) } },
    transaction,
  });

  return rows.length;
};

const migrateGatewayData = async () =>
  sequelize.transaction(async (transaction) => {
    const readingTests = await migrateGatewayRows(CambridgeReading, GatewayReading, transaction);
    const listeningTests = await migrateGatewayRows(CambridgeListening, GatewayListening, transaction);
    const submissions = await migrateGatewayRows(
      CambridgeSubmission,
      GatewaySubmission,
      transaction
    );

    return { readingTests, listeningTests, submissions };
  });

module.exports = migrateGatewayData;
