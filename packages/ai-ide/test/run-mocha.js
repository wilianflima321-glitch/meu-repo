// Small runner to invoke the local mocha programmatically via the _mocha entry
// This avoids PowerShell quoting issues when passing globs.
const path = require('path');
const { spawn } = require('child_process');

const packageRoot = path.resolve(__dirname, '..');
const mochaBin = path.join(packageRoot, 'node_modules', 'mocha', 'bin', '_mocha');
const args = ['--config', './test/mocharc.local.yml', './lib/browser/**/*.spec.js', '--reporter', 'spec', '-t', '20000'];

const child = spawn(process.execPath, [mochaBin, ...args], {
  cwd: packageRoot,
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error('Mocha exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start mocha:', err);
  process.exit(1);
});
