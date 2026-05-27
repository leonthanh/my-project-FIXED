const sequelize = require('../db');
const ListeningTest = require('../models/ListeningTest');

const ANSWER_TREE_KEYS = new Set([
  'answers',
  'cellBlankAnswers',
  'commentBlankAnswers',
]);

const ANSWER_VALUE_KEYS = new Set([
  'correctAnswer',
]);

const SAFE_VARIANT_SEGMENT = /^[A-Za-z][A-Za-z' -]*[A-Za-z]$/;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {
    apply: false,
    dryRun: true,
    id: null,
    limit: null,
    help: false,
  };

  for (const arg of args) {
    if (arg === '--apply') {
      out.apply = true;
      out.dryRun = false;
      continue;
    }
    if (arg === '--dry-run') {
      out.apply = false;
      out.dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg.startsWith('--id=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) out.id = value;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value) && value > 0) out.limit = value;
    }
  }

  return out;
};

const printUsage = () => {
  console.log('Usage: node backend/scripts/normalize-listening-answer-variants.js [--dry-run] [--apply] [--id=123] [--limit=20]');
  console.log('Scans ListeningTest answer fields for safe slash-separated legacy variants and rewrites them to pipe-separated variants.');
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const normalizeSlashVariants = (raw) => {
  if (typeof raw !== 'string') return null;

  const source = raw.trim();
  if (!source.includes('/') || source.includes('|')) return null;
  if (/https?:\/\//i.test(source) || /www\./i.test(source)) return null;
  if (source.includes('\\')) return null;

  const segments = source.split('/').map((segment) => segment.trim());
  if (segments.length < 2 || segments.some((segment) => !segment)) return null;
  if (segments.some((segment) => /\d/.test(segment))) return null;
  if (segments.some((segment) => /[:@#%=&<>\[\]{}]/.test(segment))) return null;
  if (!segments.every((segment) => SAFE_VARIANT_SEGMENT.test(segment))) return null;

  return segments.join(' | ');
};

const walkAnswerTree = (value, path, underAnswerTree, changes) => {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry, index) => {
      const result = walkAnswerTree(entry, `${path}[${index}]`, underAnswerTree, changes);
      if (result.changed) changed = true;
      return result.value;
    });

    return changed ? { value: next, changed: true } : { value, changed: false };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const next = {};

    Object.entries(value).forEach(([key, entryValue]) => {
      const nextPath = path ? `${path}.${key}` : key;
      if (ANSWER_VALUE_KEYS.has(key) && typeof entryValue === 'string') {
        const normalized = normalizeSlashVariants(entryValue);
        if (normalized && normalized !== entryValue) {
          changes.push({ path: nextPath, before: entryValue, after: normalized });
          next[key] = normalized;
          changed = true;
          return;
        }
        next[key] = entryValue;
        return;
      }

      const result = walkAnswerTree(
        entryValue,
        nextPath,
        underAnswerTree || ANSWER_TREE_KEYS.has(key),
        changes,
      );
      if (result.changed) changed = true;
      next[key] = result.value;
    });

    return changed ? { value: next, changed: true } : { value, changed: false };
  }

  if (underAnswerTree && typeof value === 'string') {
    const normalized = normalizeSlashVariants(value);
    if (normalized && normalized !== value) {
      changes.push({ path, before: value, after: normalized });
      return { value: normalized, changed: true };
    }
  }

  return { value, changed: false };
};

const summarizeChanges = (testId, changes) => {
  console.log(`\nListeningTest ${testId}: ${changes.length} change(s)`);
  changes.slice(0, 20).forEach(({ path, before, after }) => {
    console.log(`  - ${path}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  });
  if (changes.length > 20) {
    console.log(`  ... ${changes.length - 20} more change(s)`);
  }
};

(async () => {
  const opts = parseArgs();
  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  await sequelize.authenticate();

  const query = {};
  if (opts.id) query.where = { id: opts.id };
  if (opts.limit) query.limit = opts.limit;

  const tests = await ListeningTest.findAll(query);
  if (!tests.length) {
    console.log('No listening tests found for the provided filters.');
    await sequelize.close();
    process.exit(0);
  }

  let changedTests = 0;
  let totalChanges = 0;

  for (const test of tests) {
    const updates = {};
    const changes = [];

    if (test.questions != null) {
      const clonedQuestions = deepClone(test.questions);
      const result = walkAnswerTree(clonedQuestions, 'questions', false, changes);
      if (result.changed) updates.questions = result.value;
    }

    if (test.partInstructions != null) {
      const clonedPartInstructions = deepClone(test.partInstructions);
      const result = walkAnswerTree(clonedPartInstructions, 'partInstructions', false, changes);
      if (result.changed) updates.partInstructions = result.value;
    }

    if (!changes.length) continue;

    changedTests += 1;
    totalChanges += changes.length;
    summarizeChanges(test.id, changes);

    if (opts.apply) {
      await test.update(updates);
    }
  }

  if (!changedTests) {
    console.log('No safe slash-separated listening answer variants found.');
  } else {
    console.log(`\n${opts.apply ? 'Applied' : 'Detected'} ${totalChanges} change(s) across ${changedTests} listening test(s).`);
  }

  await sequelize.close();
  process.exit(0);
})().catch(async (error) => {
  console.error(error);
  try {
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});