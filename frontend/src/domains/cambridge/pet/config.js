export const PET_LEVEL_META = {
  id: 'pet',
  name: 'PET (B1 Preliminary)',
  shortLabel: 'PET',
  iconName: 'pet',
  allowedSkills: ['listening', 'reading', 'writing'],
  readingTestType: 'pet-reading',
  testConfigIds: {
    listening: 'pet-listening',
    reading: 'pet-reading',
    writing: 'pet-writing',
  },
  createPaths: {
    listening: '/admin/create-pet-listening',
    reading: '/admin/create-pet-reading',
    writing: '/admin/create-pet-writing',
  },
};