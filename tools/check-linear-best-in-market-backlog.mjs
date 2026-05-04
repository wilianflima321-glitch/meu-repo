import { existsSync, readFileSync } from 'node:fs'

const jsonPath = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json'
const mdPath = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_BACKLOG.md'
const benchmarkPath = 'docs/master/107_AETHEL_BEST_IN_MARKET_BENCHMARK_2026-05-04.md'
const packagePath = 'package.json'
const creatorPath = 'tools/linear-create-best-in-market-backlog.mjs'
const createPlanPath = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PLAN.md'
const createPayloadPath = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_CREATE_PAYLOAD.jsonl'
const syncReportPath = 'docs/master/linear/AETHEL_BEST_IN_MARKET_2026_2027_LINEAR_SYNC_REPORT.md'

const checks = []

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

function read(path) {
  return readFileSync(path, 'utf8')
}

for (const path of [jsonPath, mdPath, benchmarkPath, packagePath, creatorPath, createPlanPath, createPayloadPath, syncReportPath]) {
  assert(existsSync(path), `${path} exists`)
}

let backlog = null
const rawJson = existsSync(jsonPath) ? read(jsonPath) : '{}'
try {
  backlog = JSON.parse(rawJson)
  assert(true, 'Linear backlog JSON parses')
} catch (error) {
  assert(false, `Linear backlog JSON parses: ${error.message}`)
}

const md = existsSync(mdPath) ? read(mdPath) : ''
const benchmark = existsSync(benchmarkPath) ? read(benchmarkPath) : ''
const packageJson = existsSync(packagePath) ? read(packagePath) : ''
const creator = existsSync(creatorPath) ? read(creatorPath) : ''
const createPlan = existsSync(createPlanPath) ? read(createPlanPath) : ''
const createPayload = existsSync(createPayloadPath) ? read(createPayloadPath) : ''
const syncReport = existsSync(syncReportPath) ? read(syncReportPath) : ''

if (backlog) {
  assert(backlog.schemaVersion === 'aethel-linear-backlog/v1', 'Linear backlog schema version is canonical')
  assert(backlog.status === 'ready_for_linear_creation', 'Linear backlog status is ready_for_linear_creation')
  assert(backlog.project?.name === 'Aethel Best-In-Market 2026-2027', 'Linear backlog project name is canonical')
  assert(backlog.connectionStatus?.linearToolsAvailableInSession === false, 'Linear backlog records unavailable Linear tools truthfully')

  const requiredLabels = [
    'benchmark',
    'studio-home',
    'agent-fleet',
    'repository-cartography',
    'game-film',
    'viewport',
    'browser-operator',
    'enterprise',
    'performance',
    'mobile',
    'design-system',
  ]
  const labelNames = new Set((backlog.labels ?? []).map((label) => label.name))
  for (const label of requiredLabels) {
    assert(labelNames.has(label), `Linear backlog includes label ${label}`)
  }

  const requiredEpics = [
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
  ]
  const epics = backlog.epics ?? []
  const epicTitles = new Set(epics.map((epic) => epic.title))
  for (const epic of requiredEpics) {
    assert(epicTitles.has(epic), `Linear backlog includes epic ${epic}`)
  }

  assert(epics.length === 10, 'Linear backlog has exactly 10 canonical epics')
  assert(epics.filter((epic) => epic.priority === 'P0').length >= 3, 'Linear backlog has at least three P0 epics')

  const issues = epics.flatMap((epic) => epic.issues ?? [])
  assert(issues.length >= 30, 'Linear backlog has at least 30 concrete issues')

  for (const epic of epics) {
    assert(Array.isArray(epic.acceptanceCriteria) && epic.acceptanceCriteria.length >= 3, `${epic.title} has acceptance criteria`)
    assert(Array.isArray(epic.issues) && epic.issues.length >= 2, `${epic.title} has child issues`)
    for (const label of epic.labels ?? []) {
      assert(labelNames.has(label), `${epic.title} uses known label ${label}`)
    }
  }

  for (const issue of issues) {
    assert(/^BIM-\d{3}$/.test(issue.key), `${issue.title} has a canonical issue key`)
    assert(['P0', 'P1', 'P2'].includes(issue.priority), `${issue.key} has valid priority`)
    assert(Number.isInteger(issue.estimate) && issue.estimate > 0, `${issue.key} has positive estimate`)
    assert(Array.isArray(issue.acceptanceCriteria) && issue.acceptanceCriteria.length > 0, `${issue.key} has acceptance criteria`)
    assert(typeof issue.epicKey === 'string' && issue.epicKey.startsWith('BIM-EPIC-'), `${issue.key} is linked to an epic`)
  }

  for (const phrase of [
    'Nanite, Lumen, Unreal parity',
    'chat become the product spine',
    'external assets as safe',
    'logged-in browser actions',
  ]) {
    assert(backlog.redLines?.some((line) => line.includes(phrase)), `Linear backlog red lines include ${phrase}`)
  }
}

for (const phrase of [
  'READY_FOR_LINEAR_CREATION',
  'npm run linear:best-in-market:dry-run',
  'npm run linear:best-in-market:create',
  'AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json',
]) {
  assert(md.includes(phrase), `Linear markdown playbook includes "${phrase}"`)
}

assert(
  benchmark.includes('AETHEL_BEST_IN_MARKET_2026_2027_BACKLOG.linear.json'),
  'Benchmark doc links the machine-readable Linear backlog'
)
assert(
  packageJson.includes('qa:linear-best-in-market-backlog') &&
    packageJson.includes('check-linear-best-in-market-backlog.mjs'),
  'root package exposes Linear backlog gate'
)
assert(
  packageJson.includes('linear:best-in-market:dry-run') &&
    packageJson.includes('linear-create-best-in-market-backlog.mjs'),
  'root package exposes Linear dry-run creator'
)
assert(
  packageJson.includes('linear:best-in-market:create') &&
    packageJson.includes('--execute --create-labels'),
  'root package exposes explicit Linear creation command'
)
assert(
  packageJson.includes('check-best-in-market-benchmark.mjs && node tools/check-linear-best-in-market-backlog.mjs'),
  'product quality progress runs Linear backlog gate after benchmark gate'
)
for (const phrase of [
  'Safe by default',
  'LINEAR_API_KEY',
  'LINEAR_ACCESS_TOKEN',
  'LINEAR_TEAM_ID',
  'LINEAR_TEAM_KEY',
  '--execute',
  'IssueCreateInput',
  'IssueLabelCreateInput',
]) {
  assert(creator.includes(phrase), `Linear creator script includes "${phrase}"`)
}
assert(createPlan.includes('Status: DRY_RUN_READY'), 'Linear dry-run report is current')
assert(createPlan.includes('Planned Operations'), 'Linear dry-run report lists planned operations')
assert(createPayload.split('\n').filter(Boolean).length >= 50, 'Linear JSONL creation payload has at least 50 operations')
for (const phrase of [
  'Status: SYNCED_TO_LINEAR',
  'Project URL: https://linear.app/aethel-meu-repo/project/aethel-best-in-market-2026-2027-640e25cb2dd1',
  'Epic parent issues: 10',
  'Child issues: 35',
  'Total project issues created: 45',
  'AET-49',
  'AET-93',
]) {
  assert(syncReport.includes(phrase), `Linear sync report includes "${phrase}"`)
}

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Linear best-in-market backlog gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Linear best-in-market backlog gate passed (${checks.length} checks).`)
