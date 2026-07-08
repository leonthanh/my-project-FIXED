export const DEFAULT_FCE_TYPE = 'placement';
export const DEFAULT_FCE_SKILL = 'reading';

export const FCE_SKILLS = [
  { key: 'reading', label: 'Reading & Writing', icon: 'reading', hint: 'Combined reading and writing tasks.' },
  { key: 'listening', label: 'Listening', icon: 'listening', hint: 'Audio-based questions.' },
];

export const FCE_SKILL_META = Object.fromEntries(
  FCE_SKILLS.map(({ key, label, icon, hint }) => [key, { label, icon, hint }])
);

const FCE_SKILL_SET = new Set(FCE_SKILLS.map(({ key }) => key));

export function normalizeFceSkill(skill) {
  return FCE_SKILL_SET.has(skill) ? skill : DEFAULT_FCE_SKILL;
}

export const FCE_LEVEL_META = {
  id: 'fce',
  name: 'FCE Placement',
  shortLabel: 'FCE',
  iconName: 'tests',
  allowedSkills: FCE_SKILLS.map(({ key }) => key),
  readingTestType: 'fce-reading',
  testConfigIds: {
    reading: 'fce-reading',
    listening: 'fce-listening',
  },
  createPaths: {
    reading: '/admin/create-fce-reading',
    listening: '/admin/create-fce-listening',
  },
};
