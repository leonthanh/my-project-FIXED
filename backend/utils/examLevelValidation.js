const {
  SKILL_LABELS,
  SUPPORTED_SKILL_TEMPLATES,
} = require("./examSkillTemplates");

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeExamLevelPayload = (input, { isCreate = false } = {}) => {
  if (!isPlainObject(input)) {
    throw createValidationError("Request body must be an object.");
  }

  const name = String(input.name || "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 80) {
    throw createValidationError("Level name must contain 1 to 80 characters.");
  }

  let code;
  if (isCreate) {
    code = String(input.code || "").trim().toLowerCase();
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(code) || code.length > 40) {
      throw createValidationError(
        "Level code must be a 1-40 character lowercase slug."
      );
    }
  }

  if (!Array.isArray(input.skills) || input.skills.length === 0) {
    throw createValidationError("Select at least one skill.");
  }

  const skills = [...new Set(input.skills.map((skill) => String(skill)))];
  const unknownSkills = skills.filter((skill) => !SKILL_LABELS[skill]);
  if (unknownSkills.length > 0 || skills.length !== input.skills.length) {
    throw createValidationError(
      "Skills must be unique values from reading, listening, and writing."
    );
  }

  const providedConfig = isPlainObject(input.skillConfig) ? input.skillConfig : {};
  const skillConfig = {};
  for (const skill of skills) {
    const config = isPlainObject(providedConfig[skill]) ? providedConfig[skill] : {};
    const templateId = String(
      config.templateId || SUPPORTED_SKILL_TEMPLATES[skill]
    );
    if (templateId !== SUPPORTED_SKILL_TEMPLATES[skill]) {
      throw createValidationError(
        `Unsupported ${SKILL_LABELS[skill]} template.`
      );
    }

    const weight = Number(config.weight ?? 1);
    const durationMinutes = Number(config.durationMinutes ?? 45);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      throw createValidationError(
        `${SKILL_LABELS[skill]} weight must be greater than 0 and at most 100.`
      );
    }
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 600
    ) {
      throw createValidationError(
        `${SKILL_LABELS[skill]} duration must be between 1 and 600 minutes.`
      );
    }

    skillConfig[skill] = { templateId, weight, durationMinutes };
  }

  const description = String(input.description || "")
    .replace(/\s+/g, " ")
    .trim();
  if (description.length > 500) {
    throw createValidationError("Description must be at most 500 characters.");
  }

  const sortOrder = Number(input.sortOrder ?? 0);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    throw createValidationError("Sort order must be an integer from 0 to 10000.");
  }
  if (input.isActive !== undefined && typeof input.isActive !== "boolean") {
    throw createValidationError("isActive must be a boolean.");
  }

  const result = {
    name,
    description,
    skills,
    skillConfig,
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
    sortOrder,
  };

  if (isCreate) result.code = code;
  return result;
};

module.exports = {
  SKILL_LABELS,
  SUPPORTED_SKILL_TEMPLATES,
  normalizeExamLevelPayload,
};
