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

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

function forbidPattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (pattern.test(content)) failures.push(`${relativePath}: forbidden ${reason}`)
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

const productRegistry = read('lib/routes/product-surface-registry.ts')
const requiredSurfaces = ['home', 'workspace', 'ide', 'canvas', 'research', 'evidence']
for (const surface of requiredSurfaces) {
  if (!productRegistry.includes(`id: '${surface}'`)) {
    failures.push(`lib/routes/product-surface-registry.ts: missing product surface ${surface}`)
  }
}
requireToken('lib/routes/product-surface-registry.ts', 'PRODUCT_SURFACE_REGISTRY', 'canonical product surface registry')
requireToken('lib/routes/product-surface-registry.ts', 'V28_NAVIGATION_RATCHETS', 'V28 navigation ratchets')
requireToken('lib/routes/product-surface-registry.ts', 'resolveProductSurfaceForPath', 'surface path resolver')
requireToken('lib/navigation/workspace-navigation.ts', 'WORKSPACE_NAVIGATION_LANES', 'workspace navigation lanes')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'code'", 'workspace code lane')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'canvas'", 'workspace canvas lane')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'timeline'", 'workspace timeline lane')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'library'", 'workspace library lane')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'agents'", 'workspace agents lane')
requireToken('lib/navigation/workspace-navigation.ts', "id: 'share'", 'workspace share lane')
requirePattern('lib/routes/workbench-convergence.ts', /'\/preview':\s*'\/ide\?entry=preview'/, 'legacy preview route must converge into the IDE preview pane')
requirePattern('lib/routes/product-surface-registry.ts', /visibleDashboardTabs:\s*3/, 'dashboard 3-tab ratchet')
requirePattern('lib/routes/product-surface-registry.ts', /visibleStudioGroups:\s*5/, 'studio 5-group ratchet')
requirePattern('lib/routes/product-surface-registry.ts', /maxAdminPhysicalRoutes:\s*23/, 'admin physical route ratchet')

requirePattern('components/dashboard/aethel-dashboard-model.ts', /MISSION_CONTROL_TABS\s*=\s*\['overview',\s*'projects',\s*'activity'\]/, 'dashboard must expose only three primary tabs')
requireToken('components/dashboard/AethelDashboardSidebar.tsx', 'data-dashboard-primary-tabs="3"', 'dashboard visible tab marker')

requireToken('app/studio/creative-studio-routes.ts', "id: 'world'", 'World studio group')
requireToken('app/studio/creative-studio-routes.ts', "id: 'character'", 'Character studio group')
requireToken('app/studio/creative-studio-routes.ts', "id: 'fx'", 'FX studio group')
requireToken('app/studio/creative-studio-routes.ts', "id: 'film'", 'Film studio group')
requireToken('app/studio/creative-studio-routes.ts', "id: 'logic'", 'Logic studio group')
requirePattern('app/studio/page.tsx', /groupCreativeStudioRoutes|CREATIVE_STUDIO_GROUPS/, 'Studio hub must render grouped studio model')

requireToken('lib/admin/admin-consolidation.ts', 'ADMIN_CONSOLIDATED_SECTIONS', 'admin section registry')
requirePattern('lib/admin/admin-consolidation.ts', /id:\s*'people'[\s\S]*id:\s*'money'[\s\S]*id:\s*'ai'[\s\S]*id:\s*'platform'[\s\S]*id:\s*'trust'[\s\S]*id:\s*'product'/, 'six canonical admin sections')
requireToken('app/admin/admin-ops-layout.sidebar.tsx', 'Compatibility routes', 'admin legacy route drawer')
requireToken('components/admin/AdminCommandCenterSections.tsx', 'data-privacy="masked"', 'admin privacy masking')

requireToken('components/preview/previewSurfaceRegistry.ts', 'PREVIEW_SURFACE_REGISTRY', 'preview registry')
requireToken('components/preview/previewSurfaceRegistry.ts', "'apply-proposal'", 'proposal action behind preview registry')
requireToken('components/canvas/UnifiedViewport.tsx', 'UNIFIED_VIEWPORT_SURFACES', 'unified viewport contract')
requireToken('components/canvas/UnifiedViewport.tsx', "id: 'scene'", 'unified scene surface')
requireToken('components/canvas/UnifiedViewport.tsx', "id: 'character'", 'unified character surface')
requireToken('components/canvas/UnifiedViewport.tsx', "id: 'material'", 'unified material surface')
requireToken('components/canvas/UnifiedViewport.tsx', "id: 'cinematic'", 'unified cinematic surface')
requireToken('components/canvas/UnifiedViewport.tsx', "id: 'audio'", 'unified audio surface')
requireToken('components/canvas/UnifiedViewport.tsx', 'SceneViewportSurface = dynamic', 'scene viewport must be dynamically loaded by unified viewport')
requireToken('components/canvas/UnifiedViewport.tsx', 'CanvasViewportSurface = dynamic', 'canvas viewport must be dynamically loaded by unified viewport')
requireToken('components/preview/CanonicalPreviewSurface.tsx', 'UnifiedViewport', 'canonical preview must delegate to UnifiedViewport')
requireToken('components/viewport/AethelViewport3D.tsx', 'data-aethel-viewport3d', 'viewport product marker')
requireToken('lib/three/index.ts', 'loadThree', 'central lazy Three loader')
requireToken('lib/three/index.ts', 'loadReactThreeFiber', 'central lazy R3F loader')
requireToken('lib/three/index.ts', 'loadReactThreeDrei', 'central lazy Drei loader')

requireToken('lib/product/workspace-blueprint.ts', 'WorkspaceBlueprint', 'workspace blueprint contract')
requireToken('lib/product/workspace-blueprint.ts', 'PreviewAnnotation', 'preview annotation contract')
requireToken('lib/product/workspace-blueprint.ts', 'AgentEvidenceReceipt', 'agent evidence receipt contract')
requireToken('lib/product/workspace-blueprint.ts', 'AssetQualityLedger', 'asset quality ledger contract')
requireToken('lib/product/v28-runtime-contracts.ts', 'SequencerTrack', 'sequencer contract')
requireToken('lib/product/v28-runtime-contracts.ts', 'ExportJob', 'export job contract')
requireToken('lib/product/v28-runtime-contracts.ts', 'HumanApprovalGate', 'human approval gate')
requireToken('lib/product/v28-runtime-contracts.ts', 'V28_FORBIDDEN_UNEVIDENCED_CLAIMS', 'no-fake-claim contract')
requireToken('components/timeline/CanonicalSequencer.tsx', 'data-canonical-sequencer', 'canonical sequencer surface')
requireToken('lib/export/export-pipeline-spine.ts', 'buildExportPipelinePlan', 'export pipeline spine')
requireToken('lib/export/export-pipeline-spine.ts', 'Browser preview cannot claim final video/GPU export quality.', 'final export browser guard')
requireToken('lib/agents/agent-runtime-spine.ts', 'buildAgentRuntimeSpinePlan', 'agent runtime spine planner')
requireToken('lib/agents/agent-runtime-spine.ts', "'browser-replay'", 'browser replay capability')
requireToken('lib/agents/agent-runtime-spine.ts', "'code-sandbox'", 'sandbox capability')
requireToken('lib/agents/agent-runtime-spine.ts', "'approval-gate'", 'approval gate capability')
requireToken('lib/research/research-runtime-spine.ts', 'buildResearchRuntimeSpinePlan', 'research runtime spine planner')
requireToken('lib/research/research-runtime-spine.ts', "'browser-replay'", 'research browser replay lane')
requireToken('lib/research/research-runtime-spine.ts', "'artifacts'", 'research artifact lane')
requireToken('components/nexus/AethelResearch.tsx', 'researchRuntimeSpine', 'research UI consumes runtime spine')

forbidPattern('public/branding/aethel-mark.svg', /linearGradient|radialGradient|filter id=|url\(#/, 'decorative gradients or SVG filters in primary mark')
forbidPattern('public/branding/aethel-wordmark.svg', /linearGradient|radialGradient|url\(#/, 'decorative gradients in wordmark')
requireToken('app/globals.css', '--aethel-brand-pure-black', 'monochrome brand token')
requireToken('app/globals.css', '--aethel-brand-paper', 'paper brand token')

const publicFirstFoldFiles = [
  'app/landing-v3.tsx',
  'app/pricing/_components/PricingHero.tsx',
  'app/marketplace/marketplace-page.parts.tsx',
  'app/download/page.tsx',
  'app/contact-sales/contact-sales-content.tsx',
  'app/compare/page.tsx',
  'app/help/_components/HelpPageClient.tsx',
]
const forbiddenPublicCopy = /\b(capabilityStatus|Cloud held|missionLedger)\b|(?:^|[^-])\bcockpit\b/i
for (const file of publicFirstFoldFiles) {
  forbidPattern(file, forbiddenPublicCopy, 'internal jargon in public first-fold source')
}

const routePages = listFiles(path.join(ROOT, 'app'), (file) => {
  if (!file.endsWith(`${path.sep}page.tsx`)) return false
  const rel = path.relative(path.join(ROOT, 'app'), file).replaceAll(path.sep, '/')
  return !rel.startsWith('api/')
})
const adminPages = routePages.filter((file) => file.includes(`${path.sep}app${path.sep}admin${path.sep}`) && !file.endsWith(`${path.sep}app${path.sep}admin${path.sep}page.tsx`))
const studioPages = routePages.filter((file) => file.includes(`${path.sep}app${path.sep}studio${path.sep}`) && !file.endsWith(`${path.sep}app${path.sep}studio${path.sep}page.tsx`))
if (adminPages.length > 23) failures.push(`admin physical routes ${adminPages.length} > 23`)
if (studioPages.length > 7) failures.push(`studio physical routes ${studioPages.length} > 7`)

const heavyPublicShellPattern = /from ['"](?:three|@react-three\/fiber|@react-three\/drei|monaco-editor|@monaco-editor\/react)['"]/
for (const file of routePages) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, '/')
  if (rel.startsWith('app/studio/') || rel.startsWith('app/ide/') || rel.startsWith('app/nexus/')) continue
  forbidPattern(rel, heavyPublicShellPattern, 'direct Three/Monaco import in public/dashboard/admin route shell')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V28_BEST_IN_MARKET_SPINE.md'),
  `# V28 Best-In-Market Spine

- Product surfaces: ${requiredSurfaces.join(', ')}
- Admin physical routes: ${adminPages.length}/23
- Studio physical routes: ${studioPages.length}/7
- Unified viewport surfaces: scene, character, material, cinematic, audio, canvas, runtime
- Agent runtime spine: tool calling, memory, sandbox, browser replay, vector store, role evals, squad, approval gate
- Creator runtime spine: canonical sequencer and governed export pipeline
- Public first-fold files checked: ${publicFirstFoldFiles.length}
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[v28-best-in-market-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v28-best-in-market-spine] PASS surfaces=6 adminRoutes=${adminPages.length}/23 studioRoutes=${studioPages.length}/7`)
