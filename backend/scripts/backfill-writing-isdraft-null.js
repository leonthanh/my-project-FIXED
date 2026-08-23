/*
  Maintenance: normalize legacy writing submissions where isDraft is NULL.

  Rule:
    - If submittedAt IS NULL => still an active draft => set isDraft = true
    - If submittedAt IS NOT NULL => finalized submission => set isDraft = false

  Dry-run by default.

  Usage:
    node scripts/backfill-writing-isdraft-null.js --dry-run
    node scripts/backfill-writing-isdraft-null.js --apply
*/

const sequelize = require('../db');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    dryRun: true,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--apply') {
      options.apply = true;
      options.dryRun = false;
      continue;
    }

    if (arg === '--dry-run') {
      options.apply = false;
      options.dryRun = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
};

const printUsage = () => {
  console.log('Usage: node scripts/backfill-writing-isdraft-null.js [--dry-run] [--apply]');
  console.log('Default mode is --dry-run.');
};

const toInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fetchNullStats = async () => {
  const [rows] = await sequelize.query(`
    SELECT
      COUNT(*) AS totalNull,
      SUM(CASE WHEN submittedAt IS NULL THEN 1 ELSE 0 END) AS draftNull,
      SUM(CASE WHEN submittedAt IS NOT NULL THEN 1 ELSE 0 END) AS finalizedNull
    FROM submissions
    WHERE isDraft IS NULL
  `);

  const first = rows?.[0] || {};
  return {
    totalNull: toInt(first.totalNull),
    draftNull: toInt(first.draftNull),
    finalizedNull: toInt(first.finalizedNull),
  };
};

const applyBackfill = async () => {
  const transaction = await sequelize.transaction();
  try {
    const [, draftMeta] = await sequelize.query(
      `
        UPDATE submissions
        SET isDraft = TRUE
        WHERE isDraft IS NULL AND submittedAt IS NULL
      `,
      { transaction }
    );

    const [, finalizedMeta] = await sequelize.query(
      `
        UPDATE submissions
        SET isDraft = FALSE
        WHERE isDraft IS NULL AND submittedAt IS NOT NULL
      `,
      { transaction }
    );

    await transaction.commit();

    return {
      updatedDraftRows: toInt(draftMeta?.affectedRows),
      updatedFinalizedRows: toInt(finalizedMeta?.affectedRows),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

(async () => {
  const options = parseArgs();
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  await sequelize.authenticate();

  console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY RUN'}`);

  const before = await fetchNullStats();
  console.log('Before:', before);

  if (before.totalNull === 0) {
    console.log('No legacy NULL isDraft rows found. Nothing to do.');
    await sequelize.close();
    process.exit(0);
  }

  if (!options.apply) {
    console.log('Dry-run only. Re-run with --apply to persist updates.');
    await sequelize.close();
    process.exit(0);
  }

  const result = await applyBackfill();
  console.log('Updated:', result);

  const after = await fetchNullStats();
  console.log('After:', after);

  if (after.totalNull > 0) {
    console.warn(
      'Backfill completed but some NULL rows remain. Check for concurrent writes and run again if needed.'
    );
  } else {
    console.log('Backfill completed successfully.');
  }

  await sequelize.close();
  process.exit(0);
})().catch(async (error) => {
  console.error('Backfill failed:', error);
  try {
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});
