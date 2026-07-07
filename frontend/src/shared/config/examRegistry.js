import {
  DEFAULT_IX_SKILL,
  normalizeIxSkill,
} from '../../domains/ix/config/skills';
import {
  DEFAULT_ORANGE_SKILL,
  DEFAULT_ORANGE_TYPE,
  normalizeOrangeSkill,
  normalizeOrangeType,
} from '../../domains/cambridge/config/levels';
import {
  DEFAULT_FCE_SKILL,
  DEFAULT_FCE_TYPE,
  normalizeFceSkill,
} from '../../domains/fce/config';

export const PLATFORM_TABS = [
  { key: 'ix', label: 'IX', icon: 'tests', hint: 'Focused IELTS-style skills.' },
  { key: 'orange', label: 'Orange', icon: 'orange', hint: 'Cambridge levels grouped cleanly.' },
  { key: 'fce', label: 'FCE', icon: 'tests', hint: 'Placement-style combined skills.' },
];

export function normalizeSelectTestState({ platform, type, tab }) {
  if (platform === 'orange') {
    const orangeType = normalizeOrangeType(type);

    return {
      platform: 'orange',
      ixTab: DEFAULT_IX_SKILL,
      orangeType,
      orangeTab: normalizeOrangeSkill(orangeType, tab),
      fceTab: DEFAULT_FCE_SKILL,
    };
  }

  if (platform === 'fce') {
    return {
      platform: 'fce',
      ixTab: DEFAULT_IX_SKILL,
      orangeType: normalizeOrangeType(type),
      orangeTab: normalizeOrangeSkill(type, tab),
      fceTab: normalizeFceSkill(tab),
    };
  }

  return {
    platform: 'ix',
    ixTab: normalizeIxSkill(tab),
    orangeType: normalizeOrangeType(type),
    orangeTab: normalizeOrangeSkill(type, tab),
    fceTab: DEFAULT_FCE_SKILL,
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
  } else if (normalized.platform === 'fce') {
    params.set('platform', 'fce');
    params.set('type', DEFAULT_FCE_TYPE);
    params.set('tab', normalized.fceTab);
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

export const FCE_HUB_PATH = buildSelectTestPath({
  platform: 'fce',
  type: DEFAULT_FCE_TYPE,
  tab: DEFAULT_FCE_SKILL,
});