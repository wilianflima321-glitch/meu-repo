// Legacy Playwright suite for root-level mock/backend specs.
// Canonical product E2E lives in `playwright.config.ts`.
const { devices } = require('@playwright/test');

module.exports = {
  testDir: '.',
  testMatch: ['*.spec.ts', 'examples/playwright/tests/*.spec.ts'],
  testIgnore: [
    '**/node_modules/**',
    '**/lib/**',
    // Subprojetos/forks possuem muitos *.spec.ts que nao sao Playwright E2E
    // (ex.: testes unitarios com decorators, chai/mocha, etc.).
    '**/cloud-ide-desktop/**',
    '**/cloud-admin-ia/**',
    '**/cloud-web-app/**',
    // Copia aninhada do repositorio (evita duplicar/rodar specs errados)
    '**/meu-repo/meu-repo/**'
  ],
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright.json' }]
  ],

  webServer: {
    command: 'npm run dev:mock-backend',
    url: 'http://localhost:8010',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  use: {
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
