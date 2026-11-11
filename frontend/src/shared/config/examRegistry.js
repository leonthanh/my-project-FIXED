import {
  DEFAULT_IX_SKILL,
  normalizeIxSkill,
} from '../../domains/ix/config/skills';
import {
  DEFAULT_GATEWAY_SKILL,
  normalizeGatewaySkill,
} from '../../domains/gateway/config/skills';
import {
  DEFAULT_ORANGE_SKILL,
  DEFAULT_ORANGE_TYPE,
  normalizeOrangeSkill,
  normalizeOrangeType,
} from '../../domains/cambridge/config/levels';
import {
  DEFAULT_GENERAL_SKILL,
  DEFAULT_GENERAL_TYPE,
  normalizeGeneralSkill,
} from '../../domains/general/config';

export const PREPARE_SKILLS = [
  { key: 'reading-writing', label: 'Reading & Writing', icon: 'reading' },
  { key: 'listening', label: 'Listening', icon: 'listening' },
];
export const DEFAULT_PREPARE_SKILL = 'reading-writing';

const normalizePrepareSkill = (skill) =>
  PREPARE_SKILLS.some((item) => item.key === String(skill || '').trim().toLowerCase())
    ? String(skill).trim().toLowerCase()
    : DEFAULT_PREPARE_SKILL;

export const PLATFORM_TABS = [
  { key: 'ix', label: 'IX', icon: 'tests', hint: 'Focused IELTS-style skills.' },
  { key: 'gateway', label: 'Gateway', icon: 'document', hint: 'Gateway to the World progress tests.' },
  { key: 'orange', label: 'Orange', icon: 'orange', hint: 'Cambridge levels grouped cleanly.' },
  { key: 'general', label: 'General', icon: 'tests', hint: 'Placement-style combined skills.' },
];

export function buildPlatformTabs(displayLabels = {}) {
  const generalDisplayName = String(displayLabels?.generalDisplayName || 'General').trim() || 'General';

  return [
    { key: 'ix', label: 'IX', icon: 'tests', hint: 'Focused IELTS-style skills.' },
    { key: 'gateway', label: 'Gateway', icon: 'document', hint: 'Gateway to the World progress tests.' },
    { key: 'orange', label: 'Orange', icon: 'orange', hint: 'Cambridge levels grouped cleanly.' },
    { key: 'general', label: generalDisplayName, icon: 'tests', hint: 'Placement-style combined skills.' },
  ];
}

export function normalizeSelectTestState({ platform, type, tab }) {
  const requestedPlatform = String(platform || '').trim().toLowerCase();
  const normalizedPlatform = requestedPlatform;

  if (normalizedPlatform === 'orange') {
    const orangeType = normalizeOrangeType(type);

    return {
      platform: 'orange',
      ixTab: DEFAULT_IX_SKILL,
      gatewayTab: DEFAULT_GATEWAY_SKILL,
      orangeType,
      orangeTab: normalizeOrangeSkill(orangeType, tab),
      generalTab: DEFAULT_GENERAL_SKILL,
    };
  }

  if (normalizedPlatform === 'general') {
    return {
      platform: 'general',
      ixTab: DEFAULT_IX_SKILL,
      gatewayTab: DEFAULT_GATEWAY_SKILL,
      orangeType: normalizeOrangeType(type),
      orangeTab: normalizeOrangeSkill(type, tab),
      generalTab: normalizeGeneralSkill(tab),
    };
  }

  if (normalizedPlatform === 'gateway') {
    return {
      platform: 'gateway',
      ixTab: DEFAULT_IX_SKILL,
      gatewayTab: normalizeGatewaySkill(tab),
      orangeType: normalizeOrangeType(type),
      orangeTab: normalizeOrangeSkill(type, tab),
      generalTab: DEFAULT_GENERAL_SKILL,
    };
  }

  if (normalizedPlatform === 'prepare') {
    return {
      platform: 'prepare',
      prepareTab: normalizePrepareSkill(tab),
    };
  }

  return {
    platform: 'ix',
    ixTab: normalizeIxSkill(tab),
    gatewayTab: DEFAULT_GATEWAY_SKILL,
    orangeType: normalizeOrangeType(type),
    orangeTab: normalizeOrangeSkill(type, tab),
    generalTab: DEFAULT_GENERAL_SKILL,
  };
}

export function parseSelectTestSearch(search = '') {
  const params = new URLSearchParams(search);

  return normalizeSelectTestState({
    platform: params.get('platform'),
    type: params.get('type'),
    tab: params.get('tab'),
  });
}

export function buildSelectTestPath({ platform = 'ix', type = DEFAULT_ORANGE_TYPE, tab } = {}) {
  const normalized = normalizeSelectTestState({ platform, type, tab });
  const params = new URLSearchParams();

  if (normalized.platform === 'orange') {
    params.set('platform', 'orange');
    params.set('type', normalized.orangeType);
    params.set('tab', normalized.orangeTab);
  } else if (normalized.platform === 'prepare') {
    params.set('platform', 'prepare');
    params.set('tab', normalized.prepareTab);
  } else if (normalized.platform === 'gateway') {
    params.set('platform', 'gateway');
    params.set('tab', normalized.gatewayTab);
  } else if (normalized.platform === 'general') {
    params.set('platform', 'general');
    params.set('type', DEFAULT_GENERAL_TYPE);
    params.set('tab', normalized.generalTab);
  } else {
    params.set('platform', 'ix');
    params.set('tab', normalized.ixTab);
  }

  return `/select-test?${params.toString()}`;
}

export const IX_HUB_PATH = buildSelectTestPath({
  platform: 'ix',
  tab: DEFAULT_IX_SKILL,
});

export const ORANGE_HUB_PATH = buildSelectTestPath({
  platform: 'orange',
  type: DEFAULT_ORANGE_TYPE,
  tab: DEFAULT_ORANGE_SKILL,
});

export const GENERAL_HUB_PATH = buildSelectTestPath({
  platform: 'general',
  type: DEFAULT_GENERAL_TYPE,
  tab: DEFAULT_GENERAL_SKILL,
});

export const GATEWAY_HUB_PATH = buildSelectTestPath({
  platform: 'gateway',
  tab: DEFAULT_GATEWAY_SKILL,
});