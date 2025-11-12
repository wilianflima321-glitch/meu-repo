const { devices } = require('@playwright/test');

module.exports = {
  testDir: 'examples/playwright/tests',
  testMatch: '*.spec.ts',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  
  // Use a webServer to automatically start the mock backend.
  // This is more reliable than running it as a separate background process.
  webServer: {
    command: 'npm run dev:mock-backend',
    url: 'http://localhost:8010',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  use: {
    // All requests from the 'request' fixture will be prefixed with this baseURL.
    baseURL: 'http://localhost:8010',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
};
