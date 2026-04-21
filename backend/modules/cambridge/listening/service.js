const { CambridgeListening } = require('../../../models');
const {
  buildVisibleCambridgeWhere,
  safeParseParts,
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

const ensureListeningRecord = (record, forcedTestType) => {
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

const normalizeListeningAudioPayload = ({ mainAudioUrl, parts, fallbackParts = [] }) => {
  const normalizedParts = safeParseParts(parts !== undefined ? parts : fallbackParts);
  const normalizedMainAudioUrl = typeof mainAudioUrl === 'string' ? mainAudioUrl.trim() : '';
  const normalizedPartAudioUrls = normalizedParts
    .map((part) => (typeof part?.audioUrl === 'string' ? part.audioUrl.trim() : ''))
    .filter(Boolean);
  const uniquePartAudioUrls = Array.from(new Set(normalizedPartAudioUrls));
  const sharedPartAudioUrl =
    normalizedPartAudioUrls.length > 1 && uniquePartAudioUrls.length === 1
      ? uniquePartAudioUrls[0]
      : null;

  return {
    mainAudioUrl: normalizedMainAudioUrl || sharedPartAudioUrl,
    parts: normalizedParts,
  };
};

const listListeningTests = async ({ query = {}, forcedTestType = null } = {}) => {
  const testType =
    normalizeForcedTestType(forcedTestType) ||
    String(query.testType || '').trim().toLowerCase() ||
    null;
  const where = buildVisibleCambridgeWhere({ query }, testType ? { testType } : {});

  return CambridgeListening.findAll({
    where,
    order: [['createdAt', 'DESC']],
    attributes: [
      'id',
      'title',
      'classCode',
      'teacherName',
      'testType',
      'totalQuestions',
      'status',
      'createdAt',
    ],
  });
};

const getListeningTestById = async ({ id, forcedTestType = null } = {}) =>
  ensureListeningRecord(await CambridgeListening.findByPk(id), forcedTestType);

const createListeningTest = async ({ body = {}, forcedTestType = null } = {}) => {
  const {
    title,
    classCode,
    teacherName,
    testType,
    mainAudioUrl,
    parts,
    totalQuestions,
  } = body;
  const effectiveTestType = ensureForcedTypeMatch(testType, forcedTestType);

  if (!title || !classCode || !effectiveTestType) {
    throw createServiceError(400, 'Thiếu thông tin bắt buộc: title, classCode, testType');
  }

  const normalizedListeningPayload = normalizeListeningAudioPayload({
    mainAudioUrl,
    parts,
  });

  return CambridgeListening.create({
    title,
    classCode,
    teacherName: teacherName || '',
    testType: effectiveTestType,
    mainAudioUrl: normalizedListeningPayload.mainAudioUrl,
    parts: normalizedListeningPayload.parts,
    totalQuestions: totalQuestions || 0,
    status: 'draft',
  });
};

const updateListeningTest = async ({ id, body = {}, forcedTestType = null } = {}) => {
  const test = ensureListeningRecord(await CambridgeListening.findByPk(id), forcedTestType);
  const {
    title,
    classCode,
    teacherName,
    testType,
    mainAudioUrl,
    parts,
    totalQuestions,
    status,
  } = body;
  const effectiveTestType = ensureForcedTypeMatch(testType || test.testType, forcedTestType);
  const normalizedListeningPayload = normalizeListeningAudioPayload({
    mainAudioUrl: mainAudioUrl !== undefined ? mainAudioUrl : test.mainAudioUrl,
    parts,
    fallbackParts: test.parts,
  });

  await test.update({
    title: title || test.title,
    classCode: classCode || test.classCode,
    teacherName: teacherName || test.teacherName,
    testType: effectiveTestType || test.testType,
    mainAudioUrl: normalizedListeningPayload.mainAudioUrl,
    parts: normalizedListeningPayload.parts,
    totalQuestions: totalQuestions ?? test.totalQuestions,
    status: status || test.status,
  });

  return test;
};

const deleteListeningTest = async ({ id, forcedTestType = null } = {}) => {
  const test = ensureListeningRecord(await CambridgeListening.findByPk(id), forcedTestType);
  await test.destroy();
};

module.exports = {
  createListeningTest,
  deleteListeningTest,
  getListeningTestById,
  listListeningTests,
  updateListeningTest,
};