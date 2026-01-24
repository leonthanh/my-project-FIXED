const sequelize = require('../db');
const ListeningTest = require('../models/ListeningTest');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { apply: false, fillMissing: false, testId: null };
  for (const a of args) {
    if (a === '--apply') out.apply = true;
    else if (a === '--fill-missing') out.fillMissing = true;
    else if (a.startsWith('--testId=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isFinite(n)) out.testId = n;
    }
  }
  return out;
};

const parseIfJsonString = (val) => {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch (e) { return val; }
};

const isFiniteNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n);
};

(async () => {
  const opts = parseArgs();
  console.log('Inspecting ListeningTest.questions for suspicious `requiredAnswers` entries', opts);

  await sequelize.authenticate();

  let where = {};
  if (opts.testId) where = { id: opts.testId };

  const tests = await ListeningTest.findAll({ where, order: [['id', 'ASC']], ...(opts.testId ? {} : {}) });
  console.log('Found', tests.length, 'test(s) to inspect');

  let totalSuspicious = 0;
  let totalMissing = 0;
  let updated = 0;

  for (const t of tests) {
    const obj = t.toJSON ? t.toJSON() : t;
    const questionsRaw = parseIfJsonString(obj.questions) || [];
    if (!Array.isArray(questionsRaw)) continue;

    const questions = questionsRaw;

    const suspicious = [];
    const missing = [];

    questions.forEach((q, idx) => {
      const qType = String(q?.questionType || 'fill').toLowerCase();
      const req = q?.requiredAnswers;
      const reqN = isFiniteNumber(req) ? Number(req) : null;

      if (reqN && reqN > 1 && qType !== 'multi-select') {
        suspicious.push({ idx, globalNumber: q.globalNumber ?? null, partIndex: q.partIndex, sectionIndex: q.sectionIndex, questionType: qType, requiredAnswers: reqN, questionText: q.questionText });
      }

      if (qType === 'multi-select' && !(reqN && reqN > 0)) {
        missing.push({ idx, globalNumber: q.globalNumber ?? null, partIndex: q.partIndex, sectionIndex: q.sectionIndex, questionType: qType, requiredAnswers: req });
      }
    });

    if (suspicious.length || missing.length) {
      console.log(`\nTest #${t.id} (title: ${obj.title || '(no title)'}):`);
      if (suspicious.length) {
        console.log('  Suspicious (requiredAnswers >1 but questionType != multi-select):');
        suspicious.forEach((s) => console.log(`    - idx=${s.idx} global=${s.globalNumber} part=${s.partIndex} section=${s.sectionIndex} type=${s.questionType} requiredAnswers=${s.requiredAnswers} text='${(s.questionText||'').slice(0,80)}'`));
      }
      if (missing.length) {
        console.log('  Missing (questionType=multi-select but requiredAnswers missing or invalid):');
        missing.forEach((m) => console.log(`    - idx=${m.idx} global=${m.globalNumber} part=${m.partIndex} section=${m.sectionIndex} requiredAnswers='${m.requiredAnswers}'`));
      }

      totalSuspicious += suspicious.length;
      totalMissing += missing.length;

      if (opts.apply) {
        let changed = false;

        // Clear suspicious requiredAnswers
        suspicious.forEach((s) => {
          if (questions[s.idx] && questions[s.idx].requiredAnswers != null) {
            delete questions[s.idx].requiredAnswers;
            changed = true;
            console.log(`    -> Cleared requiredAnswers for question idx=${s.idx} (global=${s.globalNumber})`);
          }
        });

        // Fill missing if requested
        if (opts.fillMissing && missing.length) {
          missing.forEach((m) => {
            if (questions[m.idx]) {
              questions[m.idx].requiredAnswers = 2; // default
              changed = true;
              console.log(`    -> Set requiredAnswers=2 for multi-select question idx=${m.idx} (global=${m.globalNumber})`);
            }
          });
        }

        if (changed) {
          await t.update({ questions: JSON.stringify(questions) });
          updated++;
          console.log(`  Updated test #${t.id}`);
        }
      }
    }
  }

  console.log('\nSummary:');
  console.log('  Suspicious entries found:', totalSuspicious);
  console.log('  Multi-select missing requiredAnswers found:', totalMissing);
  if (opts.apply) console.log('  Tests updated:', updated);

  await sequelize.close();
  process.exit(0);
})().catch(async (e) => {
  console.error('Inspect/fix failed:', e);
  try { await sequelize.close(); } catch (_) {}
  process.exit(1);
});