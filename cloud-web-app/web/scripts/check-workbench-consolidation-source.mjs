#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
const warnings = []

function full(relativePath) {
  return path.join(ROOT, relativePath)
}

function exists(relativePath) {
  return fs.existsSync(full(relativePath))
}

function read(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full(relativePath), 'utf8')
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'build', 'coverage', 'out', '.git'].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, predicate, out)
    else if (predicate(abs)) out.push(abs)
  }
  return out
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing ${reason}`)
}

function forbidFile(relativePath, reason) {
  if (exists(relativePath)) failures.push(`${relativePath}: ${reason}`)
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (content && !content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function rejectPattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && pattern.test(content)) failures.push(`${relativePath}: ${reason}`)
}

const canonicalFiles = [
  ['components/ide/FullscreenIDE.tsx', 'thin IDE route shell'],
  ['components/ide/modern-shell/ModernIDEShellCenterStack.tsx', 'canonical workbench shell'],
  ['components/agents/AgentsWindow.tsx', 'canonical agents window'],
  ['components/preview/CanonicalPreviewSurface.tsx', 'canonical preview deck'],
  ['components/preview/previewSurfaceRegistry.ts', 'canonical preview registry'],
  ['components/terminal/XTerminal.tsx', 'canonical terminal export surface'],
  ['components/terminal/MultiTerminalPanel.tsx', 'canonical IDE terminal panel'],
]

for (const [file, reason] of canonicalFiles) requireFile(file, reason)

const retiredFiles = [
  ['components/ide/AIAgentsPanelPro.tsx', 'legacy agents monolith must stay retired'],
  ['components/ide/AIViewportAssistant.tsx', 'viewport assist belongs inside canonical AI console/workbench modes'],
  ['components/ide/IDELayout.tsx', 'legacy IDE shell must stay retired'],
  ['components/LivePreview.tsx', 'legacy preview surface must stay retired'],
  ['components/MiniPreview.tsx', 'legacy preview surface must stay retired'],
  ['components/SimpleMini3DPreview.tsx', 'legacy preview surface must stay retired'],
  ['components/ide/PreviewViewport3D.tsx', 'fake/parallel 3D preview must stay retired'],
  ['components/ide/ProfessionalViewport3D.tsx', 'parallel 3D preview must stay retired'],
  ['components/ui/PremiumSkeleton.tsx', 'premium duplicate primitive must stay retired'],
  ['components/ui/PremiumEmptyState.tsx', 'premium duplicate primitive must stay retired'],
  ['lib/hooks/useTerminal.ts', 'legacy xterm hook must stay retired; use components/terminal/XTerminal'],
  ['components/terminal/IntegratedTerminal.tsx', 'legacy terminal wrapper must stay retired'],
  ['components/terminal/TerminalWidget.tsx', 'legacy terminal wrapper must stay retired'],
  ['components/TerminalPro.tsx', 'legacy terminal wrapper must stay retired'],
]

for (const [file, reason] of retiredFiles) forbidFile(file, reason)

requireToken(
  'components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  "import { MultiTerminalPanel } from '@/components/terminal/XTerminal'",
  'IDE workbench must consume the canonical terminal panel',
)
requireToken('components/terminal/XTerminal.tsx', "export { MultiTerminalPanel }", 'canonical terminal panel export')
rejectPattern(
  'lib/hooks/index.ts',
  /useTerminal/,
  'terminal hook must not be exported from the global hooks barrel; use the canonical terminal family',
)
rejectPattern(
  'lib/terminal/terminal-themes.ts',
  /@\/lib\/hooks\/useTerminal/,
  'terminal themes must not import the retired terminal hook type',
)
rejectPattern(
  'app/globals.css',
  /--(?:bg|color|text|border|brand)-[a-z0-9-]+\s*:/,
  'retired compatibility token aliases must not be reintroduced; use --aethel-*',
)

const sourceRoots = ['app', 'components', 'lib']
const sourceFiles = sourceRoots.flatMap((dir) =>
  walk(full(dir), (file) => /\.(ts|tsx)$/.test(file)).map((file) => path.relative(ROOT, file).replaceAll(path.sep, '/')),
)

const importRules = [
  {
    name: 'retired preview/IDE files',
    pattern:
      /from\s+['"][^'"]*(AIAgentsPanelPro|AIViewportAssistant|IDELayout|LivePreview|MiniPreview|SimpleMini3DPreview|PreviewViewport3D|ProfessionalViewport3D|PremiumSkeleton|PremiumEmptyState)['"]/,
  },
  {
    name: 'legacy terminal families outside the terminal lab',
    pattern: /from\s+['"][^'"]*(IntegratedTerminal|TerminalWidget|TerminalPro)['"]/,
  },
  {
    name: 'retired terminal hook',
    pattern: /from\s+['"]@\/lib\/hooks\/useTerminal['"]/,
  },
]

for (const file of sourceFiles) {
  const content = fs.readFileSync(full(file), 'utf8')
  for (const rule of importRules) {
    if (rule.allow?.has(file)) continue
    if (rule.pattern.test(content)) failures.push(`${file}: imports ${rule.name}`)
  }

  if (!file.endsWith('.css') && /var\(--(?:bg|color)-/.test(content)) {
    failures.push(`${file}: uses retired token namespace var(--bg-* / var(--color-*)`)
  }
}

const routeHints = ['app/contact-sales/page.tsx', 'app/compare/page.tsx', 'app/deploy/page.tsx']
const visibleRouteHints = routeHints.filter(exists)
const routeConsolidationRegistry = 'lib/navigation/public-route-consolidation.ts'
const routeConsolidationContent = exists(routeConsolidationRegistry) ? read(routeConsolidationRegistry) : ''
const unresolvedRouteHints = visibleRouteHints.filter((file) => {
  const route = file.replace(/^app/, '').replace(/\/page\.tsx$/, '') || '/'
  return !(
    routeConsolidationContent.includes(`route: '${route}'`) &&
    routeConsolidationContent.includes('preserveUrl: true') &&
    routeConsolidationContent.includes('canonicalSurface:')
  )
})
if (unresolvedRouteHints.length > 0) {
  warnings.push(`route consolidation still pending for: ${unresolvedRouteHints.join(', ')}`)
}

const reportDir = full('.next/aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'WORKBENCH_CONSOLIDATION_SOURCE_AUDIT.md'),
  `# Workbench Consolidation Source Audit

- Canonical files checked: ${canonicalFiles.length}
- Retired files checked: ${retiredFiles.length}
- Source files scanned: ${sourceFiles.length}
- Visible public route hints: ${visibleRouteHints.join(', ') || 'none'}
- Unresolved public route hints: ${unresolvedRouteHints.join(', ') || 'none'}
- Governed public route hints: ${visibleRouteHints.length - unresolvedRouteHints.length}/${visibleRouteHints.length}
- Failures: ${failures.length}
- Warnings: ${warnings.length}

This gate encodes the attached V25/V26 source of truth: one workbench shell,
one agents window, one preview deck, one canonical terminal export, and no
retired preview/IDE primitives reintroduced into product surfaces.
`,
)

if (failures.length > 0) {
  console.error('[workbench-consolidation-source] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  for (const warning of warnings) console.warn(`! ${warning}`)
  process.exit(1)
}

for (const warning of warnings) console.warn(`! ${warning}`)
console.log(`[workbench-consolidation-source] PASS files=${sourceFiles.length} warnings=${warnings.length}`)
