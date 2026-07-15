const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

(async function main() {
  try {
    const pkgDir = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide');
    const file = path.resolve(pkgDir, 'src', 'browser', 'frontend-module.ts');
    const configPath = path.resolve(pkgDir, '.eslintrc.cjs');
    console.log('Running direct lint with baseConfig from', configPath);

    // Build a minimal overrideConfig programmatically to ensure a matching
    // configuration is available for the package files. This avoids loading
    // other repo-level configs that may interfere during migration.
    const overrideConfig = {
      languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
      ignores: [],
      overrides: [
        {
          files: ['src/**/*.ts', 'src/**/*.tsx'],
          languageOptions: {
            parser: require.resolve('@typescript-eslint/parser'),
            parserOptions: { ecmaVersion: 2020, sourceType: 'module', project: './tsconfig.json' }
          },
          plugins: ['@typescript-eslint'],
          rules: {}
        }
      ]
    };

    const eslint = new ESLint({ cwd: pkgDir, overrideConfig, ignore: false });

    const code = fs.readFileSync(file, 'utf8');
    const results = await eslint.lintText(code, { filePath: file });
    console.log('results length:', results.length);
    if (results && results[0] && results[0].messages) {
      console.log('messages:', results[0].messages.slice(0, 20));
    }
  } catch (e) {
    console.error('error running direct lint:', e && e.message ? e.message : e);
    process.exitCode = 2;
  }
})();
