/**
 * ensure-db-columns.js
 * An toàn thêm các cột còn thiếu vào DB mà không làm hỏng dữ liệu hiện có.
 * Chạy tự động khi server khởi động.
 */

async function columnExists(sequelize, table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = :table
       AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return Number(rows[0]?.cnt) > 0;
}

async function addColumnIfMissing(sequelize, table, column, definition) {
  const exists = await columnExists(sequelize, table, column);
  if (!exists) {
    await sequelize.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );
    console.log(`✅ Migration: added column ${table}.${column}`);
  }
}

async function ensureDbColumns(sequelize) {
  try {
    // --- cambridge_submissions ---
    await addColumnIfMissing(sequelize, 'cambridge_submissions', 'finished',
      'BOOLEAN DEFAULT TRUE');
    await addColumnIfMissing(sequelize, 'cambridge_submissions', 'expiresAt',
      'DATETIME NULL');
    await addColumnIfMissing(sequelize, 'cambridge_submissions', 'lastSavedAt',
      'DATETIME NULL');
    await addColumnIfMissing(sequelize, 'cambridge_submissions', 'progressMeta',
      'JSON NULL');
    await addColumnIfMissing(sequelize, 'cambridge_submissions', 'feedbackSeen',
      'BOOLEAN DEFAULT FALSE');

    // --- submissions (writing) ---
    await addColumnIfMissing(sequelize, 'submissions', 'bandTask1', 'FLOAT NULL');
    await addColumnIfMissing(sequelize, 'submissions', 'bandTask2', 'FLOAT NULL');
    await addColumnIfMissing(sequelize, 'submissions', 'bandOverall', 'FLOAT NULL');

    // --- test visibility flags ---
    await addColumnIfMissing(sequelize, 'writing_tests', 'isArchived', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(sequelize, 'reading_tests', 'isArchived', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(sequelize, 'listening_tests', 'isArchived', 'BOOLEAN NOT NULL DEFAULT FALSE');

    console.log('✅ DB column check complete.');
  } catch (err) {
    // Non-fatal: log and continue so server can still start
    console.warn('⚠️ ensureDbColumns warning:', err?.message || err);
  }
}

module.exports = ensureDbColumns;
