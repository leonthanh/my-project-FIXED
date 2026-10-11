export const DEFAULT_GATEWAY_SKILL = 'reading-writing';

export const GATEWAY_SKILLS = [
  {
    key: 'reading-writing',
    label: 'Reading-Writing',
    icon: 'reading',
    hint: 'Grammar, vocabulary, reading and writing in one test.',
  },
  {
    key: 'listening',
    label: 'Listening',
    icon: 'listening',
    hint: 'Audio-led progress test with objective scoring.',
  },
];

export const GATEWAY_SKILL_META = Object.fromEntries(
  GATEWAY_SKILLS.map(({ key, label, icon, hint }) => [key, { label, icon, hint }])
);

const GATEWAY_SKILL_SET = new Set(GATEWAY_SKILLS.map(({ key }) => key));

export function normalizeGatewaySkill(skill) {
  return GATEWAY_SKILL_SET.has(skill) ? skill : DEFAULT_GATEWAY_SKILL;
}
