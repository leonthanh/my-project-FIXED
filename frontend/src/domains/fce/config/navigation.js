import { TEST_CONFIGS } from '../../../shared/config/questionTypes';
import {
  DEFAULT_FCE_SKILL,
  DEFAULT_FCE_TYPE,
  normalizeFceSkill,
  FCE_LEVEL_META,
} from '../fceConfig';

export function buildFceSelectTestPath({ type = DEFAULT_FCE_TYPE, tab = DEFAULT_FCE_SKILL } = {}) {
  const normalizedTab = normalizeFceSkill(tab);
  const params = new URLSearchParams({
    platform: 'fce',
    type,
    tab: normalizedTab,
  });

  return `/select-test?${params.toString()}`;
}

export function getFceCreatePath(skill) {
  const normalizedSkill = normalizeFceSkill(skill);
  return FCE_LEVEL_META.createPaths[normalizedSkill] || `/admin/create-fce-${normalizedSkill}`;
}

export function getFceStudentPath(skill, id) {
  const normalizedSkill = normalizeFceSkill(skill);
  return `/fce/${normalizedSkill}/${id}`;
}

export function getFceEditPath(skill, id) {
  const normalizedSkill = normalizeFceSkill(skill);
  if (normalizedSkill === 'listening') {
    return `/fce/listening/${id}/edit`;
  }
  return `/fce/reading/${id}/edit`;
}

export function getFceTestConfigId(skill) {
  const normalizedSkill = normalizeFceSkill(skill);
  return FCE_LEVEL_META.testConfigIds[normalizedSkill] || `fce-${normalizedSkill}`;
}

export function getFceTestConfig(skill) {
  const configId = getFceTestConfigId(skill);
  return TEST_CONFIGS[configId] || {};
}

export function matchesFceTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();
  return rawTestType === 'fce-reading' || rawTestType === 'fce-listening';
}

export function getFceHubStateForTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();

  if (rawTestType.endsWith('-listening')) {
    return { type: DEFAULT_FCE_TYPE, tab: 'listening' };
  }

  return { type: DEFAULT_FCE_TYPE, tab: 'reading' };
}

export function getFceSelectTestPathForTestType(testType) {
  const state = getFceHubStateForTestType(testType);
  return buildFceSelectTestPath({ type: state.type, tab: state.tab });
}
