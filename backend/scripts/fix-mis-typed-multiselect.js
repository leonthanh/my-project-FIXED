/*
  Small maintenance script: detect questions that look like multi-select (e.g., correctAnswer contains comma-separated letters) but questionType !== 'multi-select', and convert them.
  Usage: node scripts/fix-mis-typed-multiselect.js --testId=3 [--apply]
*/
const sequelize = require('../db');
const ListeningTest = require('../models/ListeningTest');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { apply: false, testId: null };
  for (const a of args) {
    if (a === '--apply') out.apply = true;
    if (a.startsWith('--testId=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isFinite(n)) out.testId = n;
    }
  }
  return out;
};

const parseIfJsonString = (val) => {
  let v = val;
  let attempts = 0;
  while (typeof v === 'string' && attempts < 3) {
    try { v = JSON.parse(v); } catch (e) { break; }
    attempts++;
  }
  return v;
};

(async () => {
  const opts = parseArgs();
  if (!opts.testId) {
    console.error('Usage: node scripts/fix-mis-typed-multiselect.js --testId=3 [--apply]');
    process.exit(1);
  }

  await sequelize.authenticate();
  const t = await ListeningTest.findByPk(opts.testId);
  if (!t) {
    console.error('Test not found', opts.testId);
    await sequelize.close();
    process.exit(1);
  }

  const obj = t.toJSON ? t.toJSON() : t;
  let questions = parseIfJsonString(obj.questions);
  if (!Array.isArray(questions)) {
    console.log('Questions not an array, aborting');
    await sequelize.close();
    process.exit(1);
  }

  const toChange = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qType = String(q?.questionType || '').toLowerCase();
    const correctRaw = q?.correctAnswer ?? q?.answers ?? '';
    let text = '';
    if (typeof correctRaw === 'string') text = correctRaw;
    else if (Array.isArray(correctRaw)) text = correctRaw.join(',');
    else if (typeof correctRaw === 'object') text = JSON.stringify(correctRaw);

    // detect comma separated letters/numbers like "B,D" or "A|B" or "A/D"
    if (text && (text.includes(',') || text.includes('|') || text.includes('/'))) {
      if (qType !== 'multi-select') {
        const candidates = text.split(/[,|\/]/).map(s => s.trim()).filter(Boolean);
        const required = candidates.length || 2;
        toChange.push({ idx: i, global: q?.globalNumber, oldType: qType, newType: 'multi-select', required });
      }
    }
  }

  if (!toChange.length) {
    console.log('No mis-typed multi-selects found.');
    await sequelize.close();
    process.exit(0);
  }

  console.log(`Found ${toChange.length} question(s) to convert:`);
  toChange.forEach(c => console.log(c));

  if (!opts.apply) {
    console.log('\nRun with --apply to perform the conversion.');
    await sequelize.close();
    process.exit(0);
  }

  // Apply
  toChange.forEach(c => {
    const q = questions[c.idx];
    q.questionType = c.newType;
    q.requiredAnswers = c.required;
  });

  await t.update({ questions });
  console.log('Updated test', opts.testId);

  await sequelize.close();
  process.exit(0);
})().catch(async (e) => {
  console.error('Failed:', e);
  try { await sequelize.close(); } catch(_) {}
  process.exit(1);
});