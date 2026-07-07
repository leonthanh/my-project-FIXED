/**
 * Migration: Rename internal "bay" platform/testType references to "fce".
 *
 * Run with:
 *   node backend/scripts/migrate-bay-to-fce.js --dry-run
 *   node backend/scripts/migrate-bay-to-fce.js --apply
 */

const sequelize = require('../db');
const {
  CambridgeReading,
  CambridgeListening,
  CambridgeSubmission,
  PlacementPackageItem,
  PlacementAttemptItem,
} = require('../models');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const apply = args.includes('--apply');

if (!dryRun && !apply) {
  console.error('Usage: node migrate-bay-to-fce.js --dry-run | --apply');
  process.exit(1);
}

const TEST_TYPE_MAP = {
  'bay-reading': 'fce-reading',
  'bay-listening': 'fce-listening',
};

const PLATFORM_MAP = {
  bay: 'fce',
};

async function updateTestType(Model, column = 'testType') {
  const tableName = Model.getTableName();
  const updates = [];

  for (const [oldValue, newValue] of Object.entries(TEST_TYPE_MAP)) {
    const [affectedCount] = dryRun
      ? await Model.findAll({
          where: { [column]: oldValue },
          attributes: ['id'],
          raw: true,
        }).then((rows) => [rows.length])
      : await Model.update(
          { [column]: newValue },
          { where: { [column]: oldValue } }
        );

    updates.push({ tableName, column, oldValue, newValue, affectedCount });
  }

  return updates;
}

async function updatePlatform(Model) {
  const tableName = Model.getTableName();
  const updates = [];

  for (const [oldValue, newValue] of Object.entries(PLATFORM_MAP)) {
    const [affectedCount] = dryRun
      ? await Model.findAll({
          where: { platform: oldValue },
          attributes: ['id'],
          raw: true,
        }).then((rows) => [rows.length])
      : await Model.update(
          { platform: newValue },
          { where: { platform: oldValue } }
        );

    updates.push({ tableName, column: 'platform', oldValue, newValue, affectedCount });
  }

  return updates;
}

async function updateSubtitle(Model) {
  const tableName = Model.getTableName();
  const rows = await Model.findAll({
    where: { subtitle: { [sequelize.Op.like]: '%Cty Bay%' } },
    attributes: ['id', 'subtitle'],
    raw: true,
  });

  if (dryRun) {
    return [{ tableName, column: 'subtitle', oldValue: 'contains "Cty Bay"', newValue: 'contains "FCE"', affectedCount: rows.length }];
  }

  let affectedCount = 0;
  for (const row of rows) {
    const newSubtitle = String(row.subtitle || '').replace(/Cty Bay/g, 'FCE');
    await Model.update({ subtitle: newSubtitle }, { where: { id: row.id } });
    affectedCount += 1;
  }

  return [{ tableName, column: 'subtitle', oldValue: 'contains "Cty Bay"', newValue: 'contains "FCE"', affectedCount }];
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log(`Database connected. Mode: ${dryRun ? 'DRY RUN' : 'APPLY'}`);

    const results = [];

    results.push(...(await updateTestType(CambridgeReading)));
    results.push(...(await updateTestType(CambridgeListening)));
    results.push(...(await updateTestType(CambridgeSubmission)));

    results.push(...(await updatePlatform(PlacementPackageItem)));
    results.push(...(await updateTestType(PlacementPackageItem)));
    results.push(...(await updateSubtitle(PlacementPackageItem)));

    results.push(...(await updatePlatform(PlacementAttemptItem)));
    results.push(...(await updateTestType(PlacementAttemptItem)));
    results.push(...(await updateSubtitle(PlacementAttemptItem)));

    console.table(results);

    const total = results.reduce((sum, r) => sum + r.affectedCount, 0);
    console.log(`\nTotal rows ${dryRun ? 'would be' : ''} affected: ${total}`);

    if (!dryRun) {
      console.log('Migration applied successfully.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
