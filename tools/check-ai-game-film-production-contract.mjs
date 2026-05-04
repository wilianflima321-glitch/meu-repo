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

const anchors = [
  'docs/master/93_UNREAL_AGENTIC_PRODUCT_GAP_MAP_2026-05-01.md',
  'cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md',
  'cloud-web-app/web/components/studio/GamesAndFilmsModule.tsx',
  'cloud-web-app/web/components/preview/SceneViewportSurface.tsx',
  'cloud-web-app/web/components/viewport/AethelViewport3D.tsx',
  'cloud-web-app/web/components/assets/ContentBrowserConnected.tsx',
  'cloud-web-app/web/lib/server/asset-quality.ts',
  'cloud-web-app/web/lib/server/asset-source-policy.ts',
  'cloud-web-app/web/lib/device/runtime-execution-router.ts',
  'cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx',
]

for (const path of [contractPath, triagePath, checklistPath, packagePath, measurePath, testPath, ...anchors]) {
  assert(existsSync(path), `${path} exists`)
}

const contract = existsSync(contractPath) ? read(contractPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const packageJson = existsSync(packagePath) ? read(packagePath) : ''
const measure = existsSync(measurePath) ? read(measurePath) : ''
const test = existsSync(testPath) ? read(testPath) : ''

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

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('AI game/film production contract gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`AI game/film production contract gate passed (${checks.length} checks).`)
