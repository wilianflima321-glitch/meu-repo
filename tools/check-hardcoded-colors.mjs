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

const colorNames = [
  'slate','zinc','gray','stone','neutral','red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','black','white'
];

const regex = new RegExp(`\\b(?:bg|text|border|from|to)-(?:${colorNames.join('|')})(?:-\\d{2,3})?(?:/\\d{1,3})?\\b`, 'g');

let total = 0;
const counts = new Map();

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const matches = content.match(regex);
  if (matches && matches.length) {
    total += matches.length;
    counts.set(file, matches.length);
  }
}

if (total === 0) {
  console.log('[hardcoded-colors] OK (nenhuma classe de cor hardcoded encontrada).');
  process.exit(0);
}

const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
console.error(`[hardcoded-colors] FAIL total=${total}`);
console.error('[hardcoded-colors] Top arquivos:');
for (const [file, count] of sorted.slice(0, 20)) {
  console.error(`  ${count} ${relative(process.cwd(), file)}`);
}
process.exit(1);
