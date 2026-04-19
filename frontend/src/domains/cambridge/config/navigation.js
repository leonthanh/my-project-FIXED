import { TEST_CONFIGS } from '../../../shared/config/questionTypes';
import {
  DEFAULT_ORANGE_SKILL,
  DEFAULT_ORANGE_TYPE,
  getOrangeLevelMeta,
  isOrangeType,
  normalizeOrangeSkill,
  normalizeOrangeType,
  ORANGE_BASE_READING_ROUTE_TYPES,
} from './levels';

export function buildOrangeSelectTestPath({ type = DEFAULT_ORANGE_TYPE, tab = DEFAULT_ORANGE_SKILL } = {}) {
  const normalizedType = normalizeOrangeType(type);
  const normalizedTab = normalizeOrangeSkill(normalizedType, tab);
  const params = new URLSearchParams({
    platform: 'orange',
    type: normalizedType,
    tab: normalizedTab,
  });

  return `/select-test?${params.toString()}`;
}

export function getOrangeCreatePath(type, skill) {
  const normalizedType = normalizeOrangeType(type);
  const normalizedSkill = skill === 'writing' ? 'writing' : normalizeOrangeSkill(normalizedType, skill);
  const meta = getOrangeLevelMeta(normalizedType);

  return meta.createPaths[normalizedSkill] || `/admin/create-${normalizedType}-${normalizedSkill}`;
}

export function getOrangeStudentPath(type, skill, id) {
  const normalizedType = normalizeOrangeType(type);
  const normalizedSkill = skill === 'writing' ? 'writing' : normalizeOrangeSkill(normalizedType, skill);

  if (normalizedSkill === 'writing') {
    return '/pet-writing';
  }

  return `/cambridge/${normalizedType}-${normalizedSkill}/${id}`;
}

export function getOrangeEditPath(type, skill, id) {
  const normalizedType = normalizeOrangeType(type);
  const normalizedSkill = skill === 'writing' ? 'writing' : normalizeOrangeSkill(normalizedType, skill);

  if (normalizedSkill === 'writing') {
    return `/admin/edit-pet-writing/${id}`;
  }

  if (normalizedSkill === 'reading' && ORANGE_BASE_READING_ROUTE_TYPES.has(normalizedType)) {
    return `/cambridge/${normalizedType}-reading/${id}/edit`;
  }

  if (normalizedSkill === 'listening') {
    return `/cambridge/listening/${id}/edit`;
  }

  return `/cambridge/reading/${id}/edit`;
}

export function getOrangeReadingApiTestType(type) {
  return getOrangeLevelMeta(type).readingTestType;
}

export function getOrangeTestConfigId(type, skill) {
  const normalizedType = normalizeOrangeType(type);
  const normalizedSkill = skill === 'writing' ? 'writing' : normalizeOrangeSkill(normalizedType, skill);
  const meta = getOrangeLevelMeta(normalizedType);

  return meta.testConfigIds[normalizedSkill] || `${normalizedType}-${normalizedSkill}`;
}

export function getOrangeTestConfig(type, skill) {
  const configId = getOrangeTestConfigId(type, skill);
  return TEST_CONFIGS[configId] || TEST_CONFIGS[normalizeOrangeType(type)] || {};
}

export function matchesOrangeTestType(selectedType, testType) {
  const normalizedType = normalizeOrangeType(selectedType);
  const rawTestType = String(testType || '').toLowerCase();

  if (rawTestType === 'pet-writing') {
    return normalizedType === 'pet';
  }

  return rawTestType === normalizedType || rawTestType.startsWith(`${normalizedType}-`);
}

export function getOrangeHubStateForTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();

  if (rawTestType === 'pet-writing') {
    return { type: 'pet', tab: 'writing' };
  }

  if (rawTestType.endsWith('-listening')) {
    return {
      type: normalizeOrangeType(rawTestType.replace(/-listening$/, '')),
      tab: 'listening',
    };
  }

  if (rawTestType.endsWith('-reading')) {
    return {
      type: normalizeOrangeType(rawTestType.replace(/-reading$/, '')),
      tab: 'reading',
    };
  }

  if (isOrangeType(rawTestType)) {
    return { type: rawTestType, tab: 'reading' };
  }

  return { type: DEFAULT_ORANGE_TYPE, tab: DEFAULT_ORANGE_SKILL };
}

export function getOrangeSelectTestPathForTestType(testType) {
  const state = getOrangeHubStateForTestType(testType);
  return buildOrangeSelectTestPath({ type: state.type, tab: state.tab });
}