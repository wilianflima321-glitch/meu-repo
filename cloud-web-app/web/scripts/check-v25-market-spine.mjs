#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requireTokenAcross(relativePaths, token, reason = token) {
  const content = relativePaths.map((relativePath) => read(relativePath)).join('\n')
  if (!content.includes(token)) failures.push(`${relativePaths.join(' + ')}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

function parseVersion(value) {
  return String(value ?? '')
    .replace(/^[^\d]*/, '')
    .split('.')
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0)
}

function isAtLeast(actual, minimum) {
  const a = parseVersion(actual)
  const b = parseVersion(minimum)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return true
    if (a[index] < b[index]) return false
  }
  return true
}

function listFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'build', 'coverage', 'out', '.git'].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) listFiles(abs, predicate, out)
    else if (predicate(abs)) out.push(abs)
  }
  return out
}

const pkg = JSON.parse(read('package.json') || '{}')
const lock = JSON.parse(read('package-lock.json') || '{}')
const manifestNext = pkg.dependencies?.next
const lockedNext = lock.packages?.['node_modules/next']?.version
const rootLockNext = lock.packages?.['']?.dependencies?.next

if (!isAtLeast(manifestNext, '14.2.35')) failures.push(`package.json: next ${manifestNext} must be >=14.2.35`)
if (!isAtLeast(rootLockNext, '14.2.35')) failures.push(`package-lock.json root: next ${rootLockNext} must be >=14.2.35`)
if (!isAtLeast(lockedNext, '14.2.35')) failures.push(`package-lock.json node_modules/next: ${lockedNext} must be >=14.2.35`)
if (!String(pkg.scripts?.['build:production'] ?? '').includes('next build')) {
  failures.push('package.json: missing build:production script for start-compatible production validation')
}
if (String(pkg.scripts?.['build:production'] ?? '').includes('--experimental-build-mode compile')) {
  failures.push('package.json: build:production must not use compile-only build mode')
}

requireToken('app/layout.tsx', 'CoreUiProviders', 'root CoreUiProviders wiring')
requireToken('app/layout.tsx', 'lang="en"', 'default English document language')
requirePattern('next.config.js', /reactStrictMode:\s*true/, 'react strict mode')
requirePattern('next.config.js', /poweredByHeader:\s*false/, 'poweredByHeader disabled')
requireToken('middleware.ts', 'RATE_LIMIT_BACKEND_UNAVAILABLE', 'production rate-limit backend failure must be explicit')
requireToken('middleware.ts', 'canUseLocalRateLimitFallback', 'local authenticated QA rate-limit fallback')

requirePattern(
  'components/ide/modern-shell/ModernIDEShellPanels.tsx',
  /EditorErrorBoundary[\s\S]*PanelErrorBoundary[\s\S]*safeSlots/,
  'IDE region boundaries'
)
requireToken('components/preview/previewSurfaceRegistry.ts', 'PREVIEW_SURFACE_REGISTRY', 'canonical preview registry')
requireToken('components/preview/previewSurfaceRegistry.ts', 'hiddenActions', 'preview actions must stay behind contextual drawers/toolbars')
requireToken('components/preview/previewSurfaceRegistry.ts', "'apply-proposal'", 'preview proposal action must be governed by registry')
requireToken('components/preview/CanonicalPreviewSurface.tsx', 'data-canonical-preview-surface="runtime"', 'runtime preview marker')
requireToken('components/preview/CanonicalPreviewSurface.tsx', 'data-canonical-preview-surface="scene"', 'scene preview marker')
requireToken('components/nexus/AethelResearch.tsx', 'data-research-workspace="manus-grade"', 'research workspace evidence marker')
requireToken('components/nexus/AethelResearch.tsx', 'live browser replay, account navigation, and artifact persistence stay held', 'research no-fake-success copy')
requireToken('lib/product/workspace-blueprint.ts', 'WorkspaceBlueprint', 'Firebase-like workspace blueprint contract')
requireToken('lib/product/workspace-blueprint.ts', 'PreviewAnnotation', 'preview annotation contract')
requireToken('lib/product/workspace-blueprint.ts', 'AgentEvidenceReceipt', 'agent evidence receipt contract')
requireToken('lib/product/workspace-blueprint.ts', 'ContextPackBudget', 'context budget contract')
requireToken('components/dashboard/dashboard-launch-handoff.ts', 'buildWorkspaceBlueprint', 'dashboard launch blueprint handoff')
requireToken('components/dashboard/DashboardWorkspaceLaunch.tsx', 'data-firebase-like-journey', 'dashboard Firebase-like journey marker')
requireToken('app/api/workspace/blueprint/route.ts', 'buildWorkspaceBlueprint', 'workspace blueprint API route')
requireToken('package.json', 'qa:product-screenshot-evidence', 'public proof screenshot regression gate')
requireToken('app/landing-v3.tsx', '/product-proof/studio-home.png', 'landing must use real captured product proof')
if (!exists('public/product-proof/studio-home.png')) {
  failures.push('public/product-proof/studio-home.png: missing real product proof screenshot')
}
const researchSurface = read('components/nexus/AethelResearch.tsx')
if (/window\.setTimeout|Collecting sources|Scoring credibility/.test(researchSurface)) {
  failures.push('components/nexus/AethelResearch.tsx: research surface must not simulate live browsing or fake progress')
}

const studioRoutes = read('app/studio/creative-studio-routes.ts')
const studioGroupIds = [...studioRoutes.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1])
const requiredStudioGroups = ['world', 'character', 'fx', 'film', 'logic']
if (studioGroupIds.length !== requiredStudioGroups.length) {
  failures.push(`app/studio/creative-studio-routes.ts: expected 5 groups, found ${studioGroupIds.length}`)
}
for (const group of requiredStudioGroups) {
  if (!studioGroupIds.includes(group)) failures.push(`app/studio/creative-studio-routes.ts: missing group ${group}`)
}

const adminRegistry = read('lib/admin/admin-consolidation.ts')
const adminSectionCount = (adminRegistry.match(/id:\s*'/g) || []).length
if (adminSectionCount !== 6) failures.push(`lib/admin/admin-consolidation.ts: expected 6 sections, found ${adminSectionCount}`)
const adminShellFiles = [
  'app/admin/admin-ops-layout-client.tsx',
  'app/admin/admin-ops-layout.parts.tsx',
  'app/admin/admin-ops-layout.sidebar.tsx',
  'app/admin/admin-ops-layout.header.tsx',
  'app/admin/admin-ops-layout.model.tsx',
]
requireTokenAcross(adminShellFiles, 'Legacy map', 'admin legacy route drawer')
requireTokenAcross(adminShellFiles, 'Global Legacy compatibility map', 'admin global compatibility drawer')

if (exists('docs/PREVIEW_SURFACE_CANONICAL_AUDIT.md')) {
  failures.push('docs/PREVIEW_SURFACE_CANONICAL_AUDIT.md: generated preview audit must stay out of docs budget')
}

const bundleAudit = read('docs/BUNDLE_BOUNDARIES_AUDIT.md')
const bundleCounts = Object.fromEntries(
  [...bundleAudit.matchAll(/- (\w+): (\d+) \((?:max|min) (\d+)\)/g)].map((match) => [
    match[1],
    { count: Number(match[2]), budget: Number(match[3]) },
  ]),
)
for (const key of ['threeDirect', 'monacoEditorDirect', 'monacoReactDirect', 'framerMotionDirect']) {
  const entry = bundleCounts[key]
  if (!entry) failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: missing ${key}`)
  else if (entry.count > entry.budget) failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: ${key} ${entry.count} exceeds ${entry.budget}`)
}
if ((bundleCounts.dynamicImportsMin?.count ?? 0) < (bundleCounts.dynamicImportsMin?.budget ?? 100)) {
  failures.push('docs/BUNDLE_BOUNDARIES_AUDIT.md: dynamic import budget below target')
}

const sourceFiles = listFiles(ROOT, (file) => /\.(ts|tsx)$/.test(file))
const largeFiles = sourceFiles
  .map((file) => ({ file: path.relative(ROOT, file).replaceAll(path.sep, '/'), lines: fs.readFileSync(file, 'utf8').split(/\r?\n/).length }))
  .filter((item) => item.lines > 800)
  .sort((a, b) => b.lines - a.lines)
const maxLines = largeFiles[0]?.lines ?? 0
if (maxLines > 993) failures.push(`large-file ratchet: max file ${maxLines} exceeds 993`)

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V25_MARKET_SPINE_AUDIT.md'),
  `# V25 Market Spine Audit

- Next manifest: ${manifestNext}
- Next locked: ${lockedNext}
- Studio groups: ${studioGroupIds.join(', ')}
- Admin sections: ${adminSectionCount}
- Bundle counts: ${Object.entries(bundleCounts).map(([key, value]) => `${key}=${value.count}/${value.budget}`).join(', ')}
- Large files over 800: ${largeFiles.length}
- Max file lines: ${maxLines}
- Failures: ${failures.length}

## Top Large Files
${largeFiles.slice(0, 15).map((item) => `- ${item.file}: ${item.lines}`).join('\n')}
`,
)

if (failures.length > 0) {
  console.error('[v25-market-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v25-market-spine] PASS next=${lockedNext} studioGroups=5 adminSections=6 maxLines=${maxLines}`)
