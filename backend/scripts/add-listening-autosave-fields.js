const sequelize = require('../db');

// Script để thêm/loại bỏ các cột autosave trong bảng listening_submissions
// Usage:
//  node scripts/add-listening-autosave-fields.js         # chạy migration (up)
//  node scripts/add-listening-autosave-fields.js --down  # rollback (drop cols)

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows && rows.length > 0;
}

async function up() {
  const table = 'listening_submissions';
  try {
    console.log('Checking existing columns...');
    const haveExpires = await columnExists(table, 'expiresAt');
    const haveFinished = await columnExists(table, 'finished');
    const haveLastSaved = await columnExists(table, 'lastSavedAt');

    if (!haveExpires) {
      console.log('Adding column expiresAt...');
      await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN expiresAt DATETIME NULL`);
    } else console.log('Column expiresAt already exists.');

    if (!haveFinished) {
      console.log('Adding column finished...');
      await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN finished TINYINT(1) NOT NULL DEFAULT 0`);
    } else console.log('Column finished already exists.');

    if (!haveLastSaved) {
      console.log('Adding column lastSavedAt...');
      await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN lastSavedAt DATETIME NULL`);
    } else console.log('Column lastSavedAt already exists.');

    console.log('Migration up completed.');
  } catch (err) {
    console.error('Migration up failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

async function down() {
  const table = 'listening_submissions';
  try {
    console.log('Dropping columns if they exist...');
    if (await columnExists(table, 'lastSavedAt')) {
      console.log('Dropping lastSavedAt...');
      await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN lastSavedAt`);
    }
    if (await columnExists(table, 'finished')) {
      console.log('Dropping finished...');
      await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN finished`);
    }
    if (await columnExists(table, 'expiresAt')) {
      console.log('Dropping expiresAt...');
      await sequelize.query(`ALTER TABLE \`${table}\` DROP COLUMN expiresAt`);
    }

    console.log('Rollback completed.');
  } catch (err) {
    console.error('Rollback failed:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

const doDown = process.argv.includes('--down') || process.argv.includes('-d');
if (doDown) down(); else up();
