import { glob } from 'glob';
import { spawnSync } from 'node:child_process';

const ignore = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/test-results/**',
  '**/playwright-report/**',
  '**/blob-report/**',
  '**/lib/**',
  '**/vendor/**'
];

const patterns = ['**/*.js', '**/*.cjs', '**/*.mjs'];

const files = (await glob(patterns, {
  ignore,
  nodir: true,
  dot: false,
  follow: false
}))
  // Normalize order for stable output
  .sort((a, b) => a.localeCompare(b));

let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failures += 1;
    // Node prints the parse error on stderr; forward it.
    process.stderr.write(`\n[syntax-scan] ${file}\n`);
    if (result.stderr) process.stderr.write(result.stderr);
    else if (result.stdout) process.stderr.write(result.stdout);
  }
}

if (failures > 0) {
  console.error(`\n[syntax-scan] ${failures} arquivo(s) com erro de sintaxe JS.`);
  process.exit(1);
}

console.log(`[syntax-scan] OK (${files.length} arquivos JS verificados).`);
