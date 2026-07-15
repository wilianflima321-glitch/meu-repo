const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

async function lintFileWithGlobalOverride(filePath) {
  const pkgDir = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide');
  const absolute = path.resolve(filePath);
  const code = fs.readFileSync(absolute, 'utf8');

  // Global override config (no overrides) - intentionally minimal so it applies
  // to any file we feed it. We resolve the parser so ESLint can load it.
  const overrideConfig = {
    languageOptions: {
      parser: require.resolve('@typescript-eslint/parser'),
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' }
    },
    plugins: ['@typescript-eslint'],
    rules: {
      // minimal ruleset for surface linting; change if you need stricter checks
      'no-unused-vars': 'warn',
      'no-undef': 'warn'
    }
  };

  const eslint = new ESLint({ cwd: pkgDir, overrideConfig, ignore: false });
  try {
    const results = await eslint.lintText(code, { filePath: absolute });
    return results[0];
  } catch (e) {
    return { error: true, message: e && e.message ? e.message : String(e) };
  }
}

async function main() {
  const pkgSrc = path.resolve('cloud-ide-desktop', 'aethel_theia_fork', 'packages', 'ai-ide', 'src');
  const files = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const st = fs.statSync(fp);
      if (st.isDirectory()) walk(fp);
      else if (fp.endsWith('.ts') || fp.endsWith('.tsx')) files.push(fp);
    }
  }
  walk(pkgSrc);

  console.log('Found', files.length, 'TS/TSX files under ai-ide/src');
  const summary = { total: files.length, filesWithMessages: 0, totalMessages: 0, errors: [] };
  for (const f of files) {
    const res = await lintFileWithGlobalOverride(f);
    if (res && res.error) {
      summary.errors.push({ file: f, message: res.message });
      continue;
    }
    const msgs = res.messages || [];
    if (msgs.length) {
      summary.filesWithMessages++;
      summary.totalMessages += msgs.length;
      console.log('\n---', f, '---');
      for (const m of msgs.slice(0, 20)) {
        console.log(`${m.severity === 2 ? 'error' : 'warn'}: ${m.ruleId} @ ${m.line || '?'}:${m.column || '?'} - ${m.message}`);
      }
    }
  }

  console.log('\nSummary:', summary);
}

main().catch(e => { console.error(e); process.exit(2); });
