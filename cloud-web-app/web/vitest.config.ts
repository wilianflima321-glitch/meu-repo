/**
 * Vitest Configuration
 *
 * Configures test environment with jsdom for DOM APIs.
 *
 * Round 81: enables a tight, focused coverage scope with progressive
 * thresholds. The scope covers freshly-extracted pure modules and UI
 * primitives whose tests are already green — the goal is to ratchet
 * coverage up each round without failing the current build.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**', // E2E tests use Playwright
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: 'reports/coverage',
      // Focused scope — expand as the test suite grows.
      include: [
        'components/ai-chat/**/*.{ts,tsx}',
        'components/ide/fullscreen/**/*.{ts,tsx}',
        'components/collaboration/**/*.{ts,tsx}',
        'components/ui/ThemeToggle.tsx',
        'components/ui/LanguageSwitcher.tsx',
        'hooks/useCollaborationAwareness.{ts,tsx}',
        'lib/a11y/**/*.{ts,tsx}',
        'lib/observability/logger.ts',
      ],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.stories.{ts,tsx}',
        '**/index.ts',
        '**/__tests__/**',
      ],
      // Progressive thresholds — ratchet up each round. Do NOT lower these numbers.
      thresholds: {
        statements: 10,
        branches: 8,
        functions: 10,
        lines: 10,
        // Per-file ratchets for modules already well-covered.
        'components/ai-chat/chat-utils.ts': {
          statements: 90,
          branches: 80,
          functions: 100,
          lines: 90,
        },
        'components/ide/fullscreen/workbench-helpers.ts': {
          statements: 85,
          branches: 70,
          functions: 100,
          lines: 85,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
