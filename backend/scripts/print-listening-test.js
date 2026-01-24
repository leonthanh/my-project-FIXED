const sequelize = require('../db');
const ListeningTest = require('../models/ListeningTest');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { id: null };
  for (const a of args) {
    if (a.startsWith('--id=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isFinite(n)) out.id = n;
    }
  }
  return out;
};

(async () => {
  const opts = parseArgs();
  if (!opts.id) {
    console.error('Usage: node print-listening-test.js --id=123');
    process.exit(1);
  }

  await sequelize.authenticate();
  const t = await ListeningTest.findByPk(opts.id);
  if (!t) {
    console.error('Test not found', opts.id);
    await sequelize.close();
    process.exit(1);
  }

  const obj = t.toJSON ? t.toJSON() : t;
  console.log(JSON.stringify({ id: opts.id, partInstructions: obj.partInstructions, questions: obj.questions }, null, 2));

  await sequelize.close();
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  try { await sequelize.close(); } catch (_) {}
  process.exit(1);
});