module.exports = {
  rootDir: '.',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/playwright-report/',
    '/test-results/',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/)+(shared/)?utils/api$': '<rootDir>/test/apiMock.js',
    '^(\\.{1,2}/)+(shared/)?utils/testTiming$': '<rootDir>/test/testTimingMock.js',
    'ThemeContext$': '<rootDir>/test/themeContextMock.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/test/styleMock.js',
    '\\.(gif|ttf|eot|svg|png|jpe?g|webp)$': '<rootDir>/test/fileMock.js',
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  clearMocks: true,
};