export const DEFAULT_GENERAL_TYPE = 'placement';
export const DEFAULT_GENERAL_SKILL = 'reading';

export const GENERAL_SKILLS = [
  { key: 'reading', label: 'Reading & Writing', icon: 'reading', hint: 'Combined reading and writing tasks.' },
  { key: 'listening', label: 'Listening', icon: 'listening', hint: 'Audio-based questions.' },
];

export const GENERAL_SKILL_META = Object.fromEntries(
  GENERAL_SKILLS.map(({ key, label, icon, hint }) => [key, { label, icon, hint }])
);

const GENERAL_SKILL_SET = new Set(GENERAL_SKILLS.map(({ key }) => key));

export function normalizeGeneralSkill(skill) {
  return GENERAL_SKILL_SET.has(skill) ? skill : DEFAULT_GENERAL_SKILL;
}

export const GENERAL_LEVEL_META = {
  id: 'general',
  name: 'General',
  shortLabel: 'General',
  iconName: 'tests',
  allowedSkills: GENERAL_SKILLS.map(({ key }) => key),
  readingTestType: 'general-reading-60',
  testConfigIds: {
    reading: 'general-reading-60',
    listening: 'general-listening',
  },
  createPaths: {
    reading: '/admin/create-general-reading',
    listening: '/admin/create-general-listening',
  },
};
