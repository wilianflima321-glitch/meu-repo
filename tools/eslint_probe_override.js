const path = require('path');
const { ESLint } = require('eslint');

(async function main() {
  const pkgDir = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide');
  const file = path.resolve(pkgDir, 'src', 'browser', 'frontend-module.ts');
  console.log('cwd:', pkgDir);
  console.log('file:', file);

  const overrideConfig = {
    languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
    ignores: [],
    overrides: [
      {
        files: ['**/*.ts', '**/*.tsx', 'src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
          parser: require.resolve('@typescript-eslint/parser'),
          parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
        },
        rules: {}
      }
    ]
  };

  const eslint = new ESLint({ cwd: pkgDir, overrideConfig, ignore: false });
  try {
    const cfg = await eslint.calculateConfigForFile(file);
    console.log('calculated config parser:', cfg && cfg.parser);
    console.log('calculated config keys:', cfg && Object.keys(cfg));
  } catch (e) {
    console.error('calculateConfigForFile error:', e && e.message ? e.message : e);
  }

  const isIgnored = await eslint.isPathIgnored(file);
  console.log('isPathIgnored:', isIgnored);
})();
