const {
  normalizeExamLevelPayload,
} = require("../utils/examLevelValidation");
const { EXAM_SKILL_TEMPLATES } = require("../utils/examSkillTemplates");

describe("exam level registry validation", () => {
  const validLevel = {
    code: "prepare",
    name: "Prepare",
    description: "Prepare level exams",
    skills: ["reading", "listening", "writing"],
    skillConfig: {
      reading: { templateId: "exam-reading-v1", weight: 1, durationMinutes: 45 },
      listening: { templateId: "exam-listening-v1", weight: 1, durationMinutes: 30 },
      writing: { templateId: "writing-task-v1", weight: 2, durationMinutes: 60 },
    },
    sortOrder: 10,
  };

  test("normalizes a level with shared skill template configuration", () => {
    expect(normalizeExamLevelPayload(validLevel, { isCreate: true })).toEqual({
      ...validLevel,
      isActive: true,
    });
  });

  test("rejects duplicate or unsupported skills", () => {
    expect(() =>
      normalizeExamLevelPayload({ ...validLevel, skills: ["reading", "reading"] }, {
        isCreate: true,
      })
    ).toThrow("Skills must be unique");
    expect(() =>
      normalizeExamLevelPayload({ ...validLevel, skills: ["speaking"] }, {
        isCreate: true,
      })
    ).toThrow("Skills must be unique");
  });

  test("rejects invalid score weights and durations", () => {
    expect(() =>
      normalizeExamLevelPayload({
        ...validLevel,
        skillConfig: {
          ...validLevel.skillConfig,
          reading: { ...validLevel.skillConfig.reading, weight: 0 },
        },
      }, { isCreate: true })
    ).toThrow("weight must be greater than 0");
    expect(() =>
      normalizeExamLevelPayload({
        ...validLevel,
        skillConfig: {
          ...validLevel.skillConfig,
          listening: { ...validLevel.skillConfig.listening, durationMinutes: 0 },
        },
      }, { isCreate: true })
    ).toThrow("duration must be between 1 and 600");
  });

  test("does not allow code changes through an update payload", () => {
    expect(normalizeExamLevelPayload(validLevel)).not.toHaveProperty("code");
  });

  test("publishes one stable shared template for every supported skill", () => {
    expect(EXAM_SKILL_TEMPLATES.map(({ skill }) => skill)).toEqual([
      "reading",
      "listening",
      "writing",
    ]);
    expect(EXAM_SKILL_TEMPLATES.map(({ templateId }) => templateId)).toEqual([
      "exam-reading-v1",
      "exam-listening-v1",
      "writing-task-v1",
    ]);
  });
});
