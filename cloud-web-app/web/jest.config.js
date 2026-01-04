const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.(ts|tsx|js)',
    '<rootDir>/tests/integration/**/*.test.(ts|tsx)',
  ],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/tests/e2e/'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
};

module.exports = createJestConfig(customJestConfig);