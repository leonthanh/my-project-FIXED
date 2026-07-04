import { TEST_CONFIGS } from '../../../shared/config/questionTypes';
import {
  DEFAULT_BAY_SKILL,
  DEFAULT_BAY_TYPE,
  normalizeBaySkill,
  BAY_LEVEL_META,
} from '../config';

export function buildBaySelectTestPath({ type = DEFAULT_BAY_TYPE, tab = DEFAULT_BAY_SKILL } = {}) {
  const normalizedTab = normalizeBaySkill(tab);
  const params = new URLSearchParams({
    platform: 'bay',
    type,
    tab: normalizedTab,
  });

  return `/select-test?${params.toString()}`;
}

export function getBayCreatePath(skill) {
  const normalizedSkill = normalizeBaySkill(skill);
  return BAY_LEVEL_META.createPaths[normalizedSkill] || `/admin/create-bay-${normalizedSkill}`;
}

export function getBayStudentPath(skill, id) {
  const normalizedSkill = normalizeBaySkill(skill);
  return `/bay/${normalizedSkill}/${id}`;
}

export function getBayEditPath(skill, id) {
  const normalizedSkill = normalizeBaySkill(skill);
  if (normalizedSkill === 'listening') {
    return `/bay/listening/${id}/edit`;
  }
  return `/bay/reading/${id}/edit`;
}

export function getBayTestConfigId(skill) {
  const normalizedSkill = normalizeBaySkill(skill);
  return BAY_LEVEL_META.testConfigIds[normalizedSkill] || `bay-${normalizedSkill}`;
}

export function getBayTestConfig(skill) {
  const configId = getBayTestConfigId(skill);
  return TEST_CONFIGS[configId] || {};
}

export function matchesBayTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();
  return rawTestType === 'bay-reading' || rawTestType === 'bay-listening';
}

export function getBayHubStateForTestType(testType) {
  const rawTestType = String(testType || '').toLowerCase();

  if (rawTestType.endsWith('-listening')) {
    return { type: DEFAULT_BAY_TYPE, tab: 'listening' };
  }

  return { type: DEFAULT_BAY_TYPE, tab: 'reading' };
}

export function getBaySelectTestPathForTestType(testType) {
  const state = getBayHubStateForTestType(testType);
  return buildBaySelectTestPath({ type: state.type, tab: state.tab });
}
