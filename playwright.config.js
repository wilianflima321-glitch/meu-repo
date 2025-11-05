module.exports = {
  // Run tests under tools/llm-mock/playwright where the test scaffold lives
  testDir: 'tools/llm-mock/playwright',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', headless: true }
    }
  ]
};
