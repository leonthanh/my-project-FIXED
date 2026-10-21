const { Op } = require('sequelize');
const sequelize = require('../db');
const {
  CambridgeListening,
  CambridgeReading,
  CambridgeSubmission,
  GeneralListening,
  GeneralReading,
  GeneralSubmission,
  PlacementAttemptItem,
  PlacementPackageItem,
} = require('../models');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');

const READING_TYPES = ['general-reading', 'general-reading-60'];
const LISTENING_TYPES = ['general-listening'];
const TRANSFERS = [
  {
    name: 'General Reading tests',
    source: CambridgeReading,
    destination: GeneralReading,
    testTypes: READING_TYPES,
  },
  {
    name: 'General Listening tests',
    source: CambridgeListening,
    destination: GeneralListening,
    testTypes: LISTENING_TYPES,
  },
  {
    name: 'General submissions',
    source: CambridgeSubmission,
    destination: GeneralSubmission,
    testTypes: [...READING_TYPES, ...LISTENING_TYPES],
  },
];

const readTransferRows = async ({ source, testTypes, transaction }) =>
  source.findAll({
    where: { testType: { [Op.in]: testTypes } },
    raw: true,
    transaction,
  });

const assertNoDestinationConflicts = async ({ destination, rows, transaction }) => {
  if (!rows.length) return;

  const existing = await destination.findAll({
    where: { id: { [Op.in]: rows.map((row) => row.id) } },
    attributes: ['id'],
    raw: true,
    transaction,
  });
  if (existing.length) {
    const ids = existing.map((row) => row.id).join(', ');
    throw new Error(`${destination.getTableName()} already contains source IDs: ${ids}`);
  }
};

const moveRows = async ({ source, destination, rows, transaction }) => {
  if (!rows.length) return;

  await destination.bulkCreate(rows, { transaction });
  await source.destroy({
    where: { id: { [Op.in]: rows.map((row) => row.id) } },
    transaction,
  });
};

const normalizePlacementReferences = async (transaction) => {
  const options = { transaction };
  await PlacementAttemptItem.update(
    { runtimeSubmissionModel: 'general' },
    {
      where: {
        platform: 'general',
        testType: { [Op.in]: [...READING_TYPES.slice(0, 2), ...LISTENING_TYPES.slice(0, 1)] },
        runtimeSubmissionModel: { [Op.in]: ['cambridge', 'CambridgeSubmission'] },
      },
      ...options,
    }
  );

};

const main = async () => {
  if (dryRun === apply) {
    throw new Error('Usage: node migrate-general-to-dedicated-models.js --dry-run | --apply');
  }

  await sequelize.authenticate();
  await Promise.all(TRANSFERS.map(({ destination }) => destination.sync()));
  const transaction = apply ? await sequelize.transaction() : null;

  try {
    const transfers = [];
    for (const transfer of TRANSFERS) {
      const rows = await readTransferRows({ ...transfer, transaction });
      await assertNoDestinationConflicts({
        destination: transfer.destination,
        rows,
        transaction,
      });
      transfers.push({ ...transfer, rows });
    }

    if (dryRun) {
      console.table(
        transfers.map(({ name, rows }) => ({
          recordsToMove: rows.length,
          collection: name,
        }))
      );
      console.log('Dry run only. No General or Cambridge records were changed.');
      return;
    }

    for (const transfer of transfers) {
      await moveRows(transfer);
    }
    await normalizePlacementReferences(transaction);
    await transaction.commit();

    console.table(
      transfers.map(({ name, rows }) => ({
        recordsMoved: rows.length,
        collection: name,
      }))
    );
    console.log('General data moved to dedicated tables successfully.');
  } catch (error) {
    if (transaction) await transaction.rollback();
    throw error;
  } finally {
    await sequelize.close();
  }
};

main().catch((error) => {
  console.error('General model separation migration failed:', error);
  process.exitCode = 1;
});
