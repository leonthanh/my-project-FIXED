const EXAM_SKILL_TEMPLATES = Object.freeze([
  Object.freeze({
    skill: "reading",
    label: "Reading",
    templateId: "exam-reading-v1",
    templateName: "Reading standard template",
    defaultDurationMinutes: 45,
  }),
  Object.freeze({
    skill: "listening",
    label: "Listening",
    templateId: "exam-listening-v1",
    templateName: "Listening standard template",
    defaultDurationMinutes: 30,
  }),
  Object.freeze({
    skill: "writing",
    label: "Writing",
    templateId: "writing-task-v1",
    templateName: "Writing task template",
    defaultDurationMinutes: 45,
  }),
]);

const SUPPORTED_SKILL_TEMPLATES = Object.freeze(
  Object.fromEntries(
    EXAM_SKILL_TEMPLATES.map(({ skill, templateId }) => [skill, templateId])
  )
);

const SKILL_LABELS = Object.freeze(
  Object.fromEntries(
    EXAM_SKILL_TEMPLATES.map(({ skill, label }) => [skill, label])
  )
);

module.exports = {
  EXAM_SKILL_TEMPLATES,
  SKILL_LABELS,
  SUPPORTED_SKILL_TEMPLATES,
};
