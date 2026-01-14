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
const { CambridgeReading, CambridgeListening } = require('../models');
const { processTestParts } = require('../utils/clozParser');

const args = process.argv.slice(2);
const getArg = (name) => {
  const prefix = `--${name}=`;
  const hit = args.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

const scope = (getArg('scope') || 'both').toLowerCase();
const testType = getArg('testType');
const apply = args.includes('--apply');

const safeParseParts = (rawParts) => {
  if (!rawParts) return [];
  if (Array.isArray(rawParts)) return rawParts;
  if (typeof rawParts === 'string') {
    try {
      const parsed = JSON.parse(rawParts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const countTotalQuestionsFromParts = (rawParts = []) => {
  const parts = safeParseParts(rawParts);
  const processed = processTestParts(parts);

  let total = 0;
  processed.forEach(part => {
    (part.sections || []).forEach(section => {
      const questions = section.questions || [];
      questions.forEach(question => {
        if (section.questionType === 'long-text-mc' && Array.isArray(question.questions)) {
          total += question.questions.length;
          return;
        }
        if (section.questionType === 'people-matching' && Array.isArray(question.people)) {
          total += question.people.length > 0 ? question.people.length : 1;
          return;
        }
        if (section.questionType === 'word-form' && Array.isArray(question.sentences)) {
          total += question.sentences.length > 0 ? question.sentences.length : 1;
          return;
        }
        if (section.questionType === 'short-message') {
          total += 1;
          return;
        }
        if (section.questionType === 'cloze-mc' && Array.isArray(question.blanks)) {
          total += question.blanks.length > 0 ? question.blanks.length : 1;
          return;
        }
        if (section.questionType === 'cloze-test') {
          if (Array.isArray(question.blanks) && question.blanks.length > 0) {
            total += question.blanks.length;
            return;
          }
          if (question.answers && typeof question.answers === 'object' && !Array.isArray(question.answers)) {
            const n = Object.keys(question.answers).length;
            total += n > 0 ? n : 1;
            return;
          }
          total += 1;
          return;
        }
        total += 1;
      });
    });
  });

  return total;
};

(async () => {
  try {
    await sequelize.authenticate();

    const where = testType ? { testType } : {};
    const targets = [];
    if (scope === 'both' || scope === 'reading') targets.push({ name: 'reading', Model: CambridgeReading });
    if (scope === 'both' || scope === 'listening') targets.push({ name: 'listening', Model: CambridgeListening });

    const changes = [];
    let totalCount = 0;

    for (const t of targets) {
      const tests = await t.Model.findAll({ where, order: [['id', 'ASC']] });
      totalCount += tests.length;

      for (const test of tests) {
        const json = test.toJSON();
        const before = Number(json.totalQuestions) || 0;
        const after = Number(countTotalQuestionsFromParts(json.parts)) || 0;

        if (before !== after) {
          changes.push({ category: t.name, id: json.id, testType: json.testType, title: json.title, before, after });
          if (apply) {
            await test.update({ totalQuestions: after });
          }
        }
      }
    }

    console.log(`\nCambridge totalQuestions recalculation`);
    console.log(`scope=${scope} testType=${testType || '(any)'} apply=${apply}`);
    console.log(`total tests scanned: ${totalCount}`);
    console.log(`tests needing update: ${changes.length}`);

    if (changes.length > 0) {
      console.table(changes.slice(0, 50));
      if (changes.length > 50) {
        console.log(`... and ${changes.length - 50} more`);
      }
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
