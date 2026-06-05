#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const spineFile = 'lib/runtime/best-market-internal-spine.ts'
const packageJson = JSON.parse(read('package.json'))
const spine = read(spineFile)
const routeFile = 'app/api/runtime/best-market-internal-spine/route.ts'

const domains = [
  'apps',
  'research',
  'agents',
  'games',
  'films',
  'viewport',
  'studio-local',
  'cloud-render',
  'export',
  'marketplace',
  'context-memory',
  'browser-operator',
]

requireToken(spineFile, 'AETHEL_BEST_MARKET_INTERNAL_SPINE', 'capability marker')
requireToken(spineFile, 'BEST_MARKET_INTERNAL_NO_FAKE_SUCCESS_RULES', 'no fake success rule matrix')
requireToken(spineFile, 'buildBestMarketInternalSpineReport', 'spine report builder')
requireToken(spineFile, 'validateBestMarketInternalSpineReport', 'spine report validator')
requireToken(spineFile, 'coerceBestMarketInternalSpineInputFromSearchParams', 'search param coercion')
requireToken(spineFile, 'domainCount', 'domain count metric')
requireToken(spineFile, 'heldOrBlockedDomainCount', 'held/blocked domain metric')
requireToken(spineFile, 'p0GapCount', 'P0 gap metric')
requireToken(spineFile, 'p1GapCount', 'P1 gap metric')
requireToken(spineFile, 'p2GapCount', 'P2 gap metric')
requireToken(spineFile, 'buildAethelToolchainReadinessSnapshot', 'toolchain readiness integration')
requireToken(spineFile, 'buildAgentRuntimeSpinePlan', 'agent runtime integration')
requireToken(spineFile, 'buildResearchRuntimeSpinePlan', 'research runtime integration')
requireToken(spineFile, 'buildContextMemorySpinePlan', 'context memory integration')
requireToken(spineFile, 'buildGameAssetQualityPipeline', 'asset quality integration')
requireToken(spineFile, 'buildExportPipelinePlan', 'export pipeline integration')
requireToken(routeFile, 'buildBestMarketInternalSpineReport', 'authenticated internal spine API')
requireToken(routeFile, 'coerceBestMarketInternalSpineInputFromSearchParams', 'API query input coercion')
requireToken(routeFile, 'requireEntitlementsForUser', 'entitlement guard')
requireToken(routeFile, 'x-aethel-capability-status', 'runtime capability status header')
requireToken(routeFile, 'x-aethel-domain-count', 'domain count header')
requireToken(routeFile, 'x-aethel-held-domains', 'held domain count header')

for (const domain of domains) {
  requirePattern(spineFile, new RegExp(`id:\\s*'${domain}'`), `domain ${domain}`)
}

const requiredEvidence = [
  'route contracts pass',
  'browser replay',
  'approval receipt',
  'bot playtest replay',
  'playback evidence',
  'asset quality ledger',
  'signed installer evidence',
  'session teardown',
  'license',
  'provenance',
  'takeover control',
]

for (const evidence of requiredEvidence) {
  requireToken(spineFile, evidence, `required evidence: ${evidence}`)
}

const requiredGuards = [
  'studio local must stay held/beta by default',
  'cloud render must stay held by default',
  'games must require playtest evidence',
  'films must require playback evidence',
  'browser operator must require takeover control',
]

for (const guard of requiredGuards) {
  requireToken(spineFile, guard, `validator guard: ${guard}`)
}

const scriptValue = packageJson.scripts?.['qa:best-market-internal-spine']
if (scriptValue !== 'node scripts/check-best-market-internal-spine.mjs') {
  failures.push('package.json: missing qa:best-market-internal-spine script')
}
if (!packageJson.scripts?.['qa:v28-total-spine']?.includes('qa:best-market-internal-spine')) {
  failures.push('package.json: qa:v28-total-spine must include qa:best-market-internal-spine')
}
if (!packageJson.scripts?.['qa:enterprise-gate']?.includes('qa:best-market-internal-spine')) {
  failures.push('package.json: qa:enterprise-gate must include qa:best-market-internal-spine')
}
if (!packageJson.scripts?.['qa:internal-runtime-priority-gate']?.includes('qa:best-market-internal-spine')) {
  failures.push('package.json: qa:internal-runtime-priority-gate must include qa:best-market-internal-spine')
}

const fakePromotionPattern = /(AAA pronto|Unreal-grade|final asset is available|Pixel Streaming available|installer signed by default|research verified by default)/i
if (fakePromotionPattern.test(spine)) {
  failures.push(`${spineFile}: contains forbidden unevidenced promotion copy`)
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'BEST_MARKET_INTERNAL_SPINE.md'),
  `# Best-Market Internal Spine

- Domains: ${domains.length}
- Required evidence checks: ${requiredEvidence.length}
- Validator guards: ${requiredGuards.length}
- Script wired: ${scriptValue === 'node scripts/check-best-market-internal-spine.mjs'}
- Runtime-priority gate wired: ${Boolean(packageJson.scripts?.['qa:internal-runtime-priority-gate']?.includes('qa:best-market-internal-spine'))}
- Failures: ${failures.length}

This gate protects internal robustness, not visual polish. It ensures Aethel keeps apps, research, agents, games, films, viewport, Studio Local, Cloud Render, export, marketplace, context memory, and browser operator behind evidence and honest claim ceilings.
`,
)

if (failures.length > 0) {
  console.error('[best-market-internal-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[best-market-internal-spine] PASS domains=${domains.length} evidence=${requiredEvidence.length} guards=${requiredGuards.length}`)
