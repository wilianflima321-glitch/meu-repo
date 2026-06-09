#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

const routeBudgets = {
  pages: 58,
  adminPagesIncludingHub: 7,
  adminSubroutes: 6,
  studioPagesIncludingHub: 6,
  studioSubroutes: 5,
  filesOver500: 218,
  filesOver800: 0,
}

const allowedAdminPages = new Set([
  'app/admin/page.tsx',
  'app/admin/ai/page.tsx',
  'app/admin/feature-flags/page.tsx',
  'app/admin/finance/page.tsx',
  'app/admin/monitoring/page.tsx',
  'app/admin/security/page.tsx',
  'app/admin/users/page.tsx',
])

const allowedStudioPages = new Set([
  'app/studio/page.tsx',
  'app/studio/animation/page.tsx',
  'app/studio/film/page.tsx',
  'app/studio/level/page.tsx',
  'app/studio/quest/page.tsx',
  'app/studio/vfx/page.tsx',
])

const allowedShells = new Set([
  'app/profile/profile-shell.tsx',
  'app/studio/CreativeStudioShell.tsx',
  'components/dashboard/DashboardShell.tsx',
  'components/editor/MonacoEditorPro.shell.tsx',
  'components/ide/ModernIDEShell.tsx',
  'components/preview/ViewportWorkbenchShell.tsx',
  'components/product/SurfaceQualityShell.tsx',
  'components/studio/CreativeWorkbenchShell.tsx',
])

const forbiddenLegacyEntrypoints = [
  'components/ide/IDELayout.tsx',
  'components/AethelDashboard.tsx',
  'components/AethelDashboardGateway.tsx',
  'components/LivePreview.tsx',
  'components/NexusCanvas.tsx',
  'components/NotificationCenter.tsx',
  'components/NotificationSystem.tsx',
  'components/PreviewPanel.tsx',
]

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walk(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, predicate, results)
    } else if (predicate(full)) {
      results.push(toPosix(path.relative(ROOT, full)))
    }
  }
  return results
}

const pages = walk(path.join(ROOT, 'app'), (full) => path.basename(full) === 'page.tsx')
const adminPages = pages.filter((file) => file.startsWith('app/admin/'))
const studioPages = pages.filter((file) => file.startsWith('app/studio/'))
const shellFiles = walk(ROOT, (full) => /(?:Shell|shell)\.tsx$/.test(path.basename(full)))
const sourceFiles = walk(ROOT, (full) => /\.(?:ts|tsx)$/.test(full))

const filesOver500 = sourceFiles.filter((file) => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
  return content.split(/\r?\n/).length > 500
})
const filesOver800 = filesOver500.filter((file) => {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
  return content.split(/\r?\n/).length > 800
})

const measured = {
  pages: pages.length,
  adminPagesIncludingHub: adminPages.length,
  adminSubroutes: adminPages.filter((file) => file !== 'app/admin/page.tsx').length,
  studioPagesIncludingHub: studioPages.length,
  studioSubroutes: studioPages.filter((file) => file !== 'app/studio/page.tsx').length,
  filesOver500: filesOver500.length,
  filesOver800: filesOver800.length,
}

for (const [key, budget] of Object.entries(routeBudgets)) {
  if (measured[key] > budget) failures.push(`${key}: ${measured[key]} exceeds V30 budget ${budget}`)
}

for (const file of adminPages) {
  if (!allowedAdminPages.has(file)) failures.push(`${file}: new admin page must go through RFC and drawer/anchor consolidation`)
}

for (const file of studioPages) {
  if (!allowedStudioPages.has(file)) failures.push(`${file}: new studio page must go through one of the five groups`)
}

for (const file of shellFiles) {
  if (!allowedShells.has(file)) failures.push(`${file}: new shell/chrome entrypoint fragments the product spine`)
}

for (const file of forbiddenLegacyEntrypoints) {
  if (fs.existsSync(path.join(ROOT, file))) failures.push(`${file}: forbidden legacy entrypoint is present`)
}

const routeRegistry = fs.readFileSync(path.join(ROOT, 'lib/routes/product-surface-registry.ts'), 'utf8')
for (const token of ['visibleDashboardTabs: 3', 'visibleStudioGroups: 5', 'maxAdminPhysicalRoutes: 6']) {
  if (!routeRegistry.includes(token)) failures.push(`lib/routes/product-surface-registry.ts: missing ${token}`)
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_NO_NEW_FRAGMENTATION.md'),
  [
    '# V30 No New Fragmentation',
    '',
    `Pages: ${measured.pages}/${routeBudgets.pages}`,
    `Admin pages including hub: ${measured.adminPagesIncludingHub}/${routeBudgets.adminPagesIncludingHub}`,
    `Studio pages including hub: ${measured.studioPagesIncludingHub}/${routeBudgets.studioPagesIncludingHub}`,
    `Shell allowlist: ${shellFiles.length}`,
    `Files >500 LOC: ${measured.filesOver500}/${routeBudgets.filesOver500}`,
    `Files >800 LOC: ${measured.filesOver800}/${routeBudgets.filesOver800}`,
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-no-new-fragmentation] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v30-no-new-fragmentation] PASS pages=${measured.pages} admin=${measured.adminSubroutes} studio=${measured.studioSubroutes} shells=${shellFiles.length}`)
