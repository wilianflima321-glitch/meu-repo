#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (content && !content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const contract = read('lib/runtime/v29-internal-spine.ts')
const productRegistry = read('lib/routes/product-surface-registry.ts')
const publicConsolidation = read('lib/navigation/public-route-consolidation.ts')
const workbenchConvergence = read('lib/routes/workbench-convergence.ts')
const middleware = read('middleware.ts')

for (const token of [
  'V29ProductSurfaceConvergence',
  'V29_PRODUCT_SURFACE_CONVERGENCE',
  'PRODUCT_SURFACE_REGISTRY',
  'public-route-consolidation',
  'workbench-convergence',
  'redirect-or-drawer-only',
]) {
  if (!contract.includes(token)) failures.push(`lib/runtime/v29-internal-spine.ts: missing ${token}`)
}

const requiredSurfaces = ['home', 'workspace', 'ide', 'canvas', 'research', 'evidence']
for (const surface of requiredSurfaces) {
  requirePattern('lib/routes/product-surface-registry.ts', new RegExp(`id:\\s*'${surface}'`), `surface ${surface}`)
  if (!contract.includes(`'${surface}'`)) failures.push(`lib/runtime/v29-internal-spine.ts: missing required surface ${surface}`)
}

for (const token of ['primaryAction', 'evidence', 'detailPolicy', 'heavyRuntimePolicy', 'hiddenLegacyRoutes']) {
  requireToken('lib/routes/product-surface-registry.ts', token, `surface field ${token}`)
}

requirePattern('lib/routes/product-surface-registry.ts', /visibleDashboardTabs:\s*3/, 'dashboard primary tab budget')
requirePattern('lib/routes/product-surface-registry.ts', /visibleStudioGroups:\s*5/, 'studio group budget')
requirePattern('lib/routes/product-surface-registry.ts', /maxAdminPhysicalRoutes:\s*12/, 'admin route ratchet')

const publicCompatibilityRoutes = [
  ['/contact', '/help'],
  ['/customers', '/trust'],
  ['/roadmap', '/docs/changelog'],
  ['/security-acknowledgments', '/security-policy'],
]

for (const [route, target] of publicCompatibilityRoutes) {
  if (!productRegistry.includes(route)) failures.push(`product registry must mark ${route} as hidden legacy`)
  const consolidationRoutePattern = new RegExp(`route:\\s*'${route.replace('/', '\\/')}'[\\s\\S]*canonicalSurface:\\s*'${target.replace('/', '\\/')}'[\\s\\S]*preserveUrl:\\s*false`)
  if (!consolidationRoutePattern.test(publicConsolidation)) failures.push(`public consolidation missing ${route} -> ${target}`)
  const middlewarePattern = new RegExp(`'${route.replace('/', '\\/')}':\\s*'${target.replace('/', '\\/')}'`)
  if (!middlewarePattern.test(middleware)) failures.push(`middleware missing ${route} -> ${target}`)
  const physicalRoute = `app/${route.slice(1)}/page.tsx`
  if (exists(physicalRoute)) failures.push(`${physicalRoute}: compatibility route must not be a standalone page`)
}

const workbenchLegacyRoutes = [
  ['/chat', 'entry=chat'],
  ['/project-settings', 'tab=editor'],
  ['/ai-command', 'entry=ai-command'],
  ['/editor-hub', '/ide'],
  ['/explorer', 'entry=explorer'],
  ['/git', 'entry=git'],
  ['/search', 'entry=search'],
  ['/terminal', 'entry=terminal'],
  ['/testing', 'entry=testing'],
  ['/preview', 'entry=preview'],
  ['/live-preview', 'entry=preview'],
  ['/vr-preview', 'ASPIRATIONAL_LAB_EXACT_PATHS'],
]

for (const [route, targetToken] of workbenchLegacyRoutes) {
  if (!productRegistry.includes(route)) failures.push(`product registry must include hidden route ${route}`)
  if (!workbenchConvergence.includes(route) || !workbenchConvergence.includes(targetToken)) {
    failures.push(`workbench convergence missing ${route} -> ${targetToken}`)
  }
  const physicalRoute = `app/${route.slice(1)}/page.tsx`
  if (exists(physicalRoute)) failures.push(`${physicalRoute}: hidden workbench route must not be a standalone page`)
}

const publicNav = read('lib/navigation/surfaces.ts')
if ((publicNav.match(/PUBLIC_NAV_LINKS/g)?.length ?? 0) < 1) failures.push('public navigation registry missing')
for (const forbidden of ['/contact', '/customers', '/roadmap', '/security-acknowledgments']) {
  if (new RegExp(`href:\\s*'${forbidden.replace('/', '\\/')}'`).test(publicNav)) {
    failures.push(`public nav must not expose compatibility route ${forbidden}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts?.['qa:v29-route-surface-convergence']) failures.push('package.json: missing qa:v29-route-surface-convergence')
const totalSpineGate = read('scripts/check-v29-total-spine.mjs')
if (!totalSpineGate.includes('check-v29-route-surface-convergence.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include route surface convergence')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_ROUTE_SURFACE_CONVERGENCE.md'), `# V29 Route Surface Convergence\n\nSurfaces: ${requiredSurfaces.join(', ')}\nCompatibility routes: ${publicCompatibilityRoutes.map(([route, target]) => `${route} -> ${target}`).join(', ')}\nFailures: ${failures.length}\n`)

if (failures.length) {
  console.error('[v29-route-surface-convergence] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v29-route-surface-convergence] PASS surfaces=${requiredSurfaces.length} publicCompatibility=${publicCompatibilityRoutes.length}`)
