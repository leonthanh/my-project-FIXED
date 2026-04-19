const { CambridgeReading } = require('../../../models');
const { processTestParts } = require('../../../utils/clozParser');
const {
  buildVisibleCambridgeWhere,
  countTotalQuestionsFromParts,
  safeParseParts,
  stripDataUrls,
} = require('../shared/readingTestUtils');

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeForcedTestType = (forcedTestType) => {
  const normalized = String(forcedTestType || '').trim().toLowerCase();
  return normalized || null;
};

const ensureForcedTypeMatch = (rawTestType, forcedTestType) => {
  const normalizedForced = normalizeForcedTestType(forcedTestType);
  if (!normalizedForced) {
    return String(rawTestType || '').trim().toLowerCase();
  }

  const normalizedInput = String(rawTestType || '').trim().toLowerCase();
  if (normalizedInput && normalizedInput !== normalizedForced) {
    throw createServiceError(400, `Route chỉ hỗ trợ testType "${normalizedForced}".`);
  }

  return normalizedForced;
};

const ensureReadingRecord = (record, forcedTestType) => {
  if (!record) {
    throw createServiceError(404, 'Không tìm thấy đề thi.');
  }

  const normalizedForced = normalizeForcedTestType(forcedTestType);
  if (!normalizedForced) {
    return record;
  }

  const recordType = String(record.testType || '').trim().toLowerCase();
  if (recordType !== normalizedForced) {
    throw createServiceError(404, 'Không tìm thấy đề thi.');
  }

  return record;
};

const listReadingTests = async ({ query = {}, forcedTestType = null } = {}) => {
  const testType = normalizeForcedTestType(forcedTestType) || String(query.testType || '').trim().toLowerCase() || null;
  const where = buildVisibleCambridgeWhere({ query }, testType ? { testType } : {});
  const tests = await CambridgeReading.findAll({
    where,
    order: [['createdAt', 'DESC']],
  });

  return tests.map((test) => {
    const json = test.toJSON();
    const computedTotal = countTotalQuestionsFromParts(json.parts);
    delete json.parts;
    return {
      ...json,
      totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
    };
  });
};

const getReadingTestById = async ({ id, forcedTestType = null } = {}) => {
  const test = ensureReadingRecord(await CambridgeReading.findByPk(id), forcedTestType);
  const json = test.toJSON();
  const computedTotal = countTotalQuestionsFromParts(json.parts);
  const processedParts = processTestParts(safeParseParts(json.parts));

  return {
    ...json,
    parts: stripDataUrls(processedParts),
    totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
  };
};

const createReadingTest = async ({ body = {}, forcedTestType = null } = {}) => {
  const {
    title,
    classCode,
    teacherName,
    testType,
    parts,
    totalQuestions,
  } = body;

  const effectiveTestType = ensureForcedTypeMatch(testType, forcedTestType);

  if (!title || !classCode || !effectiveTestType) {
    throw createServiceError(400, 'Thiếu thông tin bắt buộc: title, classCode, testType');
  }

  const processedParts = processTestParts(parts);
  return CambridgeReading.create({
    title,
    classCode,
    teacherName: teacherName || '',
    testType: effectiveTestType,
    parts: processedParts,
    totalQuestions: totalQuestions || 0,
    status: 'draft',
  });
};

const updateReadingTest = async ({ id, body = {}, forcedTestType = null } = {}) => {
  const test = ensureReadingRecord(await CambridgeReading.findByPk(id), forcedTestType);
  const {
    title,
    classCode,
    teacherName,
    testType,
    parts,
    totalQuestions,
    status,
  } = body;
  const effectiveTestType = ensureForcedTypeMatch(testType || test.testType, forcedTestType);
  const processedParts = parts ? processTestParts(parts) : test.parts;

  await test.update({
    title: title || test.title,
    classCode: classCode || test.classCode,
    teacherName: teacherName || test.teacherName,
    testType: effectiveTestType || test.testType,
    parts: processedParts,
    totalQuestions: totalQuestions ?? test.totalQuestions,
    status: status || test.status,
  });

  return test;
};

const deleteReadingTest = async ({ id, forcedTestType = null } = {}) => {
  const test = ensureReadingRecord(await CambridgeReading.findByPk(id), forcedTestType);
  await test.destroy();
};

module.exports = {
  createReadingTest,
  deleteReadingTest,
  getReadingTestById,
  listReadingTests,
  updateReadingTest,
};