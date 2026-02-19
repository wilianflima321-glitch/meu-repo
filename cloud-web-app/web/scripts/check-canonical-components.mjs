import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const EXTENSIONS = new Set(['.ts', '.tsx']);

const bannedSuffixes = [
  { suffix: '/CommandPalette', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/CommandPalettePro', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/CommandPaletteUnified', replacement: '@/components/ide/CommandPalette' },
  { suffix: '/statusbar/StatusBar', replacement: 'IDELayout status bar slot' },
  { suffix: '/statusbar/StatusBarPro', replacement: 'IDELayout status bar slot' },
  { suffix: '/engine/ContentBrowser', replacement: '@/components/assets/ContentBrowser' },
  { suffix: '/debug/DebugPanel', replacement: '@/components/ide/DebugPanel' },
  { suffix: '/dashboard/JobQueueDashboard', replacement: 'admin queue pages or canonical queue widgets' },
  { suffix: '/admin/JobQueueDashboard', replacement: 'admin queue pages or canonical queue widgets' },
  { suffix: '/dashboard/SecurityDashboard', replacement: 'admin security pages or canonical security widgets' },
  { suffix: '/admin/SecurityDashboard', replacement: 'admin security pages or canonical security widgets' },
  { suffix: '/vcs/TimeMachineSlider', replacement: '@/components/collaboration/TimeMachineSlider' },
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

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!match) return;

    const importPath = match[1];
    const fileRel = rel(file);
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

if (violations.length > 0) {
  console.error('[canonical-components] banned imports found:');
  for (const issue of violations) {
    console.error(`- ${issue.file}:${issue.line} -> ${issue.source}`);
    console.error(`  replacement: ${issue.replacement}`);
  }
  process.exit(1);
}

console.log('[canonical-components] PASS');
