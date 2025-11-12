const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

(async function main() {
  try {
    const file = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'src', 'common', 'orchestrator-chat-agent.ts');
    console.log('Checking file:', file);

    const pkgCfg = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'eslint.config.cjs');
    console.log('Package flat config exists?', fs.existsSync(pkgCfg));

    const eslintPkg = new ESLint({ cwd: path.resolve('.'), overrideConfigFile: pkgCfg, ignore: false });
    const ignored = await eslintPkg.isPathIgnored(file).catch(() => false);
    console.log('isPathIgnored (override flat config + ignore:false):', ignored);

    try {
      const cfg = await eslintPkg.calculateConfigForFile(file);
      console.log('Resolved config keys:', Object.keys(cfg || {}));
      console.log('parser:', cfg.parser);
      console.log('parserOptions keys:', cfg.parserOptions ? Object.keys(cfg.parserOptions) : null);
      console.log('rules count:', cfg.rules ? Object.keys(cfg.rules).length : 0);
    } catch (e) {
      console.error('calculateConfigForFile error:', e && e.message ? e.message : e);
    }

    const content = fs.readFileSync(file, 'utf8');
    try {
      const results = await eslintPkg.lintText(content, { filePath: file });
      console.log('lintText (pkg flat cfg + ignore:false) results length:', results.length);
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
