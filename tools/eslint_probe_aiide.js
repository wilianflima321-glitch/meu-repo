const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

(async function main() {
  try {
    const file = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'src', 'browser', 'frontend-module.ts');
    console.log('Checking file:', file);

    // Try legacy per-package config (.eslintrc.cjs)
    const legacyCfg = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', '.eslintrc.cjs');
    console.log('legacy cfg exists?', fs.existsSync(legacyCfg));
    const eslintLegacy = new ESLint({ cwd: path.resolve('.'), overrideConfigFile: legacyCfg });
    console.log('isPathIgnored (legacy):', await eslintLegacy.isPathIgnored(file));

    // Try package flat-config
    const pkgFlat = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'eslint.config.cjs');
    console.log('pkg flat cfg exists?', fs.existsSync(pkgFlat));
    const eslintPkgFlat = new ESLint({ cwd: path.resolve('.'), overrideConfigFile: pkgFlat, ignore: false });
    console.log('isPathIgnored (pkg flat + ignore:false):', await eslintPkgFlat.isPathIgnored(file).catch(() => false));

    // Try root flat config
    const rootFlat = path.resolve('eslint.config.cjs');
    console.log('root flat cfg exists?', fs.existsSync(rootFlat));
    const eslintRoot = new ESLint({ cwd: path.resolve('.') });
    console.log('isPathIgnored (default root):', await eslintRoot.isPathIgnored(file));

    // Try calculateConfigForFile for package flat
    try {
      const cfg = await eslintPkgFlat.calculateConfigForFile(file);
      console.log('pkgFlat.calculateConfigForFile parser:', cfg && cfg.parser);
    } catch (e) {
      console.error('pkgFlat.calculateConfigForFile error:', e && e.message ? e.message : e);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exitCode = 2;
  }
})();
