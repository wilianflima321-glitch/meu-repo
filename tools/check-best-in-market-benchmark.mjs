import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const docPath = 'docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md'
const triagePath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md'
const checklistPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md'
const packagePath = 'package.json'
const testPath = 'cloud-web-app/web/__tests__/docs/best-in-market-benchmark.test.ts'

for (const path of [docPath, packagePath, testPath]) {
  assert(existsSync(path), `${path} exists`)
}

const doc = existsSync(docPath) ? read(docPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const packageJson = existsSync(packagePath) ? read(packagePath) : ''
const test = existsSync(testPath) ? read(testPath) : ''

for (const phrase of [
  'AETHEL_BEST_IN_MARKET_BENCHMARK',
  'external V13 audit is treated as historical input',
  '`console.log/info/debug`: 0',
  'hardcoded hex in component TSX: 0',
  'explicit `: any` in app code: 0',
  'component files over 1000 lines: 0',
  'unit/spec tests: 87',
  'e2e specs: 15',
  'Prisma migrations: present',
  'Deploy UI: present',
  'Project Brain: present',
  'Mission Ledger: present',
  'Repository Cartography: present',
]) {
  assert(doc.includes(phrase), `benchmark doc includes current-state phrase "${phrase}"`)
}

for (const competitor of [
  'Cursor 3',
  'Replit Agent 4',
  'Figma MCP',
  'Manus',
  'Genspark',
  'Unreal UE5',
  'Adobe Firefly/Premiere',
  'Linear',
]) {
  assert(doc.includes(competitor), `benchmark doc covers competitor ${competitor}`)
}

for (const category of [
  'Game creation',
  'Film, animation, storytelling',
  'Apps and tools',
  'Music and audio',
  'Research agentic + web navigation',
  'Super personal agent',
  'End-to-end experience',
  'Collaboration and versioning',
  'Billing, transparency, enterprise',
  'Performance, monorepo, scale',
]) {
  assert(doc.includes(category), `benchmark doc covers category ${category}`)
}

for (const phrase of [
  'Firebase Studio canvas prompt reference',
  'Cursor 3 agents reference',
  'Design canvas infinite',
  'Aethel IDE main',
  'Adobe creative agents',
  'Genspark workspace',
]) {
  assert(doc.includes(phrase), `benchmark doc covers visual reference ${phrase}`)
}

for (const epic of [
  'Benchmark V14 Canonical Audit',
  'Agent Fleet + Repository Cartography',
  'Studio Home Mission-First Experience',
  'Game/Film Viewport Authority',
  'Design Canvas + Figma MCP Parity',
  'Browser Operator Manus-Style Approvals',
  'Realtime Collaboration + Versioning',
  'Adobe-Style Creative Media Pipeline',
  'Enterprise Trust/Billing Readiness',
  'Performance, Monorepo, Local Runtime Scale',
]) {
  assert(doc.includes(epic), `benchmark doc includes Linear epic ${epic}`)
}

for (const source of [
  'https://cursor.com/changelog/3-0',
  'https://blog.replit.com/introducing-agent-4-built-for-creativity',
  'https://developers.figma.com/docs/figma-mcp-server/local-server-installation/',
  'https://blog.adobe.com/en/publish/2026/04/15/adobe-extends-leadership-video-unleashing-new-ai-powered-creation-firefly-reinventing-color-editors-premiere',
  'https://dev.epicgames.com/documentation/unreal-engine/nanite-virtualized-geometry-in-unreal-engine',
  'https://dev.epicgames.com/documentation/en-us/unreal-engine/lumen-global-illumination-and-reflections-in-unreal-engine',
  'https://linear.app/docs',
]) {
  assert(doc.includes(source), `benchmark doc cites source ${source}`)
}

for (const forbidden of [
  /console\.\*` em `lib\/` \| 876/,
  /: any types\s*\|\s*899/,
  /Hex hardcoded\s*\|\s*700/,
  /God components > 1k lin\s*\|\s*37/,
  /Tests\s*\|\s*12 unit \+ 7 E2E/,
  /Prisma migrations\s*\|\s*ausente/,
  /DeployButton.*ausente/i,
  /Nanite\/Lumen parity no browser/i,
  /autonomous AAA completion is live/i,
  /Premiere parity is implemented/i,
]) {
  assert(!forbidden.test(doc), `benchmark doc avoids stale or inflated claim ${forbidden}`)
}

assert(packageJson.includes('qa:best-in-market-benchmark'), 'root package exposes qa:best-in-market-benchmark')
assert(packageJson.includes('check-best-in-market-benchmark.mjs'), 'product quality progress runs best-in-market benchmark gate')
assert(test.includes('Best-In-Market Benchmark') && test.includes('Cursor 3'), 'web test covers benchmark doc')
assert(
  triage.includes('Best-In-Market Benchmark V14') || checklist.includes('Best-In-Market Benchmark V14'),
  'triage or checklist records benchmark V14 gate'
)

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Best-in-market benchmark gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Best-in-market benchmark gate passed (${checks.length} checks).`)
