const { CambridgeListening, CambridgeReading } = require('../../../models');
const { countTotalQuestionsFromParts } = require('../shared/readingTestUtils');

const recalculateCambridgeTotalQuestions = async ({ query = {} } = {}) => {
  const scope = String(query.scope || 'both').toLowerCase();
  const dryRun = String(query.dryRun ?? 'true').toLowerCase() !== 'false';
  const testType = query.testType ? String(query.testType) : null;

  const where = testType ? { testType } : {};
  const targets = [];
  if (scope === 'both' || scope === 'reading') {
    targets.push({ name: 'reading', Model: CambridgeReading });
  }
  if (scope === 'both' || scope === 'listening') {
    targets.push({ name: 'listening', Model: CambridgeListening });
  }

  const changes = [];
  let totalCount = 0;

  for (const target of targets) {
    const tests = await target.Model.findAll({ where, order: [['id', 'ASC']] });
    totalCount += tests.length;

    for (const test of tests) {
      const json = test.toJSON();
      const before = Number(json.totalQuestions) || 0;
      const after = Number(countTotalQuestionsFromParts(json.parts)) || 0;

      if (before !== after) {
        changes.push({
          category: target.name,
          id: json.id,
          testType: json.testType,
          title: json.title,
          before,
          after,
        });

        if (!dryRun) {
          await test.update({ totalQuestions: after });
        }
      }
    }
  }

  return {
    dryRun,
    scope,
    filter: { testType },
    totalCount,
    changedCount: changes.length,
    changes,
  };
};

module.exports = {
  recalculateCambridgeTotalQuestions,
};