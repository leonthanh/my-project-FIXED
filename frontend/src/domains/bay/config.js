export const DEFAULT_BAY_TYPE = 'placement';
export const DEFAULT_BAY_SKILL = 'reading';

export const BAY_SKILLS = [
  { key: 'reading', label: 'Reading & Writing', icon: 'reading', hint: 'Combined reading and writing tasks.' },
  { key: 'listening', label: 'Listening', icon: 'listening', hint: 'Audio-based questions.' },
];

export const BAY_SKILL_META = Object.fromEntries(
  BAY_SKILLS.map(({ key, label, icon, hint }) => [key, { label, icon, hint }])
);

const BAY_SKILL_SET = new Set(BAY_SKILLS.map(({ key }) => key));

export function normalizeBaySkill(skill) {
  return BAY_SKILL_SET.has(skill) ? skill : DEFAULT_BAY_SKILL;
}

export const BAY_LEVEL_META = {
  id: 'bay',
  name: 'Cty Bay Placement',
  shortLabel: 'Bay',
  iconName: 'tests',
  allowedSkills: BAY_SKILLS.map(({ key }) => key),
  readingTestType: 'bay-reading',
  testConfigIds: {
    reading: 'bay-reading',
    listening: 'bay-listening',
  },
  createPaths: {
    reading: '/admin/create-bay-reading',
    listening: '/admin/create-bay-listening',
  },
};
