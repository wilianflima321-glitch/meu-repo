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
const webPackagePath = 'cloud-web-app/web/package.json'
const webDockerfilePath = 'cloud-web-app/web/Dockerfile'
const envExamplePath = '.env.example'
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
const viewportAssetImportPath = 'cloud-web-app/web/lib/viewport/viewport-asset-import.ts'
const viewportAssetImportPersistencePath = 'cloud-web-app/web/lib/viewport/viewport-asset-import-persistence.ts'
const viewportAssetImportHookPath = 'cloud-web-app/web/hooks/useViewportAssetImportPersistence.ts'
const assetImportProductionStatePath = 'cloud-web-app/web/lib/production/asset-import-production-state.ts'
const assetImportRoutePath = 'cloud-web-app/web/app/api/projects/[id]/production-state/asset-import/route.ts'
const viewportAssetImportTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-asset-import.test.ts'
const viewportAssetImportPersistenceTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-asset-import-persistence.test.ts'
const assetImportProductionStateTestPath = 'cloud-web-app/web/__tests__/production/asset-import-production-state.test.ts'
const assetImportRouteTestPath = 'cloud-web-app/web/__tests__/api/production-state-asset-import-route.test.ts'
const viewportRenderContractPath = 'cloud-web-app/web/lib/viewport/viewport-render-contract.ts'
const viewportRenderPersistencePath = 'cloud-web-app/web/lib/viewport/viewport-render-persistence.ts'
const viewportRenderQueuePath = 'cloud-web-app/web/lib/viewport/viewport-render-queue.ts'
const viewportRenderBackendPath = 'cloud-web-app/web/lib/viewport/viewport-render-backend.ts'
const viewportRenderHookPath = 'cloud-web-app/web/hooks/useViewportRenderJobPersistence.ts'
const renderJobProductionStatePath = 'cloud-web-app/web/lib/production/render-job-production-state.ts'
const renderOutputEvidencePath = 'cloud-web-app/web/lib/production/render-output-evidence.ts'
const renderOutputEvidencePersistencePath = 'cloud-web-app/web/lib/production/render-output-evidence-persistence.ts'
const viewportRenderWorkerPath = 'cloud-web-app/web/lib/workers/viewport-render-worker.ts'
const viewportRenderWorkerRunnerPath = 'cloud-web-app/web/server/workers/viewport-render-worker.ts'
const viewportRenderBackendRoutePath = 'cloud-web-app/web/app/api/runtime/viewport/render/route.ts'
const viewportRenderArtifactAccessPath = 'cloud-web-app/web/lib/viewport/viewport-render-artifact-access.ts'
const viewportRenderEvidenceOwnershipPath = 'cloud-web-app/web/lib/viewport/viewport-render-evidence-ownership.ts'
const renderJobRoutePath = 'cloud-web-app/web/app/api/projects/[id]/production-state/render-job/route.ts'
const renderOutputEvidenceRoutePath = 'cloud-web-app/web/app/api/projects/[id]/production-state/render-job/evidence/route.ts'
const renderArtifactRoutePath =
  'cloud-web-app/web/app/api/projects/[id]/production-state/render-job/artifact/route.ts'
const viewportRenderContractTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-render-contract.test.ts'
const viewportRenderPersistenceTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-render-persistence.test.ts'
const viewportRenderQueueTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-render-queue.test.ts'
const viewportRenderBackendTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-render-backend.test.ts'
const viewportRenderArtifactAccessTestPath =
  'cloud-web-app/web/__tests__/viewport/viewport-render-artifact-access.test.ts'
const renderJobProductionStateTestPath = 'cloud-web-app/web/__tests__/production/render-job-production-state.test.ts'
const renderOutputEvidenceTestPath = 'cloud-web-app/web/__tests__/production/render-output-evidence.test.ts'
const viewportRenderWorkerTestPath = 'cloud-web-app/web/__tests__/workers/viewport-render-worker.test.ts'
const viewportRenderBackendRouteTestPath = 'cloud-web-app/web/__tests__/api/runtime-viewport-render-route.test.ts'
const renderJobRouteTestPath = 'cloud-web-app/web/__tests__/api/production-state-render-job-route.test.ts'
const renderOutputEvidenceRouteTestPath = 'cloud-web-app/web/__tests__/api/production-state-render-output-evidence-route.test.ts'
const renderArtifactRouteTestPath = 'cloud-web-app/web/__tests__/api/production-state-render-artifact-route.test.ts'
const viewportProfessionalControlsTestPath = 'cloud-web-app/web/__tests__/viewport/viewport-professional-controls-contract.test.ts'
const sceneViewportStatePath = 'cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts'
const sceneViewportStagePath = 'cloud-web-app/web/components/preview/SceneViewportStage.tsx'
const aethelViewportPath = 'cloud-web-app/web/components/viewport/AethelViewport3D.tsx'
const timelineOverlayPath = 'cloud-web-app/web/components/viewport/TimelineOverlay.tsx'

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
  viewportAssetImportPath,
  viewportAssetImportPersistencePath,
  viewportAssetImportHookPath,
  assetImportProductionStatePath,
  assetImportRoutePath,
  viewportAssetImportTestPath,
  viewportAssetImportPersistenceTestPath,
  assetImportProductionStateTestPath,
  assetImportRouteTestPath,
  viewportRenderContractPath,
  viewportRenderPersistencePath,
  viewportRenderQueuePath,
  viewportRenderBackendPath,
  viewportRenderHookPath,
  renderJobProductionStatePath,
  renderOutputEvidencePath,
  renderOutputEvidencePersistencePath,
  viewportRenderWorkerPath,
  viewportRenderWorkerRunnerPath,
  viewportRenderBackendRoutePath,
  viewportRenderArtifactAccessPath,
  viewportRenderEvidenceOwnershipPath,
  renderJobRoutePath,
  renderOutputEvidenceRoutePath,
  renderArtifactRoutePath,
  viewportRenderContractTestPath,
  viewportRenderPersistenceTestPath,
  viewportRenderQueueTestPath,
  viewportRenderBackendTestPath,
  viewportRenderArtifactAccessTestPath,
  renderJobProductionStateTestPath,
  renderOutputEvidenceTestPath,
  viewportRenderWorkerTestPath,
  viewportRenderBackendRouteTestPath,
  renderJobRouteTestPath,
  renderOutputEvidenceRouteTestPath,
  renderArtifactRouteTestPath,
  viewportProfessionalControlsTestPath,
  sceneViewportStatePath,
  sceneViewportStagePath,
  aethelViewportPath,
  timelineOverlayPath,
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
const webPackageJson = existsSync(webPackagePath) ? read(webPackagePath) : ''
const webDockerfile = existsSync(webDockerfilePath) ? read(webDockerfilePath) : ''
const envExample = existsSync(envExamplePath) ? read(envExamplePath) : ''
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
const viewportAssetImport = existsSync(viewportAssetImportPath) ? read(viewportAssetImportPath) : ''
const viewportAssetImportPersistence = existsSync(viewportAssetImportPersistencePath) ? read(viewportAssetImportPersistencePath) : ''
const viewportAssetImportHook = existsSync(viewportAssetImportHookPath) ? read(viewportAssetImportHookPath) : ''
const assetImportProductionState = existsSync(assetImportProductionStatePath) ? read(assetImportProductionStatePath) : ''
const assetImportRoute = existsSync(assetImportRoutePath) ? read(assetImportRoutePath) : ''
const viewportAssetImportTest = existsSync(viewportAssetImportTestPath) ? read(viewportAssetImportTestPath) : ''
const viewportAssetImportPersistenceTest = existsSync(viewportAssetImportPersistenceTestPath) ? read(viewportAssetImportPersistenceTestPath) : ''
const assetImportProductionStateTest = existsSync(assetImportProductionStateTestPath) ? read(assetImportProductionStateTestPath) : ''
const assetImportRouteTest = existsSync(assetImportRouteTestPath) ? read(assetImportRouteTestPath) : ''
const viewportRenderContract = existsSync(viewportRenderContractPath) ? read(viewportRenderContractPath) : ''
const viewportRenderPersistence = existsSync(viewportRenderPersistencePath) ? read(viewportRenderPersistencePath) : ''
const viewportRenderQueue = existsSync(viewportRenderQueuePath) ? read(viewportRenderQueuePath) : ''
const viewportRenderBackend = existsSync(viewportRenderBackendPath) ? read(viewportRenderBackendPath) : ''
const viewportRenderHook = existsSync(viewportRenderHookPath) ? read(viewportRenderHookPath) : ''
const renderJobProductionState = existsSync(renderJobProductionStatePath) ? read(renderJobProductionStatePath) : ''
const renderOutputEvidence = existsSync(renderOutputEvidencePath) ? read(renderOutputEvidencePath) : ''
const renderOutputEvidencePersistence = existsSync(renderOutputEvidencePersistencePath) ? read(renderOutputEvidencePersistencePath) : ''
const viewportRenderWorker = existsSync(viewportRenderWorkerPath) ? read(viewportRenderWorkerPath) : ''
const viewportRenderWorkerRunner = existsSync(viewportRenderWorkerRunnerPath) ? read(viewportRenderWorkerRunnerPath) : ''
const viewportRenderBackendRoute = existsSync(viewportRenderBackendRoutePath) ? read(viewportRenderBackendRoutePath) : ''
const viewportRenderArtifactAccess = existsSync(viewportRenderArtifactAccessPath)
  ? read(viewportRenderArtifactAccessPath)
  : ''
const viewportRenderEvidenceOwnership = existsSync(viewportRenderEvidenceOwnershipPath)
  ? read(viewportRenderEvidenceOwnershipPath)
  : ''
const renderJobRoute = existsSync(renderJobRoutePath) ? read(renderJobRoutePath) : ''
const renderOutputEvidenceRoute = existsSync(renderOutputEvidenceRoutePath) ? read(renderOutputEvidenceRoutePath) : ''
const renderArtifactRoute = existsSync(renderArtifactRoutePath) ? read(renderArtifactRoutePath) : ''
const viewportRenderContractTest = existsSync(viewportRenderContractTestPath) ? read(viewportRenderContractTestPath) : ''
const viewportRenderPersistenceTest = existsSync(viewportRenderPersistenceTestPath) ? read(viewportRenderPersistenceTestPath) : ''
const viewportRenderQueueTest = existsSync(viewportRenderQueueTestPath) ? read(viewportRenderQueueTestPath) : ''
const viewportRenderBackendTest = existsSync(viewportRenderBackendTestPath) ? read(viewportRenderBackendTestPath) : ''
const viewportRenderArtifactAccessTest = existsSync(viewportRenderArtifactAccessTestPath)
  ? read(viewportRenderArtifactAccessTestPath)
  : ''
const renderJobProductionStateTest = existsSync(renderJobProductionStateTestPath) ? read(renderJobProductionStateTestPath) : ''
const renderOutputEvidenceTest = existsSync(renderOutputEvidenceTestPath) ? read(renderOutputEvidenceTestPath) : ''
const viewportRenderWorkerTest = existsSync(viewportRenderWorkerTestPath) ? read(viewportRenderWorkerTestPath) : ''
const viewportRenderBackendRouteTest = existsSync(viewportRenderBackendRouteTestPath) ? read(viewportRenderBackendRouteTestPath) : ''
const renderJobRouteTest = existsSync(renderJobRouteTestPath) ? read(renderJobRouteTestPath) : ''
const renderOutputEvidenceRouteTest = existsSync(renderOutputEvidenceRouteTestPath) ? read(renderOutputEvidenceRouteTestPath) : ''
const renderArtifactRouteTest = existsSync(renderArtifactRouteTestPath) ? read(renderArtifactRouteTestPath) : ''
const viewportProfessionalControlsTest = existsSync(viewportProfessionalControlsTestPath) ? read(viewportProfessionalControlsTestPath) : ''
const sceneViewportState = existsSync(sceneViewportStatePath) ? read(sceneViewportStatePath) : ''
const sceneViewportStage = existsSync(sceneViewportStagePath) ? read(sceneViewportStagePath) : ''
const aethelViewport = existsSync(aethelViewportPath) ? read(aethelViewportPath) : ''
const timelineOverlay = existsSync(timelineOverlayPath) ? read(timelineOverlayPath) : ''
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

for (const phrase of [
  'ViewportAssetImportMetadata',
  'VIEWPORT_ASSET_IMPORT_EXTENSIONS',
  'licenseStatus',
  'qualityGate',
  'evidenceRef',
  'buildViewportImportedObjects',
  'buildViewportAssetImportBatch',
  'coerceViewportAssetImportBatch',
]) {
  assert(viewportAssetImport.includes(phrase), `viewport asset import includes "${phrase}"`)
}

assert(
  viewportAssetImport.includes("'glb'") &&
    viewportAssetImport.includes("'fbx'") &&
    viewportAssetImport.includes("'usd'"),
  'viewport asset import supports GLB, FBX, and USD-family assets'
)
assert(
  viewportAssetImportTest.includes('license review metadata') &&
    viewportAssetImportTest.includes('arbitrary files'),
  'viewport asset import tests protect provenance, license review, and unsupported file behavior'
)
assert(sceneViewportState.includes('handleImportViewportAssets'), 'scene viewport state wires asset import handler')
assert(sceneViewportState.includes('useViewportAssetImportPersistence'), 'scene viewport state persists asset import when project context exists')
assert(sceneViewportStage.includes('onImportAssets={handleImportViewportAssets}'), 'scene viewport stage passes asset import to AethelViewport3D')
assert(
  aethelViewport.includes('onDrop={handleAssetDrop}') &&
    aethelViewport.includes('Asset intake') &&
    aethelViewport.includes('license review'),
  'AethelViewport3D exposes drag-drop asset intake without a new dashboard surface'
)
assert(
  viewportProfessionalControlsTest.includes('KeyW') &&
    viewportProfessionalControlsTest.includes('KeyE') &&
    viewportProfessionalControlsTest.includes('KeyR') &&
    viewportProfessionalControlsTest.includes('Escape'),
  'viewport professional controls test protects W/E/R and Escape editor hotkeys'
)
assert(
  viewportProfessionalControlsTest.includes('CameraPresetApplier') &&
    viewportProfessionalControlsTest.includes('top: [0, 8.5, 0.001]') &&
    viewportProfessionalControlsTest.includes('front: [0, 1.6, 7.2]') &&
    viewportProfessionalControlsTest.includes('side: [7.2, 1.6, 0]'),
  'viewport professional controls test protects camera presets for scene review'
)
for (const phrase of [
  'persistViewportAssetImportBatch',
  '/production-state/asset-import',
  'viewport:asset-import',
]) {
  assert(viewportAssetImportPersistence.includes(phrase), `viewport asset import persistence includes "${phrase}"`)
}
assert(viewportAssetImportHook.includes('useViewportAssetImportPersistence'), 'viewport asset import persistence hook is available to client surfaces')
for (const phrase of [
  'mergeViewportAssetImportIntoProductionState',
  'Asset Librarian Agent',
  'License/provenance review required before release',
  'Asset quality gate is raw intake',
]) {
  assert(assetImportProductionState.includes(phrase), `asset import production state includes "${phrase}"`)
}
assert(
  assetImportRoute.includes('coerceViewportAssetImportBatch') &&
    assetImportRoute.includes('mergeViewportAssetImportIntoProductionState') &&
    assetImportRoute.includes('writeAgenticProductionStateToSettings'),
  'asset import route persists viewport imports into durable production state'
)
assert(
  viewportAssetImportPersistenceTest.includes('durable production state') &&
    assetImportProductionStateTest.includes('Asset Graph') &&
    assetImportRouteTest.includes('production-state/asset-import'),
  'asset import tests cover persistence client, production merge, and API route'
)

for (const phrase of [
  'ViewportRenderJobContract',
  'VIEWPORT_RENDER_QUALITY_PROFILES',
  'draft',
  'review',
  'final',
  'local-worker',
  'cloud-sandbox',
  'Render runs outside the browser main thread',
  'estimateViewportRenderCostUsd',
  'coerceViewportRenderJobContract',
]) {
  assert(viewportRenderContract.includes(phrase), `viewport render contract includes "${phrase}"`)
}
for (const phrase of [
  'persistViewportRenderJob',
  '/production-state/render-job',
  'viewport:render-job',
  'enqueue',
]) {
  assert(viewportRenderPersistence.includes(phrase), `viewport render persistence includes "${phrase}"`)
}
for (const phrase of [
  'ViewportRenderQueuePayload',
  'render:viewport',
  'outside-browser-main-thread',
  'shouldHoldViewportRenderRuntimeRoute',
  'buildViewportRenderQueuePayload',
]) {
  assert(viewportRenderQueue.includes(phrase), `viewport render queue includes "${phrase}"`)
}
for (const phrase of [
  'renderViewportBackendArtifacts',
  'coerceViewportRenderBackendRequest',
  'buildViewportRenderBackendCapabilities',
  'resolveViewportRenderArtifactUrl',
  'readViewportRenderArtifact',
  'aethel-internal-scene-preview',
  'aethel-artifact://viewport-render',
  'thumbnail.svg',
  'proxy-preview.svg',
  'performance-report.json',
  'license-report.json',
  'validation-report.json',
  'does not mint new marketplace rights',
  'Media outputs still require a real FFmpeg/native/cloud renderer',
]) {
  assert(viewportRenderBackend.includes(phrase), `viewport render backend includes "${phrase}"`)
}
assert(viewportRenderHook.includes('useViewportRenderJobPersistence'), 'viewport render persistence hook is available to client surfaces')
for (const phrase of [
  'mergeViewportRenderJobIntoProductionState',
  'Rendered media evidence is required before release approval',
  'Performance QA Agent',
  'Release Agent',
  'Heavy viewport renders must run through',
]) {
  assert(renderJobProductionState.includes(phrase), `render job production state includes "${phrase}"`)
}
for (const phrase of [
  'ViewportRenderOutputEvidence',
  'mergeViewportRenderOutputEvidenceIntoProductionState',
  'Human approval required before release',
  'Performance QA Agent',
  'Render Queue Agent',
  'Release Agent',
]) {
  assert(renderOutputEvidence.includes(phrase), `render output evidence includes "${phrase}"`)
}
for (const phrase of [
  'persistViewportRenderOutputEvidenceForProject',
  'mergeViewportRenderOutputEvidenceIntoProductionState',
  'writeAgenticProductionStateToSettings',
  'render_output_evidence.persisted_by_worker',
]) {
  assert(renderOutputEvidencePersistence.includes(phrase), `render output evidence persistence includes "${phrase}"`)
}
for (const phrase of [
  'registerViewportRenderWorker',
  'processViewportRenderQueueJob',
  'executeViewportRenderQueuePayload',
  'AETHEL_RENDER_BACKEND_ENDPOINT',
  'No media artifact was fabricated',
  'manifest-only',
  'persistViewportRenderOutputEvidenceForProject',
  'VIEWPORT_RENDER_QUEUE_JOB_TYPE',
]) {
  assert(viewportRenderWorker.includes(phrase), `viewport render worker includes "${phrase}"`)
}
assert(
  viewportRenderWorkerRunner.includes('registerViewportRenderWorker') &&
    viewportRenderWorkerRunner.includes('VIEWPORT_RENDER_WORKER_CONCURRENCY'),
  'viewport render worker runner starts the dedicated render worker with configurable concurrency'
)
assert(
  viewportRenderBackendRoute.includes('AETHEL_RENDER_BACKEND_TOKEN') &&
    viewportRenderBackendRoute.includes('renderViewportBackendArtifacts') &&
    viewportRenderBackendRoute.includes('readViewportRenderArtifact') &&
    viewportRenderBackendRoute.includes('buildViewportRenderBackendCapabilities') &&
    viewportRenderBackendRoute.includes('releaseReady: false') &&
    viewportRenderBackendRoute.includes('UNAUTHORIZED_RENDER_BACKEND'),
  'viewport render backend API is token-protected, artifact-readable, capability-aware, and never auto-releases'
)
assert(
  viewportRenderArtifactAccess.includes('buildViewportRenderArtifactAccessUrl') &&
    viewportRenderArtifactAccess.includes('withViewportRenderArtifactAccess') &&
    viewportRenderArtifactAccess.includes('project-authenticated-proxy') &&
    viewportRenderArtifactAccess.includes('requires a projectId') &&
    viewportRenderArtifactAccess.includes('/production-state/render-job/artifact'),
  'viewport render artifact access maps internal renderer URLs to project-authenticated proxy URLs'
)
assert(
  renderArtifactRoute.includes('readViewportRenderArtifact') &&
    renderArtifactRoute.includes('resolveViewportRenderArtifactUrl') &&
    renderArtifactRoute.includes('Render artifact does not belong to this project') &&
    renderArtifactRoute.includes('private, no-store') &&
    renderArtifactRoute.includes('content-disposition'),
  'render artifact route serves internal render outputs only through project auth, ownership checks, and private cache headers'
)
assert(
  webPackageJson.includes('worker:viewport-render') &&
    webPackageJson.includes('worker:all') &&
    webPackageJson.includes('server/workers/viewport-render-worker.ts'),
  'web package exposes viewport render worker scripts'
)
assert(webDockerfile.includes('worker:all'), 'worker Docker image starts export and viewport render workers together')
assert(envExample.includes('AETHEL_RENDER_BACKEND_ENDPOINT'), 'env example documents viewport render backend endpoint')
assert(envExample.includes('AETHEL_RENDER_BACKEND_TOKEN'), 'env example documents viewport render backend token')
assert(envExample.includes('AETHEL_RENDER_ARTIFACT_ROOT'), 'env example documents viewport render artifact root')
assert(
  renderJobRoute.includes('coerceViewportRenderJobContract') &&
    renderJobRoute.includes('mergeViewportRenderJobIntoProductionState') &&
    renderJobRoute.includes('VIEWPORT_RENDER_QUEUE_JOB_TYPE') &&
    renderJobRoute.includes('queue.queued') &&
    renderJobRoute.includes('writeAgenticProductionStateToSettings'),
  'render job route persists render contracts and only reports queue truth'
)
assert(
  renderOutputEvidenceRoute.includes('coerceViewportRenderOutputEvidence') &&
    renderOutputEvidenceRoute.includes('mergeViewportRenderOutputEvidenceIntoProductionState') &&
    renderOutputEvidenceRoute.includes('withViewportRenderEvidenceArtifactAccess') &&
    renderOutputEvidenceRoute.includes('validateViewportRenderEvidenceArtifactOwnership') &&
    viewportRenderEvidenceOwnership.includes('resolveViewportRenderArtifactUrl') &&
    viewportRenderEvidenceOwnership.includes('ARTIFACT_PROJECT_MISMATCH') &&
    viewportRenderEvidenceOwnership.includes('Render artifact does not belong to this project') &&
    renderOutputEvidenceRoute.includes('releaseReady: false') &&
    renderOutputEvidenceRoute.includes('Human approval'),
  'render output evidence route attaches media evidence, validates artifact ownership, returns project-authenticated artifact access, and avoids auto-release'
)
assert(
  viewportRenderEvidenceOwnership.includes('validateViewportRenderEvidenceArtifactOwnership') &&
    renderOutputEvidencePersistence.includes('persistence_artifact_ownership_rejected') &&
    viewportRenderWorker.includes('Renderer backend returned unsafe artifact evidence') &&
    viewportRenderWorkerTest.includes('references another project internal artifact'),
  'render output evidence ownership validation is shared by API, persistence, and render worker paths'
)
assert(
  sceneViewportState.includes('useViewportExport') &&
    sceneViewportState.includes('renderQuality') &&
    sceneViewportState.includes('setRenderQuality') &&
    sceneViewportState.includes('renderMode'),
  'scene viewport state wires render quality and render mode into export contract'
)
assert(
  timelineOverlay.includes('renderQuality') &&
    timelineOverlay.includes('onRenderQualityChange') &&
    timelineOverlay.includes("'draft', 'review', 'final'"),
  'timeline overlay exposes compact render quality controls without a new dashboard'
)
assert(
  viewportRenderContractTest.includes('cost') &&
    viewportRenderPersistenceTest.includes('durable production state') &&
    viewportRenderQueueTest.includes('outside-browser-main-thread') &&
    viewportRenderBackendTest.includes('produces concrete draft preview artifacts') &&
    viewportRenderBackendTest.includes('does not pretend review MP4 or final video exists') &&
    viewportRenderBackendTest.includes('resolves artifact URLs without allowing path traversal') &&
    viewportRenderArtifactAccessTest.includes('project-authenticated access URLs') &&
    viewportRenderArtifactAccessTest.includes('external media URLs') &&
    viewportRenderArtifactAccessTest.includes('without project context') &&
    renderJobProductionStateTest.includes('Release Agent') &&
    renderOutputEvidenceTest.includes('Human review must approve media evidence before release') &&
    viewportRenderWorkerTest.includes('does not fake media output') &&
    viewportRenderWorkerTest.includes('real renderer backend evidence') &&
    viewportRenderBackendRouteTest.includes('RENDER_BACKEND_TOKEN_NOT_CONFIGURED') &&
    viewportRenderBackendRouteTest.includes('never auto-releases') &&
    viewportRenderBackendRouteTest.includes('serves generated artifacts behind the same internal token') &&
    viewportRenderBackendRouteTest.includes('rejects artifact traversal attempts') &&
    renderJobRouteTest.includes('payload.queued).toBe(false') &&
    renderJobRouteTest.includes('render:viewport') &&
    renderOutputEvidenceRouteTest.includes('releaseReady).toBe(false') &&
    renderOutputEvidenceRouteTest.includes('project-authenticated-proxy') &&
    renderOutputEvidenceRouteTest.includes('belong to another project') &&
    renderOutputEvidenceRouteTest.includes('malformed internal render artifact URLs'),
  'render job tests cover contract, persistence, queue routing, worker execution, output evidence, production merge, and no-fake behavior'
)
assert(
  renderArtifactRouteTest.includes('serves a project-owned render artifact') &&
    renderArtifactRouteTest.includes('blocks artifacts that belong to a different project') &&
    renderArtifactRouteTest.includes('rejects malformed artifact URLs'),
  'render artifact route tests cover project-owned access, cross-project denial, and malformed artifact URLs'
)

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('AI game/film production contract gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`AI game/film production contract gate passed (${checks.length} checks).`)
