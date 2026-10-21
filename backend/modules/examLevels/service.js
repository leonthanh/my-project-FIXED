const { Op } = require("sequelize");
const { ExamLevel, ExamLevelSubmission, ExamLevelTest } = require("../../models");
const { processTestParts } = require("../../utils/clozParser");
const { normalizeStudentResultVisibility } = require("../../utils/studentResultVisibility");
const { scoreTest } = require("../cambridge/shared/scoring");
const { countTotalQuestionsFromParts } = require("../cambridge/shared/readingTestUtils");

const ALLOWED_SKILLS = new Set(["reading", "listening", "writing"]);

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeCode = (value) => String(value || "").trim().toLowerCase();
const normalizeSkill = (value) => String(value || "").trim().toLowerCase();
const isTeacher = (user) => ["teacher", "admin"].includes(String(user?.role || "").toLowerCase());
const resolveSkillForTemplate = (level, templateId) =>
  (level.skills || []).find(
    (skill) => level.skillConfig?.[skill]?.templateId === String(templateId || "")
  );

const getLevel = async (code) => {
  const level = await ExamLevel.findOne({ where: { code: normalizeCode(code) } });
  if (!level || !level.isActive) {
    throw createServiceError(404, "Exam level not found.");
  }
  return level;
};

const getConfiguredTemplate = (level, skill) => {
  const normalizedSkill = normalizeSkill(skill);
  if (!ALLOWED_SKILLS.has(normalizedSkill) || !level.skills.includes(normalizedSkill)) {
    throw createServiceError(404, "This skill is not enabled for the exam level.");
  }
  const config = level.skillConfig?.[normalizedSkill];
  if (!config?.templateId) {
    throw createServiceError(409, "This skill has no configured template.");
  }
  return { skill: normalizedSkill, config };
};

const getTest = async ({ level, skill, id, includeUnpublished = false }) => {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw createServiceError(404, "Exam test not found.");
  }
  const where = { id: numericId, levelId: level.id, skill };
  if (!includeUnpublished) where.status = "published";
  const test = await ExamLevelTest.findOne({ where });
  if (!test) throw createServiceError(404, "Exam test not found.");
  return test;
};

const toPublicTest = (test) => {
  const value = test.toJSON();
  delete value.parts;
  return value;
};

const getLevelByCode = async (code) => {
  const level = await getLevel(code);
  return level.toJSON();
};

const listTests = async ({ code, skill, user }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill } = getConfiguredTemplate(level, skill);
  const where = { levelId: level.id, skill: normalizedSkill };
  where.status = isTeacher(user) ? { [Op.ne]: "archived" } : "published";
  const tests = await ExamLevelTest.findAll({
    where,
    order: [["createdAt", "DESC"]],
  });
  return tests.map(toPublicTest);
};

const getTestById = async ({ code, skill, id, user }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill } = getConfiguredTemplate(level, skill);
  const test = await getTest({
    level,
    skill: normalizedSkill,
    id,
    includeUnpublished: isTeacher(user),
  });
  return {
    ...test.toJSON(),
    level: {
      code: level.code,
      name: level.name,
      skill: normalizedSkill,
    },
  };
};

const createTest = async ({ code, skill, body = {}, user }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill, config } = getConfiguredTemplate(level, skill);
  const title = String(body.title || "").trim();
  const classCode = String(body.classCode || "").trim();
  const parts = Array.isArray(body.parts) ? body.parts : null;
  if (!title || !classCode || !parts || parts.length === 0) {
    throw createServiceError(400, "Title, class code, and at least one part are required.");
  }
  if (String(body.testType || "") !== config.templateId) {
    throw createServiceError(400, "Test type does not match this level's configured skill template.");
  }

  const studentResultVisibility = normalizeStudentResultVisibility(
    body.studentResultVisibility,
    body.showResultModal
  );
  const processedParts = processTestParts(parts);
  const template = config.templateId;

  return ExamLevelTest.create({
    levelId: level.id,
    skill: normalizedSkill,
    templateId: template,
    title,
    classCode,
    teacherName: String(body.teacherName || "").trim(),
    testType: template,
    mainAudioUrl: String(body.mainAudioUrl || "").trim() || null,
    parts: processedParts,
    totalQuestions: countTotalQuestionsFromParts(processedParts),
    duration: Number(config.durationMinutes),
    status: body.status === "draft" ? "draft" : "published",
    showResultModal: studentResultVisibility !== "confirmation",
    studentResultVisibility,
    createdByUserId: Number(user?.id) || null,
  });
};

const updateTest = async ({ code, skill, id, body = {} }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill, config } = getConfiguredTemplate(level, skill);
  const test = await getTest({
    level,
    skill: normalizedSkill,
    id,
    includeUnpublished: true,
  });
  const updates = {};
  if (body.title !== undefined) {
    const title = String(body.title || "").trim();
    if (!title) throw createServiceError(400, "Title is required.");
    updates.title = title;
  }
  if (body.classCode !== undefined) {
    const classCode = String(body.classCode || "").trim();
    if (!classCode) throw createServiceError(400, "Class code is required.");
    updates.classCode = classCode;
  }
  if (body.testType !== undefined && String(body.testType) !== config.templateId) {
    throw createServiceError(400, "Test type does not match this level's configured skill template.");
  }
  if (body.parts !== undefined) {
    if (!Array.isArray(body.parts) || body.parts.length === 0) {
      throw createServiceError(400, "At least one part is required.");
    }
    updates.parts = processTestParts(body.parts);
    updates.totalQuestions = countTotalQuestionsFromParts(updates.parts);
  }
  if (body.mainAudioUrl !== undefined) {
    updates.mainAudioUrl = String(body.mainAudioUrl || "").trim() || null;
  }
  if (body.status !== undefined) {
    if (!["draft", "published", "archived"].includes(body.status)) {
      throw createServiceError(400, "Invalid exam test status.");
    }
    updates.status = body.status;
  }
  if (
    body.studentResultVisibility !== undefined ||
    body.showResultModal !== undefined
  ) {
    const visibility = normalizeStudentResultVisibility(
      body.studentResultVisibility,
      body.showResultModal
    );
    updates.studentResultVisibility = visibility;
    updates.showResultModal = visibility !== "confirmation";
  }
  await test.update(updates);
  return test;
};

const deleteTest = async ({ code, skill, id }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill } = getConfiguredTemplate(level, skill);
  const test = await getTest({
    level,
    skill: normalizedSkill,
    id,
    includeUnpublished: true,
  });
  await test.update({ status: "archived" });
};

const getActiveSubmission = async ({ code, query = {}, user }) => {
  const level = await getLevel(code);
  const testId = Number(query.testId);
  const skill =
    normalizeSkill(query.skill) ||
    resolveSkillForTemplate(level, query.testType);
  if (!Number.isInteger(testId) || testId <= 0 || !ALLOWED_SKILLS.has(skill)) {
    throw createServiceError(400, "Missing or invalid testId or skill.");
  }
  const test = await getTest({
    level,
    skill,
    id: testId,
  });
  const submission = await ExamLevelSubmission.findOne({
    where: {
      levelId: level.id,
      testId: test.id,
      userId: Number(user?.id),
      finished: false,
    },
    order: [["updatedAt", "DESC"]],
  });
  return {
    submission: submission?.toJSON() || null,
    timing: { expiresAt: submission?.expiresAt || null },
  };
};

const autosaveSubmission = async ({ code, body = {}, user }) => {
  const level = await getLevel(code);
  const skill =
    normalizeSkill(body.skill) ||
    resolveSkillForTemplate(level, body.testType);
  const { skill: normalizedSkill, config } = getConfiguredTemplate(level, skill);
  const testId = Number(body.testId);
  if (!Number.isInteger(testId) || testId <= 0 || body.testType !== config.templateId) {
    throw createServiceError(400, "Missing or invalid testId or testType.");
  }
  const test = await getTest({ level, skill: normalizedSkill, id: testId });
  const userId = Number(user?.id);
  const submissionId = Number(body.submissionId);
  let submission = null;
  if (submissionId) {
    submission = await ExamLevelSubmission.findOne({
      where: {
        id: submissionId,
        levelId: level.id,
        testId: test.id,
        userId,
        finished: false,
      },
    });
    if (!submission) throw createServiceError(404, "Active exam draft not found.");
  } else {
    submission = await ExamLevelSubmission.findOne({
      where: {
        levelId: level.id,
        testId: test.id,
        userId,
        finished: false,
      },
    });
  }

  const now = new Date();
  const expiresAt = body.expiresAt != null && Number.isFinite(Number(body.expiresAt))
    ? new Date(Number(body.expiresAt))
    : null;
  const values = {
    levelId: level.id,
    testId: test.id,
    skill: normalizedSkill,
    testType: test.testType,
    testTitle: test.title,
    studentName: String(body.studentName || body.user?.name || body.user?.username || "Student").trim(),
    studentPhone: String(body.studentPhone || body.user?.phone || "").trim() || null,
    studentEmail: String(body.studentEmail || body.user?.email || "").trim() || null,
    classCode: test.classCode,
    userId,
    answers: body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? body.answers
      : {},
    finished: false,
    expiresAt,
    lastSavedAt: now,
    progressMeta: body.progressMeta && typeof body.progressMeta === "object" && !Array.isArray(body.progressMeta)
      ? body.progressMeta
      : {},
    submittedAt: null,
  };
  if (submission) {
    await submission.update(values);
  } else {
    submission = await ExamLevelSubmission.create(values);
  }
  return {
    submission,
    timing: { expiresAt: submission.expiresAt },
  };
};

const submitTest = async ({ code, skill, id, body = {}, user }) => {
  const level = await getLevel(code);
  const { skill: normalizedSkill } = getConfiguredTemplate(level, skill);
  const test = await getTest({
    level,
    skill: normalizedSkill,
    id,
  });
  if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) {
    throw createServiceError(400, "Answers are required.");
  }
  const userId = Number(user?.id);
  const { score, total, percentage, detailedResults, breakdown } = scoreTest(
    test,
    body.answers
  );
  const submissionId = Number(body.submissionId);
  let submission = null;
  if (submissionId) {
    submission = await ExamLevelSubmission.findOne({
      where: {
        id: submissionId,
        levelId: level.id,
        testId: test.id,
        userId,
        finished: false,
      },
    });
    if (!submission) throw createServiceError(404, "Active exam draft not found.");
  } else {
    submission = await ExamLevelSubmission.findOne({
      where: {
        levelId: level.id,
        testId: test.id,
        userId,
        finished: false,
      },
    });
  }
  const submittedAt = new Date();
  const values = {
    levelId: level.id,
    testId: test.id,
    skill: normalizedSkill,
    testType: test.testType,
    testTitle: test.title,
    studentName: String(body.studentName || body.user?.name || body.user?.username || "Student").trim(),
    studentPhone: String(body.studentPhone || body.user?.phone || "").trim() || null,
    studentEmail: String(body.studentEmail || body.user?.email || "").trim() || null,
    classCode: test.classCode,
    userId,
    answers: body.answers,
    score,
    totalQuestions: total,
    percentage,
    detailedResults,
    timeSpent: Number(body.timeSpent) || null,
    timeRemaining: Number(body.timeRemaining) || null,
    status: "submitted",
    finished: true,
    expiresAt: null,
    lastSavedAt: null,
    progressMeta: null,
    submittedAt,
  };
  if (submission) {
    await submission.update(values);
  } else {
    submission = await ExamLevelSubmission.create(values);
  }
  return {
    submission,
    score,
    total,
    percentage,
    detailedResults,
    breakdown,
    studentResultVisibility: test.studentResultVisibility,
    showResultModal: test.showResultModal,
  };
};

module.exports = {
  autosaveSubmission,
  createTest,
  deleteTest,
  getActiveSubmission,
  getLevelByCode,
  getTestById,
  listTests,
  submitTest,
  updateTest,
};
