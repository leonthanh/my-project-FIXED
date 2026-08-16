const { Op } = require('sequelize');

const User = require('../models/User');
const Submission = require('../models/Submission');
const ReadingSubmission = require('../models/ReadingSubmission');
const ListeningSubmission = require('../models/ListeningSubmission');
const CambridgeSubmission = require('../models/CambridgeSubmission');

const DEFAULT_MAX_ATTEMPTS_PER_TEST = 1;

const FINALIZED_READING_WHERE = {
  [Op.or]: [{ finished: true }, { finished: null }],
};

const FINALIZED_LISTENING_WHERE = {
  [Op.and]: [
    {
      [Op.or]: [{ finished: true }, { finished: null }],
    },
    {
      // Ignore draft/cleanup rows that were never really submitted.
      total: { [Op.gt]: 0 },
    },
  ],
};

const FINALIZED_CAMBRIDGE_WHERE = {
  [Op.or]: [{ finished: true }, { finished: null }],
};

const FINALIZED_WRITING_WHERE = {
  [Op.or]: [{ isDraft: false }, { isDraft: null }],
};

const createAttemptLimitError = ({ allowedAttempts, usedAttempts }) => {
  const error = new Error(
    `You have reached the limit of ${allowedAttempts} attempt${allowedAttempts === 1 ? '' : 's'} for this test.`
  );
  error.statusCode = 403;
  error.code = 'ATTEMPT_LIMIT_REACHED';
  error.allowedAttempts = allowedAttempts;
  error.usedAttempts = usedAttempts;
  return error;
};

const normalizeAttemptLimit = (
  value,
  fallback = DEFAULT_MAX_ATTEMPTS_PER_TEST
) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.max(1, Number(fallback) || DEFAULT_MAX_ATTEMPTS_PER_TEST);
  }

  return parsed;
};

const isStudentRole = (role) => String(role || '').trim().toLowerCase() === 'student';

const resolveStudentAttemptLimit = async ({ userId } = {}) => {
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return null;
  }

  const user = await User.findByPk(numericUserId, {
    attributes: ['id', 'role', 'maxAttemptsPerTest'],
  });

  if (!user || !isStudentRole(user.role)) {
    return null;
  }

  return normalizeAttemptLimit(
    user.maxAttemptsPerTest,
    DEFAULT_MAX_ATTEMPTS_PER_TEST
  );
};

const countFinalizedAttempts = async ({ scope, userId, testId, testType } = {}) => {
  const normalizedScope = String(scope || '').trim().toLowerCase();
  const numericUserId = Number(userId);

  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return 0;
  }

  if (normalizedScope === 'ix-reading') {
    return ReadingSubmission.count({
      where: {
        testId: String(testId),
        userId: numericUserId,
        ...FINALIZED_READING_WHERE,
      },
    });
  }

  if (normalizedScope === 'ix-listening') {
    return ListeningSubmission.count({
      where: {
        testId: Number(testId),
        userId: numericUserId,
        ...FINALIZED_LISTENING_WHERE,
      },
    });
  }

  if (normalizedScope === 'ix-writing') {
    return Submission.count({
      where: {
        testId: Number(testId),
        userId: numericUserId,
        ...FINALIZED_WRITING_WHERE,
      },
    });
  }

  if (normalizedScope === 'cambridge') {
    return CambridgeSubmission.count({
      where: {
        testId: Number(testId),
        testType: String(testType || '').trim(),
        userId: numericUserId,
        ...FINALIZED_CAMBRIDGE_WHERE,
      },
    });
  }

  return 0;
};

const normalizeAttemptStatusTestId = (value) => {
  const numericValue = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const buildAttemptStatusKey = ({ scope, testId, testType } = {}) => {
  const normalizedScope = String(scope || '').trim().toLowerCase();
  const normalizedTestId = normalizeAttemptStatusTestId(testId);

  if (!normalizedScope || !normalizedTestId) {
    return null;
  }

  if (normalizedScope === 'cambridge') {
    const normalizedTestType = String(testType || '').trim().toLowerCase();
    if (!normalizedTestType) {
      return null;
    }

    return `${normalizedScope}:${normalizedTestId}:${normalizedTestType}`;
  }

  return `${normalizedScope}:${normalizedTestId}`;
};

const incrementAttemptStatusCount = (countsByKey, key) => {
  if (!key) return;
  countsByKey[key] = Number(countsByKey[key] || 0) + 1;
};

const getAttemptStatusForStudent = async ({ userId } = {}) => {
  const numericUserId = Number(userId);
  if (!Number.isFinite(numericUserId) || numericUserId <= 0) {
    return null;
  }

  const user = await User.findByPk(numericUserId, {
    attributes: ['id', 'role', 'maxAttemptsPerTest'],
  });

  if (!user) {
    return null;
  }

  if (!isStudentRole(user.role)) {
    return {
      enforced: false,
      maxAttempts: null,
      countsByKey: {},
    };
  }

  const [writingSubmissions, readingSubmissions, listeningSubmissions, cambridgeSubmissions] =
    await Promise.all([
      Submission.findAll({
        where: {
          userId: numericUserId,
          ...FINALIZED_WRITING_WHERE,
        },
        attributes: ['testId'],
      }),
      ReadingSubmission.findAll({
        where: {
          userId: numericUserId,
          ...FINALIZED_READING_WHERE,
        },
        attributes: ['testId'],
      }),
      ListeningSubmission.findAll({
        where: {
          userId: numericUserId,
          ...FINALIZED_LISTENING_WHERE,
        },
        attributes: ['testId'],
      }),
      CambridgeSubmission.findAll({
        where: {
          userId: numericUserId,
          ...FINALIZED_CAMBRIDGE_WHERE,
        },
        attributes: ['testId', 'testType'],
      }),
    ]);

  const countsByKey = {};

  writingSubmissions.forEach((submission) => {
    incrementAttemptStatusCount(
      countsByKey,
      buildAttemptStatusKey({
        scope: 'ix-writing',
        testId: submission?.testId,
      })
    );
  });

  readingSubmissions.forEach((submission) => {
    incrementAttemptStatusCount(
      countsByKey,
      buildAttemptStatusKey({
        scope: 'ix-reading',
        testId: submission?.testId,
      })
    );
  });

  listeningSubmissions.forEach((submission) => {
    incrementAttemptStatusCount(
      countsByKey,
      buildAttemptStatusKey({
        scope: 'ix-listening',
        testId: submission?.testId,
      })
    );
  });

  cambridgeSubmissions.forEach((submission) => {
    incrementAttemptStatusCount(
      countsByKey,
      buildAttemptStatusKey({
        scope: 'cambridge',
        testId: submission?.testId,
        testType: submission?.testType,
      })
    );
  });

  return {
    enforced: true,
    maxAttempts: normalizeAttemptLimit(
      user.maxAttemptsPerTest,
      DEFAULT_MAX_ATTEMPTS_PER_TEST
    ),
    countsByKey,
  };
};

const enforceAttemptLimitForNewSubmission = async ({
  userId,
  scope,
  testId,
  testType,
} = {}) => {
  const allowedAttempts = await resolveStudentAttemptLimit({ userId });
  if (!allowedAttempts) {
    return {
      enforced: false,
      allowedAttempts: null,
      usedAttempts: null,
    };
  }

  const usedAttempts = await countFinalizedAttempts({
    scope,
    userId,
    testId,
    testType,
  });

  if (usedAttempts >= allowedAttempts) {
    throw createAttemptLimitError({ allowedAttempts, usedAttempts });
  }

  return {
    enforced: true,
    allowedAttempts,
    usedAttempts,
  };
};

module.exports = {
  DEFAULT_MAX_ATTEMPTS_PER_TEST,
  createAttemptLimitError,
  enforceAttemptLimitForNewSubmission,
  getAttemptStatusForStudent,
  normalizeAttemptLimit,
};
