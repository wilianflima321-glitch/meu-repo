import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';

const roots = [
  'cloud-web-app/web/app/**/*.{tsx,jsx}',
  'cloud-web-app/web/components/**/*.{tsx,jsx}',
  'cloud-web-app/web/lib/**/*.{tsx,jsx}'
];

const ignore = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/test-results/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.bak',
];

const files = (await glob(roots, { ignore, nodir: true }))
  .sort((a, b) => a.localeCompare(b));

const regex = /<button(?![^>]*\btype=)[\s\S]*?>/g;

let total = 0;
const counts = new Map();

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const matches = content.match(regex);
  if (matches && matches.length) {
    const count = matches.length;
    total += count;
    counts.set(file, count);
  }
}

if (total === 0) {
  console.log('[button-types] OK (nenhum <button> sem type).');
  process.exit(0);
}

const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
console.error(`[button-types] FAIL total=${total}`);
console.error('[button-types] Top arquivos:');
for (const [file, count] of sorted.slice(0, 20)) {
  console.error(`  ${count} ${relative(process.cwd(), file)}`);
}
process.exit(1);
