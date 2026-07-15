import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const checks = [
  {
    file: 'lib/editor/editor-scale-readiness.ts',
    tokens: [
      'EDITOR_SCALE_BUDGETS',
      'buildEditorScaleReadiness',
      "'world-outliner'",
      "'details-panel'",
      "'content-browser'",
      "'guarded'",
      "'watch'",
    ],
  },
  {
    file: 'components/editor/EditorScaleReadinessBadge.tsx',
    tokens: [
      'EditorScaleReadinessBadge',
      'aria-label',
      'ready',
      'watch',
      'guarded',
    ],
  },
  {
    file: 'components/engine/WorldOutliner.tsx',
    tokens: [
      'EditorScaleReadinessBadge',
      'buildEditorScaleReadiness',
      'totalObjectCount',
      'outlinerScaleReadiness',
      'useVirtualWindow',
    ],
  },
  {
    file: 'components/engine/DetailsPanel.tsx',
    tokens: [
      'EditorScaleReadinessBadge',
      'detailsPropertyCount',
      'detailsScaleReadiness',
      'buildEditorScaleReadiness',
    ],
  },
  {
    file: 'components/engine/EngineContentBrowser.tsx',
    tokens: [
      'EditorScaleReadinessBadge',
      'contentBrowserScaleReadiness',
      'assetVirtualRows',
      'buildEditorScaleReadiness',
    ],
  },
  {
    file: 'docs/EDITOR_SCALE_READINESS_V22.md',
    tokens: [
      'Editor Scale Readiness',
      'world-outliner',
      'details-panel',
      'content-browser',
      'guarded',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = path.join(ROOT, check.file);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${check.file}: missing`);
    continue;
  }

  const contents = fs.readFileSync(absolutePath, 'utf8');
  for (const token of check.tokens) {
    if (!contents.includes(token)) {
      failures.push(`${check.file}: missing token ${token}`);
    }
  }
}

const report = [
  '# Editor Scale Readiness Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Status: ${failures.length === 0 ? 'PASS' : 'FAIL'}`,
  '',
  'Protected surfaces:',
  '',
  '- `components/engine/WorldOutliner.tsx`',
  '- `components/engine/DetailsPanel.tsx`',
  '- `components/engine/EngineContentBrowser.tsx`',
  '',
  failures.length > 0 ? 'Failures:' : 'Failures: none',
  ...failures.map((failure) => `- ${failure}`),
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'docs/EDITOR_SCALE_READINESS_AUDIT.md'), report);

if (failures.length > 0) {
  console.error(report);
  process.exit(1);
}

console.log(report);
