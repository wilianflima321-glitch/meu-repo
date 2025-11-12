const path = require('path');
const { ESLint } = require('eslint');

(async function main() {
  try {
    const file = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'src', 'common', 'orchestrator-chat-agent.ts');
    console.log('Checking file:', file);

    // Try with no override (root flat config should be picked up)
    const eslintDefault = new ESLint({ cwd: path.resolve('.') });
    const ignoredDefault = await eslintDefault.isPathIgnored(file);
    console.log('isPathIgnored (default):', ignoredDefault);

    // Try explicitly pointing at package config
    const pkgConfigPath = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', '.eslintrc.js');
    console.log('Package config path exists?', require('fs').existsSync(pkgConfigPath));
  const eslintPkg = new ESLint({ cwd: path.resolve('.'), overrideConfigFile: pkgConfigPath });
  const ignoredPkg = await eslintPkg.isPathIgnored(file);
  console.log('isPathIgnored (package .eslintrc.js override):', ignoredPkg);

  // Try with ignore disabled to bypass ignore handling; useful to see resolved config
  const eslintPkgNoIgnore = new ESLint({ cwd: path.resolve('.'), overrideConfigFile: pkgConfigPath, ignore: false });
  const ignoredPkgNoIgnore = await eslintPkgNoIgnore.isPathIgnored(file).catch(() => false);
  console.log('isPathIgnored (override + ignore:false):', ignoredPkgNoIgnore);

    // Try to calculate resolved config for the file (may throw)
    try {
      const cfg = await eslintPkg.calculateConfigForFile(file);
      console.log('Resolved config keys:', Object.keys(cfg || {}));
      // Print some useful parts
      console.log('parser:', cfg.parser);
      console.log('parserOptions keys:', cfg.parserOptions ? Object.keys(cfg.parserOptions) : null);
      console.log('rules count:', cfg.rules ? Object.keys(cfg.rules).length : 0);
    } catch (e) {
      console.error('calculateConfigForFile error:', e && e.message ? e.message : e);
    }

    // Also attempt to run lintText to see if linting can be performed programmatically
      const content = require('fs').readFileSync(file, 'utf8');
      try {
        const results = await eslintPkgNoIgnore.lintText(content, { filePath: file });
        console.log('lintText (no-ignore) results length:', results.length);
        if (results && results[0] && results[0].messages) {
          console.log('messages length:', results[0].messages.length);
          console.log('first messages sample:', results[0].messages.slice(0, 10));
        }
      } catch (e) {
        console.error('lintText error:', e && e.message ? e.message : e);
      }

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exitCode = 2;
  }
})();
