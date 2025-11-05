// Temporary package-local flat ESLint config to unblock per-file linting while
// we iterate on migrating legacy `.eslintrc` JSON into a repo-wide flat config.
// This file is intentionally minimal and will be removed once the repo flat
// config is stable.

module.exports = {
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  // prevent ignores from hiding files during migration checks
  ignores: [],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: 'module',
          project: './tsconfig.json',
          tsconfigRootDir: __dirname
        },
        env: { node: true, browser: true }
      },
      plugins: ['@typescript-eslint'],
      rules: {
        // keep rules minimal during migration; enable more later
      }
    }
  ]
};
