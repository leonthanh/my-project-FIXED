export const MOVERS_LEVEL_META = {
  id: 'movers',
  name: 'Movers (A1)',
  shortLabel: 'Movers',
  iconName: 'movers',
  allowedSkills: ['listening', 'reading'],
  readingTestType: 'movers',
  testConfigIds: {
    listening: 'movers-listening',
    reading: 'movers',
  },
  createPaths: {
    listening: '/admin/create-movers-listening',
    reading: '/admin/create/movers',
  },
};