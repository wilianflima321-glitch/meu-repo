import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const contractPath = 'docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md'
const triagePath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md'
const checklistPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md'
const packagePath = 'package.json'
const measurePath = 'tools/measure-product-quality.mjs'
const testPath = 'cloud-web-app/web/__tests__/docs/ai-game-film-production-contract.test.ts'
const productionStateTestPath = 'cloud-web-app/web/__tests__/production/agentic-production-state.test.ts'
const repositoryCartographyPath = 'cloud-web-app/web/lib/production/repository-cartography.ts'
const repositoryCartographyTestPath = 'cloud-web-app/web/__tests__/production/repository-cartography.test.ts'
const expensiveGenerationGuardPath = 'cloud-web-app/web/lib/server/ai-expensive-generation-guard.ts'
const expensiveGenerationGuardTestPath = 'cloud-web-app/web/__tests__/server/ai-expensive-generation-guard.test.ts'
const agentSurfaceLocksPath = 'cloud-web-app/web/lib/production/agent-surface-locks.ts'
const agentSurfaceLocksTestPath = 'cloud-web-app/web/__tests__/production/agent-surface-locks.test.ts'
const agentFleetSessionPath = 'cloud-web-app/web/lib/production/agent-fleet-session.ts'
const agentLocksRoutePath = 'cloud-web-app/web/app/api/projects/[id]/production-state/agent-locks/route.ts'
const agentLocksRouteTestPath = 'cloud-web-app/web/__tests__/api/production-state-agent-locks-route.test.ts'
const creativeStudioRoutesPath = 'cloud-web-app/web/app/studio/creative-studio-routes.ts'
const creativeStudioShellPath = 'cloud-web-app/web/app/studio/CreativeStudioShell.tsx'
const creativeStudioRouteContractTestPath = 'cloud-web-app/web/__tests__/app/creative-studio-route-contract.test.ts'

const creativeStudioPages = [
  {
    href: '/studio/level',
    path: 'cloud-web-app/web/app/studio/level/page.tsx',
    component: '@/components/engine/LevelEditor',
  },
  {
    href: '/studio/scene',
    path: 'cloud-web-app/web/app/studio/scene/page.tsx',
    component: '@/components/scene-editor/SceneEditor',
  },
  {
    href: '/studio/material',
    path: 'cloud-web-app/web/app/studio/material/page.tsx',
    component: '@/components/materials/MaterialEditor',
  },
  {
    href: '/studio/animation',
    path: 'cloud-web-app/web/app/studio/animation/page.tsx',
    component: '@/components/engine/AnimationBlueprint',
  },
  {
    href: '/studio/vfx',
    path: 'cloud-web-app/web/app/studio/vfx/page.tsx',
    component: '@/components/engine/NiagaraVFX',
  },
  {
    href: '/studio/audio',
    path: 'cloud-web-app/web/app/studio/audio/page.tsx',
    component: '@/components/audio/SoundCueEditor',
  },
]

const anchors = [
  'docs/master/93_UNREAL_AGENTIC_PRODUCT_GAP_MAP_2026-05-01.md',
  'cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md',
  'cloud-web-app/web/components/studio/GamesAndFilmsModule.tsx',
  'cloud-web-app/web/components/preview/SceneViewportSurface.tsx',
  'cloud-web-app/web/components/viewport/AethelViewport3D.tsx',
  'cloud-web-app/web/components/assets/ContentBrowserConnected.tsx',
  'cloud-web-app/web/lib/server/asset-quality.ts',
  'cloud-web-app/web/lib/server/asset-source-policy.ts',
  expensiveGenerationGuardPath,
  'cloud-web-app/web/lib/device/runtime-execution-router.ts',
  'cloud-web-app/web/lib/production/agentic-production-state.ts',
  repositoryCartographyPath,
  'cloud-web-app/web/app/api/projects/[id]/production-state/route.ts',
  'cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx',
]

for (const path of [
  contractPath,
  triagePath,
  checklistPath,
  packagePath,
  measurePath,
  testPath,
  productionStateTestPath,
  repositoryCartographyTestPath,
  expensiveGenerationGuardTestPath,
  agentSurfaceLocksPath,
  agentSurfaceLocksTestPath,
  agentFleetSessionPath,
  agentLocksRoutePath,
  agentLocksRouteTestPath,
  creativeStudioRoutesPath,
  creativeStudioShellPath,
  creativeStudioRouteContractTestPath,
  'cloud-web-app/web/app/studio/page.tsx',
  'cloud-web-app/web/app/studio/film/page.tsx',
  'cloud-web-app/web/app/studio/film/FilmStudioClient.tsx',
  ...creativeStudioPages.map((page) => page.path),
  ...anchors,
]) {
  assert(existsSync(path), `${path} exists`)
}

const contract = existsSync(contractPath) ? read(contractPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const packageJson = existsSync(packagePath) ? read(packagePath) : ''
const measure = existsSync(measurePath) ? read(measurePath) : ''
const test = existsSync(testPath) ? read(testPath) : ''
const productionState = existsSync('cloud-web-app/web/lib/production/agentic-production-state.ts')
  ? read('cloud-web-app/web/lib/production/agentic-production-state.ts')
  : ''
const productionStateRoute = existsSync('cloud-web-app/web/app/api/projects/[id]/production-state/route.ts')
  ? read('cloud-web-app/web/app/api/projects/[id]/production-state/route.ts')
  : ''
const productionStateTest = existsSync(productionStateTestPath) ? read(productionStateTestPath) : ''
const repositoryCartography = existsSync(repositoryCartographyPath) ? read(repositoryCartographyPath) : ''
const repositoryCartographyTest = existsSync(repositoryCartographyTestPath) ? read(repositoryCartographyTestPath) : ''
const expensiveGenerationGuard = existsSync(expensiveGenerationGuardPath) ? read(expensiveGenerationGuardPath) : ''
const expensiveGenerationGuardTest = existsSync(expensiveGenerationGuardTestPath) ? read(expensiveGenerationGuardTestPath) : ''
const agentSurfaceLocks = existsSync(agentSurfaceLocksPath) ? read(agentSurfaceLocksPath) : ''
const agentSurfaceLocksTest = existsSync(agentSurfaceLocksTestPath) ? read(agentSurfaceLocksTestPath) : ''
const agentFleetSession = existsSync(agentFleetSessionPath) ? read(agentFleetSessionPath) : ''
const agentLocksRoute = existsSync(agentLocksRoutePath) ? read(agentLocksRoutePath) : ''
const agentLocksRouteTest = existsSync(agentLocksRouteTestPath) ? read(agentLocksRouteTestPath) : ''
const creativeStudioRoutes = existsSync(creativeStudioRoutesPath) ? read(creativeStudioRoutesPath) : ''
const creativeStudioShell = existsSync(creativeStudioShellPath) ? read(creativeStudioShellPath) : ''
const creativeStudioRouteContractTest = existsSync(creativeStudioRouteContractTestPath) ? read(creativeStudioRouteContractTestPath) : ''
const creativeStudioHub = existsSync('cloud-web-app/web/app/studio/page.tsx')
  ? read('cloud-web-app/web/app/studio/page.tsx')
  : ''
const filmStudioClient = existsSync('cloud-web-app/web/app/studio/film/FilmStudioClient.tsx')
  ? read('cloud-web-app/web/app/studio/film/FilmStudioClient.tsx')
  : ''

for (const phrase of [
  'AI Game/Film Production Contract',
  'No new top-level interface',
  'Mission Ledger',
  'Project Brain',
  'Asset Graph',
  'Scene Graph',
  'World Graph',
  'Gameplay Graph',
  'Shot Graph',
  'Film Graph',
  'Validation Graph',
  'Evidence Graph',
  'Research Agent',
  'Asset Librarian Agent',
  'license/provenance',
  'Performance Agent',
  'Studio Local',
  'cloud-sandbox',
  'human approval',
  'playtest',
  'render queue',
  'continuity',
  'Unreal parity',
  'autonomous AAA',
  'Repository Cartography',
  'GB-scale',
  'mustReadFirst',
  'doNotInvent',
  'Parallel Agent Scope Lock Update',
  'previewAgentSurfaceLockRequest',
  'buildAgentSurfaceLockSnapshot',
]) {
  assert(contract.includes(phrase), `contract includes "${phrase}"`)
}

for (const anchor of anchors) {
  assert(contract.includes(anchor), `contract references existing anchor ${anchor}`)
}

for (const forbidden of [
  /full Unreal parity/i,
  /autonomous AAA completion is live/i,
  /Nanite parity is implemented/i,
  /Lumen parity is implemented/i,
  /fully automatic AAA game generation/i,
]) {
  assert(!forbidden.test(contract), `contract avoids overclaim ${forbidden}`)
}

assert(packageJson.includes('qa:ai-game-film-production'), 'root package exposes qa:ai-game-film-production')
assert(packageJson.includes('check-ai-game-film-production-contract.mjs'), 'product quality progress runs AI game/film gate')
assert(measure.includes('aiGameFilmProductionConfigured'), 'product quality measure tracks AI game/film gate')
assert(triage.includes('AI Game/Film Production Contract'), 'triage doc records AI game/film contract')
assert(checklist.includes('qa:ai-game-film-production'), 'execution checklist includes AI game/film gate')
assert(test.includes('AI Game/Film Production Contract') && test.includes('Asset Graph'), 'static test covers production contract')
for (const phrase of [
  'PRODUCTION_STATE_SETTINGS_KEY',
  'ProjectBrainMemory',
  'MissionLedgerEntry',
  'assetGraph',
  'sceneWorldGraph',
  'gameplayGraph',
  'shotFilmGraph',
  'validationGraph',
  'evidenceGraph',
  'releaseGraph',
  'requiresHumanApproval',
]) {
  assert(productionState.includes(phrase), `production state includes "${phrase}"`)
}
assert(productionStateRoute.includes('readAgenticProductionStateFromSettings'), 'production state API reads durable project settings')
assert(productionStateRoute.includes('writeAgenticProductionStateToSettings'), 'production state API writes durable project settings')
assert(productionStateRoute.includes('buildProductionReadinessSummary'), 'production state API returns readiness summary')
assert(productionStateTest.includes('Project Brain') && productionStateTest.includes('Mission Ledger'), 'production state tests cover durable brain and ledger')
for (const phrase of [
  'RepositoryCartographyManifest',
  'huggingface-hub',
  'external-mirror',
  'mustReadFirst',
  'doNotInvent',
  'duplicateGroups',
  'agentHandoffs',
  'mergeRepositoryCartographyIntoProductionState',
]) {
  assert(repositoryCartography.includes(phrase), `repository cartography includes "${phrase}"`)
}
assert(
  repositoryCartographyTest.includes('huggingface-hub') &&
    repositoryCartographyTest.includes('duplicate') &&
    repositoryCartographyTest.includes('Project Brain'),
  'repository cartography tests cover external GB sources, duplicates, and durable production merge'
)

for (const phrase of [
  'estimateExpensiveAiGenerationCost',
  'GENERATION_PLAN_REQUIRED',
  'GENERATION_TOO_EXPENSIVE_FOR_PLAN',
  'consumeMeteredUsage',
  'X-Aethel-Estimated-Cost-Tokens',
]) {
  assert(expensiveGenerationGuard.includes(phrase), `expensive generation guard includes "${phrase}"`)
}

for (const route of [
  'cloud-web-app/web/app/api/ai/image/generate/route.ts',
  'cloud-web-app/web/app/api/ai/3d/generate/route.ts',
  'cloud-web-app/web/app/api/ai/music/generate/route.ts',
  'cloud-web-app/web/app/api/ai/voice/generate/route.ts',
]) {
  const source = existsSync(route) ? read(route) : ''
  assert(source.includes('enforceExpensiveAiGenerationUsage'), `${route} enforces expensive generation usage before provider execution`)
  assert(source.includes('estimatedCostTokens'), `${route} returns estimated media generation cost metadata`)
}

assert(
  expensiveGenerationGuardTest.includes('block free-plan abuse') &&
    expensiveGenerationGuardTest.includes('X-Aethel-Estimated-Cost-Tokens'),
  'expensive generation guard tests cover abuse blocking and cost transparency headers'
)

for (const phrase of [
  'acquireAgentSurfaceLocks',
  'previewAgentSurfaceLockRequest',
  'buildAgentSurfaceLockSnapshot',
  'AGENT_SURFACE_LOCKED',
  'arbitrationRequired',
]) {
  assert(agentSurfaceLocks.includes(phrase), `agent surface locks include "${phrase}"`)
}

assert(
  agentSurfaceLocksTest.includes('previews conflicts without acquiring a new lock') &&
    agentSurfaceLocksTest.includes('Producer-ready ownership snapshot'),
  'agent surface lock tests cover preview-only conflict checks and Producer ownership snapshots'
)
assert(agentFleetSession.includes('lockCoordination'), 'agent fleet snapshot exposes lockCoordination for the senior coordinator')
for (const phrase of [
  'previewAgentSurfaceLockRequest',
  'acquireAgentSurfaceLocks',
  'releaseAgentSurfaceLock',
  'buildAgentSurfaceLockSnapshot',
]) {
  assert(agentLocksRoute.includes(phrase), `agent locks route includes "${phrase}"`)
}
assert(
  agentLocksRouteTest.includes('previews conflicts without mutating existing locks') &&
    agentLocksRouteTest.includes('acquires and releases a lock for editor agents'),
  'agent locks route tests cover preview, acquire, and release behavior'
)

for (const page of creativeStudioPages) {
  const pageSource = existsSync(page.path) ? read(page.path) : ''
  assert(creativeStudioRoutes.includes(`href: '${page.href}'`), `creative studio route registry exposes ${page.href}`)
  assert(pageSource.includes(page.component), `${page.path} dynamically imports ${page.component}`)
  assert(pageSource.includes('CreativeStudioShell'), `${page.path} uses the canonical CreativeStudioShell`)
}

for (const phrase of [
  'Progressive creative depth',
  'Level Studio',
  'Scene Studio',
  'Material Studio',
  'Animation Studio',
  'VFX Studio',
  'Film Studio',
  'Audio Studio',
]) {
  assert(
    creativeStudioRoutes.includes(phrase) ||
      creativeStudioShell.includes(phrase) ||
      creativeStudioHub.includes(phrase),
    `creative studio includes "${phrase}"`,
  )
}

assert(filmStudioClient.includes('@/components/nexus/DirectorMode'), 'film studio wires DirectorMode')
assert(filmStudioClient.includes('@/components/video/VideoTimelineEditor'), 'film studio wires VideoTimelineEditor')
assert(
  creativeStudioRouteContractTest.includes('/studio/level') &&
    creativeStudioRouteContractTest.includes('/studio/film') &&
    creativeStudioRouteContractTest.includes('/studio/audio'),
  'creative studio contract test protects game, film, and audio routes'
)

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('AI game/film production contract gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`AI game/film production contract gate passed (${checks.length} checks).`)
