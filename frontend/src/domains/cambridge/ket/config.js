export const KET_LEVEL_META = {
  id: 'ket',
  name: 'KET (A2 Key)',
  shortLabel: 'KET',
  iconName: 'orange',
  allowedSkills: ['listening', 'reading'],
  readingTestType: 'ket-reading',
  testConfigIds: {
    listening: 'ket-listening',
    reading: 'ket-reading',
  },
  createPaths: {
    listening: '/admin/create-ket-listening',
    reading: '/admin/create-ket-reading',
  },
};