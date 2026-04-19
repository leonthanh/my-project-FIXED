export const DEFAULT_IX_SKILL = "writing";

export const IX_SKILLS = [
  { key: "writing", label: "Writing", icon: "writing", hint: "Essays and teacher review." },
  { key: "reading", label: "Reading", icon: "reading", hint: "Timed passages and matching." },
  { key: "listening", label: "Listening", icon: "listening", hint: "Audio-first practice." },
];

export const SKILL_META = Object.fromEntries(
  IX_SKILLS.map(({ key, label, icon, hint }) => [key, { label, icon, hint }])
);

const IX_SKILL_SET = new Set(IX_SKILLS.map(({ key }) => key));

export function normalizeIxSkill(skill) {
  return IX_SKILL_SET.has(skill) ? skill : DEFAULT_IX_SKILL;
}