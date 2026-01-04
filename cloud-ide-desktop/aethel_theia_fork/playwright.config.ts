import { defineConfig } from '@playwright/test';

// Config central para E2E/smoke no aethel_theia_fork.
// Mantém compatibilidade com os docs do pacote ai-ide (CI.md) e com scripts do root.
export default defineConfig({
  testDir: '.',
  testMatch: ['*.spec.ts', 'examples/playwright/tests/*.spec.ts'],
  testIgnore: ['**/node_modules/**', '**/lib/**'],
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright.json' }]
  ],
  use: {
    // Alguns testes fazem chamadas diretas a 127.0.0.1:8010; manter baseURL ajuda para
    // futuros testes de UI que usem page.goto('/') com baseURL.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8010'
  }
});
