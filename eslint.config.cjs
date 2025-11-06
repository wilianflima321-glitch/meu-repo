// Temporary minimal flat ESLint config to restore per-file lint runs.
// This file is intentionally small and conservative. It can be removed
// or replaced with a full migrated config once we complete the cleanup.

const path = require('path');

// Conservative flat-config shim that imports legacy Theia JSON configs and
// exposes a minimal TypeScript override so ESLint flat-config mode can lint
// TypeScript files in-place. This is intentionally conservative: it tries to
// reuse existing rule sets but does not attempt to be a perfect migration.

function loadJsonIfExists(p) {
  try {
    return require(p);
  } catch (e) {
    return undefined;
  }
}

// Paths to legacy configs inside the Theia fork. If the files are missing,
// the loader will fall back to an empty stub so linting still runs.
const theiaConfigsBase = path.resolve(__dirname, 'cloud-ide-desktop', 'aethel_theia_fork', 'configs');
const baseCfg = loadJsonIfExists(path.join(theiaConfigsBase, 'base.eslintrc.json')) || {};
const errorsCfg = loadJsonIfExists(path.join(theiaConfigsBase, 'errors.eslintrc.json')) || {};
const buildCfg = loadJsonIfExists(path.join(theiaConfigsBase, 'build.eslintrc.json')) || {};
const rootCfg = loadJsonIfExists(path.join(theiaConfigsBase, '.eslintrc.json')) || {};

// Merge rules conservatively: errorsCfg rules override baseCfg where present.
const mergedRules = Object.assign({}, baseCfg.rules || {}, errorsCfg.rules || {}, buildCfg.rules || {});
const mergedPlugins = Array.from(new Set([...(baseCfg.plugins || []), ...(errorsCfg.plugins || [])]));

module.exports = {
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignores: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/playwright-report/**'],
  // Provide a TypeScript override that closely mirrors the legacy config so
  // ESLint has a usable configuration when running in flat-config mode.
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      // Use the theia project's parser if available; fall back to the package
      // name so ESLint can resolve it from node_modules when installed.
      languageOptions: {
        parser: baseCfg.parser || '@typescript-eslint/parser',
        parserOptions: Object.assign({}, baseCfg.parserOptions || {}, buildCfg.parserOptions || {}),
        ecmaFeatures: (baseCfg.parserOptions && baseCfg.parserOptions.ecmaFeatures) || undefined,
        globals: baseCfg.globals || undefined,
        env: Object.assign({}, baseCfg.env || {}, rootCfg.env || {})
      },
      plugins: mergedPlugins,
      rules: mergedRules
    }
  ]
};
