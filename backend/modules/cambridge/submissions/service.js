const { Op, col, fn, where: sequelizeWhere } = require('sequelize');
const { CambridgeSubmission } = require('../../../models');
const {
  DEFAULT_EXTENSION_MINUTES,
  buildTimingPayload,
  extendDeadline,
  normalizeExtensionMinutes,
  resolveAuthoritativeExpiry,
} = require('../../../utils/testTiming');
const {
  BASE_READING_CAMBRIDGE_TEST_TYPES,
  FINALIZED_CAMBRIDGE_WHERE,
  countPendingManualAnswers,
  findActiveCambridgeDraft,
  getCambridgeTestRecord,
} = require('../shared/submissionUtils');
const { scoreTest } = require('../shared/scoring');

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCambridgeSubmissionById = async ({ id } = {}) => {
  const submission = await CambridgeSubmission.findByPk(id);
  if (!submission) {
    throw createServiceError(404, 'Không tìm thấy bài nộp.');
  }
  return submission;
};

const parseJsonIfString = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeCambridgeProgressMeta = (meta = {}) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return {};
  }
  return meta;
};

const buildSubmissionTypeFilter = (testType) => {
  const normalized = String(testType || '').trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === 'reading') {
    return {
      [Op.or]: [
        { testType: { [Op.like]: '%-reading' } },
        { testType: { [Op.in]: BASE_READING_CAMBRIDGE_TEST_TYPES } },
      ],
    };
  }

  if (normalized === 'listening') {
    return { testType: { [Op.like]: '%-listening' } };
  }

  return { testType: normalized };
};

const autosaveCambridgeSubmission = async ({ body = {} } = {}) => {
  const {
    testId,
    testType,
    submissionId,
    answers,
    expiresAt,
    user,
    progressMeta,
    studentName,
    studentPhone,
    studentEmail,
    classCode,
  } = body;

  const numericTestId = Number(testId);
  const normalizedTestType = String(testType || '').trim();

  if (!numericTestId || !normalizedTestType) {
    throw createServiceError(400, 'Missing testId or testType.');
  }

  const resolvedUserId = Number(user?.id) || null;
  const test = await getCambridgeTestRecord(numericTestId, normalizedTestType);
  const parsedExpiresAt = Number.isFinite(Number(expiresAt))
    ? new Date(Number(expiresAt))
    : null;
  const normalizedAnswers =
    answers && typeof answers === 'object' && !Array.isArray(answers)
      ? answers
      : {};
  const normalizedProgressMeta = normalizeCambridgeProgressMeta(progressMeta);
  const now = new Date();

  let submission = await findActiveCambridgeDraft({
    submissionId: Number(submissionId) || null,
    testId: numericTestId,
    testType: normalizedTestType,
    userId: resolvedUserId,
  });

  if (submission) {
    await submission.update({
      answers: normalizedAnswers,
      expiresAt: resolveAuthoritativeExpiry(submission.expiresAt, parsedExpiresAt),
      lastSavedAt: now,
      progressMeta: normalizedProgressMeta,
      studentName:
        studentName ||
        user?.name ||
        user?.username ||
        submission.studentName ||
        'Unknown',
      studentPhone:
        studentPhone || user?.phone || submission.studentPhone || null,
      studentEmail:
        studentEmail || user?.email || submission.studentEmail || null,
      classCode:
        classCode || test?.classCode || submission.classCode || null,
      teacherName: test?.teacherName || submission.teacherName || null,
      testTitle: test?.title || submission.testTitle || null,
    });
  } else {
    submission = await CambridgeSubmission.create({
      testId: numericTestId,
      testType: normalizedTestType,
      testTitle: test?.title || null,
      studentName:
        studentName || user?.name || user?.username || 'Unknown',
      studentPhone: studentPhone || user?.phone || null,
      studentEmail: studentEmail || user?.email || null,
      classCode: classCode || test?.classCode || null,
      userId: resolvedUserId,
      answers: normalizedAnswers,
      score: 0,
      totalQuestions: 0,
      percentage: 0,
      detailedResults: null,
      timeSpent: null,
      timeRemaining: null,
      teacherName: test?.teacherName || null,
      feedback: null,
      feedbackBy: null,
      feedbackAt: null,
      feedbackSeen: false,
      status: 'submitted',
      finished: false,
      expiresAt: parsedExpiresAt,
      lastSavedAt: now,
      progressMeta: normalizedProgressMeta,
      submittedAt: null,
    });
  }

  return {
    submission,
    timing: buildTimingPayload(submission.expiresAt),
  };
};

const getActiveCambridgeDraft = async ({ query = {} } = {}) => {
  const numericTestId = Number(query.testId);
  const normalizedTestType = String(query.testType || '').trim();

  if (!numericTestId || !normalizedTestType) {
    throw createServiceError(400, 'Missing testId or testType.');
  }

  const submission = await findActiveCambridgeDraft({
    submissionId: Number(query.submissionId) || null,
    testId: numericTestId,
    testType: normalizedTestType,
    userId: Number(query.userId) || null,
  });

  return {
    submission: submission ? submission.toJSON() : null,
    timing: buildTimingPayload(submission ? submission.expiresAt : null),
  };
};

const listCambridgeSubmissions = async ({ query = {} } = {}) => {
  const {
    testType,
    classCode,
    studentName,
    studentPhone,
    teacherName,
    feedbackBy,
    reviewStatus = 'all',
    sortOrder = 'newest',
    page = 1,
    limit = 50,
  } = query;
  const includeActive = ['1', 'true', 'yes'].includes(
    String(query.includeActive || '').toLowerCase()
  );
  const where = includeActive ? {} : { ...FINALIZED_CAMBRIDGE_WHERE };
  const andConditions = [];

  const pushContainsFilter = (fieldName, value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return;

    andConditions.push(
      sequelizeWhere(fn('LOWER', col(fieldName)), {
        [Op.like]: `%${normalized}%`,
      })
    );
  };

  const testTypeFilter = buildSubmissionTypeFilter(testType);
  if (testTypeFilter) {
    andConditions.push(testTypeFilter);
  }

  pushContainsFilter('classCode', classCode);
  pushContainsFilter('studentName', studentName);
  pushContainsFilter('studentPhone', studentPhone);
  pushContainsFilter('teacherName', teacherName);
  pushContainsFilter('feedbackBy', feedbackBy);

  if (reviewStatus === 'reviewed') {
    andConditions.push({
      [Op.or]: [
        { status: 'reviewed' },
        { feedbackBy: { [Op.not]: null, [Op.ne]: '' } },
        { feedback: { [Op.not]: null, [Op.ne]: '' } },
      ],
    });
  } else if (reviewStatus === 'pending') {
    andConditions.push({
      [Op.and]: [
        {
          [Op.or]: [{ status: { [Op.ne]: 'reviewed' } }, { status: null }],
        },
        {
          [Op.or]: [{ feedbackBy: null }, { feedbackBy: '' }],
        },
        {
          [Op.or]: [{ feedback: null }, { feedback: '' }],
        },
      ],
    });
  }

  if (andConditions.length) {
    where[Op.and] = andConditions;
  }

  const pageNumber = Math.max(Number.parseInt(page, 10) || 1, 1);
  const limitNumber = Math.max(Number.parseInt(limit, 10) || 50, 1);
  const offset = (pageNumber - 1) * limitNumber;
  const direction = String(sortOrder).toLowerCase() === 'oldest' ? 'ASC' : 'DESC';
  const submittedOrderExpr = fn('COALESCE', col('submittedAt'), col('createdAt'));

  const { count, rows: submissions } = await CambridgeSubmission.findAndCountAll({
    where,
    order: [[submittedOrderExpr, direction]],
    limit: limitNumber,
    offset,
    attributes: [
      'id', 'testId', 'testType', 'testTitle',
      'studentName', 'studentPhone', 'classCode', 'teacherName',
      'score', 'totalQuestions', 'percentage',
      'timeSpent', 'status', 'submittedAt', 'feedbackSeen',
      'finished', 'expiresAt', 'lastSavedAt', 'feedback', 'feedbackBy', 'feedbackAt', 'createdAt',
      'detailedResults',
    ],
  });

  const normalizedSubmissions = submissions.map((submission) => {
    const json = submission.toJSON();
    const pendingManualCount = countPendingManualAnswers(json);
    delete json.detailedResults;

    return {
      ...json,
      pendingManualCount,
    };
  });

  return {
    submissions: normalizedSubmissions,
    pagination: {
      total: count,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(count / limitNumber),
    },
  };
};

const listCambridgeSubmissionsByPhone = async ({ phone } = {}) => {
  if (!phone) {
    throw createServiceError(400, 'Thiếu số điện thoại');
  }

  return CambridgeSubmission.findAll({
    where: { studentPhone: phone, ...FINALIZED_CAMBRIDGE_WHERE },
    order: [['submittedAt', 'DESC']],
    attributes: [
      'id',
      'testId',
      'testType',
      'testTitle',
      'studentName',
      'studentPhone',
      'classCode',
      'score',
      'totalQuestions',
      'percentage',
      'teacherName',
      'feedback',
      'feedbackBy',
      'feedbackAt',
      'feedbackSeen',
      'status',
      'submittedAt',
    ],
  });
};

const countUnseenCambridgeFeedbackByPhone = async ({ phone } = {}) => {
  if (!phone) {
    return { count: 0 };
  }

  const count = await CambridgeSubmission.count({
    where: {
      studentPhone: phone,
      feedback: { [Op.ne]: null },
      feedbackSeen: false,
      ...FINALIZED_CAMBRIDGE_WHERE,
    },
  });

  return { count };
};

const markCambridgeFeedbackSeen = async ({ body = {} } = {}) => {
  const { phone, ids } = body;

  if (!phone) {
    throw createServiceError(400, 'Thiếu số điện thoại');
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createServiceError(400, '❌ Thiếu danh sách IDs');
  }

  const [updatedCount] = await CambridgeSubmission.update(
    { feedbackSeen: true },
    { where: { studentPhone: phone, id: { [Op.in]: ids } } }
  );

  return { updatedCount };
};

const extendCambridgeSubmissionTime = async ({ submissionId, extraMinutes } = {}) => {
  const submission = await CambridgeSubmission.findByPk(submissionId);
  if (!submission) {
    throw createServiceError(404, 'Không tìm thấy attempt');
  }
  if (submission.finished) {
    throw createServiceError(400, 'Attempt đã hoàn thành');
  }

  const extensionMinutes = normalizeExtensionMinutes(
    extraMinutes,
    DEFAULT_EXTENSION_MINUTES
  );
  const { expiresAtMs } = extendDeadline(submission.expiresAt, extensionMinutes);
  submission.expiresAt = new Date(expiresAtMs);
  submission.lastSavedAt = new Date();
  await submission.save();

  return {
    submission,
    extensionMinutes,
    timing: buildTimingPayload(submission.expiresAt),
  };
};

const updateCambridgeSubmission = async ({ id, body = {} } = {}) => {
  const submission = await getCambridgeSubmissionById({ id });
  const { feedback, feedbackBy, status } = body;

  await submission.update({
    feedback: feedback || submission.feedback,
    feedbackBy: feedbackBy || submission.feedbackBy,
    feedbackAt: feedback ? new Date() : submission.feedbackAt,
    status: status || (feedback ? 'reviewed' : submission.status),
  });

  return submission;
};

const markCambridgeSubmissionSeen = async ({ id } = {}) => {
  const submission = await getCambridgeSubmissionById({ id });
  await submission.update({ feedbackSeen: true });
  return submission;
};

const rescoreCambridgeSubmission = async ({ id } = {}) => {
  const submission = await getCambridgeSubmissionById({ id });
  const answers = parseJsonIfString(submission.answers);

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw createServiceError(400, 'Submission không có answers hợp lệ để chấm lại.');
  }

  const test = await getCambridgeTestRecord(submission.testId, submission.testType);
  if (!test) {
    throw createServiceError(404, 'Không tìm thấy đề thi tương ứng với submission này.');
  }

  const before = {
    score: submission.score,
    totalQuestions: submission.totalQuestions,
    percentage: submission.percentage,
  };

  const { score, total, percentage, detailedResults } = scoreTest(test, answers);

  await submission.update({
    score,
    totalQuestions: total,
    percentage,
    detailedResults,
  });

  return {
    submission,
    before,
    after: { score, totalQuestions: total, percentage },
  };
};

module.exports = {
  autosaveCambridgeSubmission,
  countUnseenCambridgeFeedbackByPhone,
  extendCambridgeSubmissionTime,
  getActiveCambridgeDraft,
  getCambridgeSubmissionById,
  listCambridgeSubmissions,
  listCambridgeSubmissionsByPhone,
  markCambridgeFeedbackSeen,
  markCambridgeSubmissionSeen,
  rescoreCambridgeSubmission,
  updateCambridgeSubmission,
};