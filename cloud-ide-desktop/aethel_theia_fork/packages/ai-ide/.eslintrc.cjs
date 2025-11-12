const path = require('path');

// Temporary legacy package ESLint config to ensure CLI linting can run
// during the migration from legacy `.eslintrc` to flat-config. This is
// intentionally conservative and should be removed once flat-config is
// stable across the repo.

module.exports = {
  root: true,
  // Resolve parser explicitly so ESLint finds it even in nested contexts
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    // Do NOT set `project` here - keep non-type-aware linting so it runs
    // without requiring the full monorepo project graph.
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  env: {
    node: true,
    browser: true,
    es6: true
  },
  ignorePatterns: [],
  plugins: ['@typescript-eslint'],
  rules: {
    // Minimal helpful rules during migration; enable more later.
    'no-unused-vars': 'warn',
    'no-undef': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }]
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: require.resolve('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      rules: {}
    }
  ]
};
