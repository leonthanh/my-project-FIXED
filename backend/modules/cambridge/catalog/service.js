const { CambridgeListening, CambridgeReading } = require('../../../models');
const { buildVisibleCambridgeWhere } = require('../shared/readingTestUtils');

const TEST_LIST_ATTRIBUTES = [
  'id',
  'title',
  'classCode',
  'teacherName',
  'testType',
  'totalQuestions',
  'status',
  'createdAt',
];

const listCambridgeTests = async ({ query = {} } = {}) => {
  const { testType } = query;
  const where = buildVisibleCambridgeWhere({ query }, testType ? { testType } : {});

  const [readingTests, listeningTests] = await Promise.all([
    CambridgeReading.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: TEST_LIST_ATTRIBUTES,
    }),
    CambridgeListening.findAll({
      where,
      order: [['createdAt', 'DESC']],
      attributes: TEST_LIST_ATTRIBUTES,
    }),
  ]);

  return [
    ...readingTests.map((test) => ({ ...test.toJSON(), category: 'reading' })),
    ...listeningTests.map((test) => ({ ...test.toJSON(), category: 'listening' })),
  ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

module.exports = {
  listCambridgeTests,
};