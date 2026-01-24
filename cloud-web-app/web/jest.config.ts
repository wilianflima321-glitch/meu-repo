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
  
  // Ignore patterns - também ignora testes que usam Vitest
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/', // Todo tests/ usa Vitest
    '<rootDir>/lib/test/',
    '<rootDir>/__tests__/', // Todo __tests__ usa Vitest
    '<rootDir>/lib/engine/', // Usa Vitest
  ],
  
  // Transform ignore
  transformIgnorePatterns: [
    '/node_modules/(?!(three|@react-three|postprocessing)/)',
  ],
  
  // Coverage configuration (desabilitado para estabilidade local)
  collectCoverage: false,
  
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
