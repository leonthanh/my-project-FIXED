// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  webServer: {
    // Start both backend and frontend so tests can hit real submit endpoint
    command: 'node ./scripts/start-with-backend.js',
    port: 3000,
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  }
});