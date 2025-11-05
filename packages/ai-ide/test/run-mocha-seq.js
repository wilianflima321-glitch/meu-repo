// Run each spec file sequentially in its own process to collect pass/fail per-file.
// This avoids a single import-time crash from stopping the entire run and gives
// clearer per-file diagnostics for iterative fixes.
const path = require('path');
const glob = require('glob');
const { spawn } = require('child_process');

const packageRoot = path.resolve(__dirname, '..');
const mochaBin = path.join(packageRoot, 'node_modules', 'mocha', 'bin', '_mocha');
const pattern = './lib/browser/**/*.spec.js';

const files = glob.sync(pattern, { cwd: packageRoot, nodir: true });
if (!files.length) {
  console.error('No spec files found for pattern', pattern);
  process.exit(1);
}

(async () => {
  let passed = 0;
  let failed = 0;
  for (const file of files) {
    console.log('\n==== Running', file, '====');
    const args = ['--config', './test/mocharc.local.yml', file, '--reporter', 'spec', '-t', '20000'];
    const code = await runMocha(args);
    if (code === 0) {
      passed++;
    } else {
      failed++;
    }
  }
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${files.length} total`);
  process.exit(failed === 0 ? 0 : 2);
})();

function runMocha(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [mochaBin, ...args], {
      cwd: packageRoot,
      stdio: 'inherit'
    });
    child.on('exit', (code) => resolve(code));
    child.on('error', (err) => {
      console.error('Failed to run mocha for', args[args.length-1], err);
      resolve(1);
    });
  });
}
