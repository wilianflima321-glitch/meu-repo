const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

(async function main() {
  try {
    const pkgDir = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide');
    const file = path.resolve(pkgDir, 'src', 'browser', 'frontend-module.ts');
    console.log('Package dir:', pkgDir);
    console.log('Checking file:', file);

    // ESLint instances that run with cwd set to the package directory
    const legacyCfg = path.resolve(pkgDir, '.eslintrc.cjs');
    console.log('legacy cfg exists?', fs.existsSync(legacyCfg));
    const eslintLegacy = new ESLint({ cwd: pkgDir, overrideConfigFile: legacyCfg, ignore: false });
    console.log('isPathIgnored (legacy, cwd=pkg):', await eslintLegacy.isPathIgnored(file));

    const pkgFlat = path.resolve(pkgDir, 'eslint.config.cjs');
    console.log('pkg flat cfg exists?', fs.existsSync(pkgFlat));
    const eslintPkgFlat = new ESLint({ cwd: pkgDir, overrideConfigFile: pkgFlat, ignore: false });
    console.log('isPathIgnored (pkg flat + ignore:false, cwd=pkg):', await eslintPkgFlat.isPathIgnored(file));

    try {
      const cfg = await eslintPkgFlat.calculateConfigForFile(file);
      console.log('pkgFlat.calculateConfigForFile parser:', cfg && cfg.parser);
      console.log('pkgFlat.calculateConfigForFile languageOptions:', cfg && cfg.languageOptions);
    } catch (e) {
      console.error('pkgFlat.calculateConfigForFile error:', e && e.message ? e.message : e);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exitCode = 2;
  }
})();
