import { FLYERS_LEVEL_META } from '../flyers/config';
import { KET_LEVEL_META } from '../ket/config';
import { MOVERS_LEVEL_META } from '../movers/config';
import { PET_LEVEL_META } from '../pet/config';
import { STARTERS_LEVEL_META } from '../starters/config';

export const DEFAULT_ORANGE_TYPE = 'ket';
export const DEFAULT_ORANGE_SKILL = 'listening';

export const ORANGE_LEVELS = [
  KET_LEVEL_META,
  PET_LEVEL_META,
  FLYERS_LEVEL_META,
  MOVERS_LEVEL_META,
  STARTERS_LEVEL_META,
];

const ORANGE_LEVEL_MAP = Object.fromEntries(ORANGE_LEVELS.map((level) => [level.id, level]));

export const ORANGE_TYPES = ORANGE_LEVELS.map(({ id }) => id);
export const ORANGE_BASE_READING_ROUTE_TYPES = new Set(['flyers', 'movers', 'starters']);

export function isOrangeType(type) {
  return Boolean(ORANGE_LEVEL_MAP[type]);
}

export function normalizeOrangeType(type) {
  return isOrangeType(type) ? type : DEFAULT_ORANGE_TYPE;
}

export function getOrangeLevelMeta(type) {
  return ORANGE_LEVEL_MAP[normalizeOrangeType(type)];
}

export function getOrangeAllowedSkills(type) {
  return getOrangeLevelMeta(type).allowedSkills;
}

export function normalizeOrangeSkill(type, skill) {
  const normalizedType = normalizeOrangeType(type);
  const allowedSkills = getOrangeAllowedSkills(normalizedType);
  return allowedSkills.includes(skill) ? skill : allowedSkills[0] || DEFAULT_ORANGE_SKILL;
}