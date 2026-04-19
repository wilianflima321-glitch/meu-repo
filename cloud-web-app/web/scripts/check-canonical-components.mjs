import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx']);
const COMPONENT_EXTENSIONS = new Set(['.tsx']);

const bannedSuffixes = [
  { suffix: '/CommandPalette', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/CommandPalettePro', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/CommandPaletteUnified', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/statusbar/StatusBar', replacement: 'ModernIDEShell / FullscreenIDE status surface' },
  { suffix: '/statusbar/StatusBarPro', replacement: 'ModernIDEShell / FullscreenIDE status surface' },
];

const skipSegments = new Set(['node_modules', '.next', 'dist', 'build']);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipSegments.has(entry.name)) continue;
      walk(abs, out);
      continue;
    }
    if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const violations = [];
const duplicateComponentNames = new Map();

for (const file of files) {
  const fileRel = rel(file);
  if (fileRel.startsWith('components/')) {
    const ext = path.extname(file);
    const base = path.basename(file);
    if (COMPONENT_EXTENSIONS.has(ext) && base.toLowerCase() !== 'index.tsx') {
      const bucket = duplicateComponentNames.get(base) ?? [];
      bucket.push(fileRel);
      duplicateComponentNames.set(base, bucket);
    }
  }

  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) return;

    const importPath = match[1];
    if (importPath.includes('/ide/CommandPalette')) return;
    if (fileRel.startsWith('components/ide/') && importPath === './CommandPalette') return;

    for (const rule of bannedSuffixes) {
      if (importPath.endsWith(rule.suffix) || importPath === rule.suffix.replace(/^\//, '')) {
        violations.push({
          file: rel(file),
          line: index + 1,
          source: line.trim(),
          replacement: rule.replacement,
        });
      }
    }
  });
}

const duplicateEntries = [...duplicateComponentNames.entries()]
  .filter(([, paths]) => paths.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

if (duplicateEntries.length > 0) {
  console.error('[canonical-components] duplicate component filenames found:');
  for (const [name, paths] of duplicateEntries) {
    console.error(`- ${name}`);
    for (const componentPath of paths) {
      console.error(`  - ${componentPath}`);
    }
  }
  process.exit(1);
}

if (violations.length > 0) {
  console.error('[canonical-components] banned imports found:');
  for (const issue of violations) {
    console.error(`- ${issue.file}:${issue.line} -> ${issue.source}`);
    console.error(`  replacement: ${issue.replacement}`);
  }
  process.exit(1);
}

console.log('[canonical-components] PASS');
