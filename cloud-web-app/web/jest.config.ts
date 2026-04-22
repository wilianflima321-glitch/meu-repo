/**
 * Jest Configuration - Aethel Engine Web App
 * 
 * Configuração otimizada para Next.js com cobertura de código.
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Path to Next.js app
  dir: './',
});

const config: Config = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  
  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
  },
  
  // Test patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/e2e/',
  ],
  
  // Transform ignore
  transformIgnorePatterns: [
    '/node_modules/(?!(three|@react-three|postprocessing)/)',
  ],
  
  // Coverage configuration — Round 81 enables coverage with progressive
  // thresholds so every PR nudges the codebase toward the 70% target without
  // failing the current green build. Ratchet these numbers up as new tests land.
  collectCoverage: process.env.CI === 'true' || process.env.COVERAGE === '1',
  coverageProvider: 'v8',
  coverageDirectory: 'reports/coverage',
  coverageReporters: ['text-summary', 'lcov', 'json-summary', 'html'],
  collectCoverageFrom: [
    // Focused, high-signal scope: pure helpers + extracted UI pieces.
    // Expand this list as the test suite grows.
    'components/ai-chat/**/*.{ts,tsx}',
    'components/ide/fullscreen/**/*.{ts,tsx}',
    'components/collaboration/**/*.{ts,tsx}',
    'components/ui/ThemeToggle.tsx',
    'components/ui/LanguageSwitcher.tsx',
    'lib/a11y/**/*.{ts,tsx}',
    'lib/observability/logger.ts',
    'lib/copilot/mention-parser.ts',
    // Exclusions:
    '!**/*.d.ts',
    '!**/*.stories.{ts,tsx}',
    '!**/index.ts',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    // Global floor — starts low (matches today's reality on the focused scope)
    // and ratchets up each round. Do NOT lower these numbers.
    global: {
      statements: 10,
      branches: 8,
      functions: 10,
      lines: 10,
    },
    // Per-file ratchets for modules we already cover well.
    './components/ai-chat/chat-utils.ts': {
      statements: 90,
      branches: 80,
      functions: 100,
      lines: 90,
    },
    './components/ide/fullscreen/workbench-helpers.ts': {
      statements: 85,
      branches: 70,
      functions: 100,
      lines: 85,
    },
  },

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/junit',
        outputName: 'jest-results.xml',
      },
    ],
  ],
  
  // Performance
  maxWorkers: '50%',
  
  // Verbose output in CI
  verbose: process.env.CI === 'true',
  
  // Fail fast in CI
  bail: process.env.CI === 'true' ? 1 : 0,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Globals
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};

export default createJestConfig(config);
