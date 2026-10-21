import { TEST_CONFIGS } from '../../../shared/config/questionTypes';
import {
  DEFAULT_GENERAL_SKILL,
  DEFAULT_GENERAL_TYPE,
  normalizeGeneralSkill,
  GENERAL_LEVEL_META,
} from '../generalConfig';

export function buildGeneralSelectTestPath({ type = DEFAULT_GENERAL_TYPE, tab = DEFAULT_GENERAL_SKILL } = {}) {
  const normalizedTab = normalizeGeneralSkill(tab);
  const params = new URLSearchParams({
    platform: 'general',
    type,
    tab: normalizedTab,
  });

  return `/select-test?${params.toString()}`;
}

export function getGeneralCreatePath(skill) {
  const normalizedSkill = normalizeGeneralSkill(skill);
  return GENERAL_LEVEL_META.createPaths[normalizedSkill] || `/admin/create-general-${normalizedSkill}`;
}

export function getGeneralStudentPath(skill, id) {
  const normalizedSkill = normalizeGeneralSkill(skill);
  return `/general/${normalizedSkill}/${id}`;
}

export function getGeneralEditPath(skill, id) {
  const normalizedSkill = normalizeGeneralSkill(skill);
  if (normalizedSkill === 'listening') {
    return `/general/listening/${id}/edit`;
  }
  return `/general/reading/${id}/edit`;
}

export function getGeneralTestConfigId(skill) {
  const normalizedSkill = normalizeGeneralSkill(skill);
  return GENERAL_LEVEL_META.testConfigIds[normalizedSkill] || `general-${normalizedSkill}`;
}

export function getGeneralTestConfig(skill) {
  const configId = getGeneralTestConfigId(skill);
  return TEST_CONFIGS[configId] || {};
}

export function matchesGeneralTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();
  return [
    'general-reading',
    'general-reading-60',
    'general-listening',
  ].includes(rawTestType);
}

export function getGeneralHubStateForTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();

  if (rawTestType.endsWith('-listening')) {
    return { type: DEFAULT_GENERAL_TYPE, tab: 'listening' };
  }

  return { type: DEFAULT_GENERAL_TYPE, tab: 'reading' };
}

export function getGeneralSelectTestPathForTestType(testType) {
  const state = getGeneralHubStateForTestType(testType);
  return buildGeneralSelectTestPath({ type: state.type, tab: state.tab });
}
