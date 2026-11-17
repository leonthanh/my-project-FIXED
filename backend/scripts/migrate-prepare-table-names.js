const sequelize = require("../db");

const TABLE_RENAMES = [
  ["exam_levels", "prepare_levels"],
  ["exam_level_tests", "prepare_tests"],
  ["exam_level_submissions", "prepare_submissions"],
];

const normalizeTableName = (table) =>
  String(table?.tableName || table?.name || table)
    .split(".")
    .pop()
    .replace(/[`"]/g, "")
    .toLowerCase();

const migratePrepareTableNames = async ({ dryRun = false } = {}) => {
  const existingTables = new Set(
    (await sequelize.getQueryInterface().showAllTables()).map(normalizeTableName)
  );
  const conflicts = TABLE_RENAMES.filter(
    ([source, target]) => existingTables.has(source) && existingTables.has(target)
  );

  if (conflicts.length) {
    const conflictNames = conflicts.map(([source, target]) => `${source} and ${target}`);
    throw new Error(
      `Cannot rename Prepare tables because both old and new tables exist: ${conflictNames.join(", ")}. Back up and reconcile these tables before starting the backend.`
    );
  }

  const tablesToRename = TABLE_RENAMES.filter(
    ([source, target]) => existingTables.has(source) && !existingTables.has(target)
  );
  if (!tablesToRename.length || dryRun) return tablesToRename.map(([, target]) => target);

  const renameClause = tablesToRename
    .map(([source, target]) => `\`${source}\` TO \`${target}\``)
    .join(", ");
  await sequelize.query(`RENAME TABLE ${renameClause}`);

  return tablesToRename.map(([, target]) => target);
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");

  if (dryRun === apply) {
    throw new Error("Usage: node scripts/migrate-prepare-table-names.js --dry-run | --apply");
  }

  sequelize
    .authenticate()
    .then(() => migratePrepareTableNames({ dryRun }))
    .then((tables) => {
      if (dryRun) {
        console.log("Prepare table rename dry run:", tables.length ? tables : "no changes");
        return;
      }
      console.log("Prepare tables renamed:", tables.length ? tables : "no changes");
    })
    .catch((error) => {
      console.error("Prepare table migration failed:", error);
      process.exitCode = 1;
    })
    .finally(() => sequelize.close());
}

module.exports = migratePrepareTableNames;
