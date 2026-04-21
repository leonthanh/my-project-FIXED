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

export const PLATFORM_TABS = [
  { key: 'ix', label: 'IX', icon: 'tests', hint: 'Focused IELTS-style skills.' },
  { key: 'orange', label: 'Orange', icon: 'orange', hint: 'Cambridge levels grouped cleanly.' },
];

export function normalizeSelectTestState({ platform, type, tab }) {
  if (platform === 'orange') {
    const orangeType = normalizeOrangeType(type);

    return {
      platform: 'orange',
      ixTab: DEFAULT_IX_SKILL,
      orangeType,
      orangeTab: normalizeOrangeSkill(orangeType, tab),
    };
  }

  return {
    platform: 'ix',
    ixTab: normalizeIxSkill(tab),
    orangeType: normalizeOrangeType(type),
    orangeTab: normalizeOrangeSkill(type, tab),
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