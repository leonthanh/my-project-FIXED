const { CambridgeReading } = require('../../../models');
const { processTestParts } = require('../../../utils/clozParser');
const { normalizeStudentResultVisibility } = require('../../../utils/studentResultVisibility');
const {
  buildVisibleCambridgeWhere,
  countTotalQuestionsFromParts,
  normalizeCambridgeStatus,
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

const listReadingTests = async ({
  query = {},
  forcedTestType = null,
  testModel = CambridgeReading,
} = {}) => {
  const testType = normalizeForcedTestType(forcedTestType) || String(query.testType || '').trim().toLowerCase() || null;
  const where = buildVisibleCambridgeWhere({ query }, testType ? { testType } : {});
  const tests = await testModel.findAll({
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

const getReadingTestById = async ({
  id,
  forcedTestType = null,
  testModel = CambridgeReading,
} = {}) => {
  const test = ensureReadingRecord(await testModel.findByPk(id), forcedTestType);
  const json = test.toJSON();
  const computedTotal = countTotalQuestionsFromParts(json.parts);
  const processedParts = processTestParts(safeParseParts(json.parts));

  return {
    ...json,
    parts: stripDataUrls(processedParts),
    totalQuestions: Math.max(computedTotal || 0, json.totalQuestions || 0),
  };
};

const createReadingTest = async ({
  body = {},
  forcedTestType = null,
  testModel = CambridgeReading,
  platform = 'cambridge',
} = {}) => {
  const {
    title,
    classCode,
    teacherName,
    testType,
    parts,
    status,
    totalQuestions,
    showResultModal,
    studentResultVisibility,
  } = body;

  const effectiveTestType = ensureForcedTypeMatch(testType, forcedTestType);
  const isGatewayTest = effectiveTestType.startsWith('gateway-');

  if (!title || !classCode || !effectiveTestType) {
    throw createServiceError(400, 'Thiếu thông tin bắt buộc: title, classCode, testType');
  }
  if ((platform === 'gateway') !== isGatewayTest) {
    throw createServiceError(400, 'Loại đề thi không thuộc nền tảng đã chọn.');
  }

  const resolvedStudentResultVisibility = normalizeStudentResultVisibility(
    studentResultVisibility,
    showResultModal
  );
  const processedParts = processTestParts(parts);
  return testModel.create({
    title,
    classCode,
    teacherName: teacherName || '',
    testType: effectiveTestType,
    parts: processedParts,
    totalQuestions: totalQuestions || 0,
    status: normalizeCambridgeStatus(status, 'published'),
    showResultModal: resolvedStudentResultVisibility !== 'confirmation',
    studentResultVisibility: resolvedStudentResultVisibility,
  });
};

const updateReadingTest = async ({
  id,
  body = {},
  forcedTestType = null,
  testModel = CambridgeReading,
  platform = 'cambridge',
} = {}) => {
  const test = ensureReadingRecord(await testModel.findByPk(id), forcedTestType);
  const {
    title,
    classCode,
    testType,
    parts,
    totalQuestions,
    status,
    showResultModal,
    studentResultVisibility,
  } = body;
  const effectiveTestType = ensureForcedTypeMatch(testType || test.testType, forcedTestType);
  if ((platform === 'gateway') !== effectiveTestType.startsWith('gateway-')) {
    throw createServiceError(400, 'Loại đề thi không thuộc nền tảng đã chọn.');
  }
  const processedParts = parts ? processTestParts(parts) : test.parts;

  const visibilityWasUpdated =
    studentResultVisibility !== undefined || showResultModal !== undefined;
  const resolvedStudentResultVisibility = visibilityWasUpdated
    ? normalizeStudentResultVisibility(studentResultVisibility, showResultModal)
    : test.studentResultVisibility || 'score';

  await test.update({
    title: title || test.title,
    classCode: classCode || test.classCode,
    teacherName: test.teacherName,
    testType: effectiveTestType || test.testType,
    parts: processedParts,
    totalQuestions: totalQuestions ?? test.totalQuestions,
    status: status || test.status,
    ...(visibilityWasUpdated
      ? {
          showResultModal: resolvedStudentResultVisibility !== 'confirmation',
          studentResultVisibility: resolvedStudentResultVisibility,
        }
      : {}),
  });

  return test;
};

const deleteReadingTest = async ({
  id,
  forcedTestType = null,
  testModel = CambridgeReading,
} = {}) => {
  const test = ensureReadingRecord(await testModel.findByPk(id), forcedTestType);
  await test.destroy();
};

module.exports = {
  createReadingTest,
  deleteReadingTest,
  getReadingTestById,
  listReadingTests,
  updateReadingTest,
};