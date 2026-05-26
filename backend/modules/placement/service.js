const crypto = require("crypto");
const { Op } = require("sequelize");

const PlacementPackage = require("../../models/PlacementPackage");
const PlacementPackageItem = require("../../models/PlacementPackageItem");
const PlacementAttempt = require("../../models/PlacementAttempt");
const PlacementAttemptItem = require("../../models/PlacementAttemptItem");
const WritingSubmission = require("../../models/Submission");
const ReadingSubmission = require("../../models/ReadingSubmission");
const ListeningSubmission = require("../../models/ListeningSubmission");
const CambridgeSubmission = require("../../models/CambridgeSubmission");

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeText(value).toLowerCase();
const normalizePhone = (value) => normalizeText(value).replace(/\s+/g, "");

const createOpaqueToken = (prefix) =>
  `${prefix}_${crypto.randomBytes(18).toString("hex")}`;

const RUNTIME_SUBMISSION_MODELS = {
  writing: WritingSubmission,
  reading: ReadingSubmission,
  listening: ListeningSubmission,
  cambridge: CambridgeSubmission,
};

const sortByOrder = (rows) =>
  [...(rows || [])].sort((left, right) => {
    const orderDelta = Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);
    if (orderDelta !== 0) return orderDelta;
    return Number(left?.id || 0) - Number(right?.id || 0);
  });

const normalizePlacementItem = (item, index = 0) => {
  const platform = normalizeLower(item?.platform);
  const skill = normalizeLower(item?.skill);
  const testId = normalizeText(item?.testId);
  const title = normalizeText(item?.title);

  if (!platform || !skill || !testId || !title) {
    return null;
  }

  return {
    platform,
    skill,
    testId,
    testType: normalizeLower(item?.testType) || null,
    title,
    subtitle: normalizeText(item?.subtitle) || null,
    badge: normalizeText(item?.badge) || null,
    questionsLabel: normalizeText(item?.questionsLabel) || null,
    durationLabel: normalizeText(item?.durationLabel) || null,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
  };
};

const getAttemptItems = async (attemptId) => {
  const rows = await PlacementAttemptItem.findAll({ where: { attemptId } });
  return sortByOrder(rows);
};

const getPackageItems = async (packageId) => {
  const rows = await PlacementPackageItem.findAll({ where: { packageId } });
  return sortByOrder(rows);
};

const summarizeAttemptItems = (items = []) => {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item?.status === "started") summary.started += 1;
      if (item?.status === "submitted") summary.submitted += 1;
      if (item?.skill === "writing") summary.writing += 1;
      if (item?.skill === "reading") summary.reading += 1;
      if (item?.skill === "listening") summary.listening += 1;
      if (item?.platform === "ix") summary.ix += 1;
      if (item?.platform === "orange") summary.orange += 1;
      return summary;
    },
    {
      total: 0,
      started: 0,
      submitted: 0,
      writing: 0,
      reading: 0,
      listening: 0,
      ix: 0,
      orange: 0,
    }
  );
};

const buildAttemptItemMatchKey = (item) => {
  return [
    normalizeLower(item?.platform),
    normalizeLower(item?.skill),
    normalizeText(item?.testId),
    normalizeLower(item?.testType),
  ].join("::");
};

const isPrunableAttemptItem = (item) => {
  return (
    normalizeLower(item?.status) === "assigned" &&
    !Number(item?.runtimeSubmissionId) &&
    !item?.startedAt &&
    !item?.submittedAt
  );
};

const buildAttemptItemUpdatePayload = (attemptItem, packageItem) => {
  const nextValues = {};

  if (Number(attemptItem?.packageItemId || 0) !== Number(packageItem?.id || 0)) {
    nextValues.packageItemId = packageItem.id;
  }
  if (normalizeLower(attemptItem?.platform) !== normalizeLower(packageItem?.platform)) {
    nextValues.platform = packageItem.platform;
  }
  if (normalizeLower(attemptItem?.skill) !== normalizeLower(packageItem?.skill)) {
    nextValues.skill = packageItem.skill;
  }
  if (normalizeText(attemptItem?.testId) !== normalizeText(packageItem?.testId)) {
    nextValues.testId = String(packageItem.testId);
  }
  if (normalizeLower(attemptItem?.testType) !== normalizeLower(packageItem?.testType)) {
    nextValues.testType = packageItem.testType || null;
  }
  if (normalizeText(attemptItem?.title) !== normalizeText(packageItem?.title)) {
    nextValues.title = packageItem.title;
  }
  if (normalizeText(attemptItem?.subtitle) !== normalizeText(packageItem?.subtitle)) {
    nextValues.subtitle = packageItem.subtitle || null;
  }
  if (normalizeText(attemptItem?.badge) !== normalizeText(packageItem?.badge)) {
    nextValues.badge = packageItem.badge || null;
  }
  if (
    normalizeText(attemptItem?.questionsLabel) !==
    normalizeText(packageItem?.questionsLabel)
  ) {
    nextValues.questionsLabel = packageItem.questionsLabel || null;
  }
  if (
    normalizeText(attemptItem?.durationLabel) !==
    normalizeText(packageItem?.durationLabel)
  ) {
    nextValues.durationLabel = packageItem.durationLabel || null;
  }
  if (Number(attemptItem?.sortOrder || 0) !== Number(packageItem?.sortOrder || 0)) {
    nextValues.sortOrder = Number.isFinite(Number(packageItem?.sortOrder))
      ? Number(packageItem.sortOrder)
      : 0;
  }

  return nextValues;
};

const syncAttemptItemsFromPackage = async ({ attempt, packageItems = [] }) => {
  const existingAttemptItems = await getAttemptItems(attempt.id);
  const attemptQueues = new Map();

  existingAttemptItems.forEach((attemptItem) => {
    const key = buildAttemptItemMatchKey(attemptItem);
    if (!attemptQueues.has(key)) {
      attemptQueues.set(key, []);
    }
    attemptQueues.get(key).push(attemptItem);
  });

  const matchedAttemptItemIds = new Set();
  const itemsToCreate = [];

  for (const packageItem of sortByOrder(packageItems)) {
    const key = buildAttemptItemMatchKey(packageItem);
    const queue = attemptQueues.get(key) || [];
    const matchedAttemptItem = queue.shift();

    if (!matchedAttemptItem) {
      itemsToCreate.push(packageItem);
      continue;
    }

    matchedAttemptItemIds.add(matchedAttemptItem.id);
    const nextValues = buildAttemptItemUpdatePayload(matchedAttemptItem, packageItem);

    if (Object.keys(nextValues).length) {
      await matchedAttemptItem.update(nextValues);
    }
  }

  const staleAssignedAttemptItemIds = existingAttemptItems
    .filter(
      (attemptItem) =>
        !matchedAttemptItemIds.has(attemptItem.id) && isPrunableAttemptItem(attemptItem)
    )
    .map((attemptItem) => attemptItem.id);

  if (itemsToCreate.length) {
    await PlacementAttemptItem.bulkCreate(
      itemsToCreate.map((item) => ({
        attemptId: attempt.id,
        packageItemId: item.id,
        attemptItemToken: createOpaqueToken("item"),
        platform: item.platform,
        skill: item.skill,
        testId: String(item.testId),
        testType: item.testType || null,
        title: item.title,
        subtitle: item.subtitle || null,
        badge: item.badge || null,
        questionsLabel: item.questionsLabel || null,
        durationLabel: item.durationLabel || null,
        sortOrder: item.sortOrder || 0,
        status: "assigned",
      }))
    );
  }

  if (staleAssignedAttemptItemIds.length) {
    await PlacementAttemptItem.destroy({
      where: { id: { [Op.in]: staleAssignedAttemptItemIds } },
    });
  }
};

const serializeAttemptItem = (item) => {
  const data = item?.toJSON ? item.toJSON() : { ...item };
  return {
    ...data,
    testId: normalizeText(data.testId),
    testType: normalizeLower(data.testType) || "",
    platform: normalizeLower(data.platform),
    skill: normalizeLower(data.skill),
  };
};

const serializeAttempt = async (attempt) => {
  const items = (await getAttemptItems(attempt.id)).map(serializeAttemptItem);
  const placementPackage = await PlacementPackage.findByPk(attempt.packageId);

  return {
    ...(attempt.toJSON ? attempt.toJSON() : { ...attempt }),
    studentPhone: normalizePhone(attempt.studentPhone),
    shareToken: placementPackage?.shareToken || "",
    packageTitle: placementPackage?.title || "",
    summary: summarizeAttemptItems(items),
    items,
  };
};

const listRecentAttemptsForPackage = async (packageId, limit = 12) => {
  const attempts = await PlacementAttempt.findAll({
    where: { packageId },
    order: [["updatedAt", "DESC"]],
    limit,
  });

  const serialized = [];
  for (const attempt of attempts) {
    serialized.push(await serializeAttempt(attempt));
  }
  return serialized;
};

const getPlacementContactsForRuntimeSubmissions = async ({
  runtimeSubmissionModel,
  runtimeSubmissionIds,
}) => {
  const normalizedModel = normalizeLower(runtimeSubmissionModel);
  const ids = Array.from(
    new Set(
      (Array.isArray(runtimeSubmissionIds) ? runtimeSubmissionIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );

  const contacts = new Map();

  if (!normalizedModel || !ids.length) {
    return contacts;
  }

  const attemptItems = await PlacementAttemptItem.findAll({
    where: {
      runtimeSubmissionModel: normalizedModel,
      runtimeSubmissionId: { [Op.in]: ids },
    },
    order: [["updatedAt", "DESC"], ["id", "DESC"]],
  });

  if (!attemptItems.length) {
    return contacts;
  }

  const attemptIds = Array.from(
    new Set(
      attemptItems
        .map((item) => Number(item?.attemptId))
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  );

  if (!attemptIds.length) {
    return contacts;
  }

  const attempts = await PlacementAttempt.findAll({
    where: { id: { [Op.in]: attemptIds } },
  });
  const attemptMap = new Map(
    attempts.map((attempt) => [String(attempt.id), attempt])
  );

  attemptItems.forEach((item) => {
    const submissionId = String(item?.runtimeSubmissionId || "").trim();
    if (!submissionId || contacts.has(submissionId)) {
      return;
    }

    const attempt = attemptMap.get(String(item?.attemptId || ""));
    if (!attempt) {
      return;
    }

    contacts.set(submissionId, {
      attemptId: attempt.id,
      attemptItemToken: item.attemptItemToken || "",
      studentName: normalizeText(attempt.studentName) || null,
      studentPhone: normalizePhone(attempt.studentPhone) || null,
    });
  });

  return contacts;
};

const serializePackage = async (placementPackage, options = {}) => {
  const { includeAttempts = false } = options;
  const items = (await getPackageItems(placementPackage.id)).map((item) =>
    item.toJSON ? item.toJSON() : { ...item }
  );

  const payload = {
    ...(placementPackage.toJSON ? placementPackage.toJSON() : { ...placementPackage }),
    items,
  };

  if (includeAttempts) {
    payload.recentAttempts = await listRecentAttemptsForPackage(placementPackage.id);
  }

  return payload;
};

const ensureCurrentPackageForOwner = async (ownerUser) => {
  const ownerUserId = Number(ownerUser?.id);
  if (!ownerUserId) {
    throw createServiceError(401, "Missing owner context.");
  }

  let placementPackage = await PlacementPackage.findOne({
    where: { ownerUserId, isActive: true },
    order: [["updatedAt", "DESC"]],
  });

  if (!placementPackage) {
    placementPackage = await PlacementPackage.create({
      ownerUserId,
      title: `${normalizeText(ownerUser?.name) || "Teacher"} Placement Package`,
      shareToken: createOpaqueToken("pkg"),
      isActive: true,
    });
  } else if (!placementPackage.shareToken) {
    await placementPackage.update({ shareToken: createOpaqueToken("pkg") });
  }

  return placementPackage;
};

const getCurrentPackageForOwner = async (ownerUser) => {
  const placementPackage = await ensureCurrentPackageForOwner(ownerUser);
  return serializePackage(placementPackage, { includeAttempts: true });
};

const replaceCurrentPackageItems = async ({ ownerUser, items = [] }) => {
  const placementPackage = await ensureCurrentPackageForOwner(ownerUser);
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item, index) => normalizePlacementItem(item, index))
    .filter(Boolean);

  await PlacementPackageItem.destroy({ where: { packageId: placementPackage.id } });

  if (normalizedItems.length) {
    await PlacementPackageItem.bulkCreate(
      normalizedItems.map((item) => ({
        packageId: placementPackage.id,
        ...item,
      }))
    );
  }

  await placementPackage.update({
    lastPublishedAt: normalizedItems.length ? new Date() : placementPackage.lastPublishedAt,
  });

  return serializePackage(placementPackage, { includeAttempts: true });
};

const getPackageByShareToken = async (shareToken) => {
  const normalizedShareToken = normalizeText(shareToken);
  if (!normalizedShareToken) {
    throw createServiceError(400, "Missing share token.");
  }

  const placementPackage = await PlacementPackage.findOne({
    where: { shareToken: normalizedShareToken, isActive: true },
  });

  if (!placementPackage) {
    throw createServiceError(404, "Placement package not found.");
  }

  return placementPackage;
};

const getPublicPackageByShareToken = async (shareToken) => {
  const placementPackage = await getPackageByShareToken(shareToken);
  return serializePackage(placementPackage);
};

const getDefaultPublicPackage = async () => {
  const placementPackages = await PlacementPackage.findAll({
    where: { isActive: true },
    order: [
      ["lastPublishedAt", "DESC"],
      ["updatedAt", "DESC"],
      ["id", "DESC"],
    ],
  });

  for (const placementPackage of placementPackages) {
    const packageItems = await getPackageItems(placementPackage.id);
    if (packageItems.length) {
      return serializePackage(placementPackage);
    }
  }

  throw createServiceError(404, "No published placement package found.");
};

const findActiveAttemptForStudent = async ({ packageId, studentPhone }) => {
  return PlacementAttempt.findOne({
    where: {
      packageId,
      studentPhone: normalizePhone(studentPhone),
      status: "active",
    },
    order: [["updatedAt", "DESC"]],
  });
};

const createAttemptItemsFromPackage = async ({ attemptId, packageItems = [] }) => {
  if (!packageItems.length) return [];

  await PlacementAttemptItem.bulkCreate(
    packageItems.map((item) => ({
      attemptId,
      packageItemId: item.id,
      attemptItemToken: createOpaqueToken("item"),
      platform: item.platform,
      skill: item.skill,
      testId: String(item.testId),
      testType: item.testType || null,
      title: item.title,
      subtitle: item.subtitle || null,
      badge: item.badge || null,
      questionsLabel: item.questionsLabel || null,
      durationLabel: item.durationLabel || null,
      sortOrder: item.sortOrder || 0,
      status: "assigned",
    }))
  );
};

const createOrResumeAttemptForShareToken = async ({
  shareToken,
  studentName,
  studentPhone,
}) => {
  const normalizedStudentName = normalizeText(studentName);
  const normalizedStudentPhone = normalizePhone(studentPhone);

  if (!normalizedStudentName || !normalizedStudentPhone) {
    throw createServiceError(400, "Missing student name or phone.");
  }

  const placementPackage = await getPackageByShareToken(shareToken);
  let attempt = await findActiveAttemptForStudent({
    packageId: placementPackage.id,
    studentPhone: normalizedStudentPhone,
  });

  if (attempt) {
    const packageItems = await getPackageItems(placementPackage.id);
    if (normalizedStudentName && attempt.studentName !== normalizedStudentName) {
      await attempt.update({ studentName: normalizedStudentName });
    }
    await syncAttemptItemsFromPackage({ attempt, packageItems });
    return serializeAttempt(attempt);
  }

  const packageItems = await getPackageItems(placementPackage.id);
  attempt = await PlacementAttempt.create({
    packageId: placementPackage.id,
    ownerUserId: placementPackage.ownerUserId,
    attemptToken: createOpaqueToken("attempt"),
    studentName: normalizedStudentName,
    studentPhone: normalizedStudentPhone,
    status: "active",
    startedAt: new Date(),
  });

  await createAttemptItemsFromPackage({ attemptId: attempt.id, packageItems });

  return serializeAttempt(attempt);
};

const getAttemptByTokenRecord = async (attemptToken) => {
  const normalizedAttemptToken = normalizeText(attemptToken);
  if (!normalizedAttemptToken) {
    throw createServiceError(400, "Missing attempt token.");
  }

  const attempt = await PlacementAttempt.findOne({ where: { attemptToken: normalizedAttemptToken } });
  if (!attempt) {
    throw createServiceError(404, "Placement attempt not found.");
  }
  return attempt;
};

const getPlacementAttemptByToken = async (attemptToken) => {
  const attempt = await getAttemptByTokenRecord(attemptToken);
  return serializeAttempt(attempt);
};

const getAttemptItemByTokenRecord = async (attemptItemToken) => {
  const normalizedAttemptItemToken = normalizeText(attemptItemToken);
  if (!normalizedAttemptItemToken) {
    throw createServiceError(400, "Missing attempt item token.");
  }

  const attemptItem = await PlacementAttemptItem.findOne({
    where: { attemptItemToken: normalizedAttemptItemToken },
  });

  if (!attemptItem) {
    throw createServiceError(404, "Placement attempt item not found.");
  }

  return attemptItem;
};

const getPlacementAttemptItemByToken = async (attemptItemToken) => {
  const attemptItem = await getAttemptItemByTokenRecord(attemptItemToken);
  const attempt = await PlacementAttempt.findByPk(attemptItem.attemptId);

  if (!attempt) {
    throw createServiceError(404, "Placement attempt not found.");
  }

  return {
    attempt: attempt.toJSON(),
    item: serializeAttemptItem(attemptItem),
  };
};

const ensureAttemptItemMatchesRuntime = async ({
  attemptItemToken,
  platform,
  skill,
  testId,
  testType = null,
}) => {
  const attemptItem = await getAttemptItemByTokenRecord(attemptItemToken);

  if (normalizeLower(attemptItem.platform) !== normalizeLower(platform)) {
    throw createServiceError(404, "Placement attempt item not found for this platform.");
  }

  if (normalizeLower(attemptItem.skill) !== normalizeLower(skill)) {
    throw createServiceError(404, "Placement attempt item not found for this skill.");
  }

  if (normalizeText(attemptItem.testId) !== normalizeText(testId)) {
    throw createServiceError(404, "Placement attempt item not found for this test.");
  }

  if (testType && normalizeLower(attemptItem.testType) !== normalizeLower(testType)) {
    throw createServiceError(404, "Placement attempt item not found for this test type.");
  }

  const attempt = await PlacementAttempt.findByPk(attemptItem.attemptId);
  if (!attempt) {
    throw createServiceError(404, "Placement attempt not found.");
  }

  return { attemptItem, attempt };
};

const getRuntimeSubmissionForAttemptItem = async ({
  attemptItemToken,
  platform,
  skill,
  testId,
  testType = null,
}) => {
  const { attemptItem, attempt } = await ensureAttemptItemMatchesRuntime({
    attemptItemToken,
    platform,
    skill,
    testId,
    testType,
  });

  if (!attemptItem.runtimeSubmissionId || !attemptItem.runtimeSubmissionModel) {
    return { attemptItem, attempt, submission: null };
  }

  const Model = RUNTIME_SUBMISSION_MODELS[attemptItem.runtimeSubmissionModel];
  if (!Model) {
    return { attemptItem, attempt, submission: null };
  }

  const submission = await Model.findByPk(attemptItem.runtimeSubmissionId);
  return { attemptItem, attempt, submission };
};

const maybeCompleteAttempt = async (attemptId) => {
  const attemptItems = await getAttemptItems(attemptId);
  const allSubmitted = attemptItems.length > 0 && attemptItems.every((item) => item.status === "submitted");

  if (!allSubmitted) {
    return null;
  }

  const attempt = await PlacementAttempt.findByPk(attemptId);
  if (!attempt) return null;
  if (attempt.status !== "completed" || !attempt.completedAt) {
    await attempt.update({ status: "completed", completedAt: new Date() });
  }
  return attempt;
};

const syncRuntimeSubmissionForAttemptItem = async ({
  attemptItemToken,
  platform,
  skill,
  testId,
  testType = null,
  runtimeSubmissionModel,
  runtimeSubmissionId,
  status,
  correct,
  totalQuestions,
  percentage,
  band,
}) => {
  const { attemptItem, attempt } = await ensureAttemptItemMatchesRuntime({
    attemptItemToken,
    platform,
    skill,
    testId,
    testType,
  });

  const now = new Date();
  const nextStatus = status || attemptItem.status;
  const nextValues = {
    runtimeSubmissionModel: runtimeSubmissionModel || attemptItem.runtimeSubmissionModel,
    runtimeSubmissionId: Number(runtimeSubmissionId) || attemptItem.runtimeSubmissionId,
    status: nextStatus,
  };

  if (nextStatus === "started" && !attemptItem.startedAt) {
    nextValues.startedAt = now;
  }

  if (nextStatus === "submitted") {
    nextValues.startedAt = attemptItem.startedAt || now;
    nextValues.submittedAt = now;
    nextValues.correct = Number.isFinite(Number(correct)) ? Number(correct) : attemptItem.correct;
    nextValues.totalQuestions = Number.isFinite(Number(totalQuestions))
      ? Number(totalQuestions)
      : attemptItem.totalQuestions;
    nextValues.percentage = Number.isFinite(Number(percentage))
      ? Number(percentage)
      : attemptItem.percentage;
    nextValues.band = Number.isFinite(Number(band)) ? Number(band) : attemptItem.band;
  }

  await attemptItem.update(nextValues);

  let finalizedAttempt = null;
  if (nextStatus === "submitted") {
    finalizedAttempt = await maybeCompleteAttempt(attempt.id);
  }

  return {
    attempt: finalizedAttempt || attempt,
    attemptItem,
  };
};

module.exports = {
  createServiceError,
  createOrResumeAttemptForShareToken,
  ensureAttemptItemMatchesRuntime,
  getPlacementContactsForRuntimeSubmissions,
  getDefaultPublicPackage,
  getCurrentPackageForOwner,
  getPlacementAttemptByToken,
  getPlacementAttemptItemByToken,
  getPublicPackageByShareToken,
  getRuntimeSubmissionForAttemptItem,
  normalizePhone,
  replaceCurrentPackageItems,
  serializeAttempt,
  syncRuntimeSubmissionForAttemptItem,
};