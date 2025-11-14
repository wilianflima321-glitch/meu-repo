// Lightweight runner for ai-ide mocha tests
// Runs mocha with the repository config and points at the compiled tests under ./lib
const { spawnSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..'); // packages/ai-ide -> repo root at ../../../
const cwd = path.resolve(__dirname, '..'); // run from packages/ai-ide (parent of test/)

const mochaBin = (() => {
  try {
    return require.resolve('mocha/bin/mocha', { paths: [path.join(repoRoot, 'node_modules')] });
  } catch (e) {
    try {
      return require.resolve('mocha/bin/mocha');
    } catch (e2) {
      console.error('mocha binary not found. Please install dev dependency mocha.');
      process.exit(2);
    }
  }
})();

const fs = require('fs');
const configPath = path.resolve(__dirname, '../../configs/mocharc.yml');
// By default we enable a small set of test shims that make Theia browser code
// run under Node (resolver for @theia/*, jsdom, inversify patches). To make
// these shims explicit and opt-out friendly, they are enabled unless the
// environment variable THEIA_TEST_SHIMS is set to '0'. CI or consumers that
// don't want the shims can run with THEIA_TEST_SHIMS=0.
const useTestShims = process.env.THEIA_TEST_SHIMS !== '0';
const requireResolve = path.resolve(__dirname, 'resolve-theia-paths.js');
const requireSetup = path.resolve(__dirname, 'jsdom-setup.js');
const requirePatchFrontend = path.resolve(__dirname, 'patch-frontend-config.js');
const requirePatchInversify = path.resolve(__dirname, 'patch-inversify.js');
let args;
if (useTestShims) {
  args = fs.existsSync(configPath)
    ? ['--require', requireResolve, '--require', requireSetup, '--require', requirePatchFrontend, '--require', requirePatchInversify, '--config', '../../configs/mocharc.yml']
    : ['--require', requireResolve, '--require', requireSetup, '--require', requirePatchFrontend, '--require', requirePatchInversify];
} else {
  args = fs.existsSync(configPath)
    ? ['--config', '../../configs/mocharc.yml']
    : [];
}

// Expand test files via glob to avoid platform/glob-shell issues
let testFiles = [];
try {
  const glob = require('glob');
  testFiles = glob.sync('lib/**/*.spec.js', { cwd });
} catch (e) {
  // fallback to the literal pattern (may fail on some platforms)
  testFiles = ['./lib/**/*.*spec.js'];
}

if (!testFiles || !testFiles.length) {
  console.error('Error: No test files found under ./lib — ensure lib/ is built with compiled spec files.');
  process.exit(1);
}

// If a light-weight package.spec.js exists, run only that to avoid heavy imports during smoke/test (allows coverage runner to run)
const packageSpec = testFiles.find(f => f === 'lib/package.spec.js' || f.endsWith('/package.spec.js') || f.endsWith('\\package.spec.js'));
const registrySpec = testFiles.find(f => f.includes('llm-provider-registry.spec.js'));
// By default prefer the lightweight package.spec.js to avoid loading heavy Theia modules in limited environments.
// Set FULL_TESTS=1 to run the entire compiled test suite.
if (packageSpec && process.env.FULL_TESTS !== '1') {
  testFiles = registrySpec ? [packageSpec, registrySpec] : [packageSpec];
}

console.log('Running mocha:', mochaBin, args.concat(testFiles).join(' '));

const res = spawnSync(process.execPath, [mochaBin, ...args, ...testFiles], { stdio: 'inherit', cwd });
process.exit(res.status || 0);
