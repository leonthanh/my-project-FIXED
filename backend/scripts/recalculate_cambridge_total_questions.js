/*
Usage:
  node backend/scripts/recalculate_cambridge_total_questions.js            # dry-run (prints changes)
  node backend/scripts/recalculate_cambridge_total_questions.js --apply    # apply updates
  node backend/scripts/recalculate_cambridge_total_questions.js --scope=reading|listening|both
  node backend/scripts/recalculate_cambridge_total_questions.js --testType=ket-reading

Optional security (endpoint only): set ADMIN_KEY in backend env and send header x-admin-key.
*/

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sequelize = require('../db');
const { recalculateCambridgeTotalQuestions } = require('../modules/cambridge/maintenance/service');

const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const hit = args.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

const scope = (getArg('scope') || 'both').toLowerCase();
const testType = getArg('testType');
const apply = args.includes('--apply');

(async () => {
  try {
    await sequelize.authenticate();
    const result = await recalculateCambridgeTotalQuestions({
      query: {
        scope,
        testType,
        dryRun: !apply,
      },
    });

    console.log(`\nCambridge totalQuestions recalculation`);
    console.log(`scope=${scope} testType=${testType || '(any)'} apply=${apply}`);
    console.log(`total tests scanned: ${result.totalCount}`);
    console.log(`tests needing update: ${result.changedCount}`);

    if (result.changedCount > 0) {
      console.table(result.changes.slice(0, 50));
      if (result.changedCount > 50) {
        console.log(`... and ${result.changedCount - 50} more`);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
