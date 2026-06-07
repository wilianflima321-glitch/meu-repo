#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(rel) {
  const absolute = path.join(ROOT, rel)
  if (!fs.existsSync(absolute)) {
    failures.push(`${rel}: missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function requireToken(rel, token, label = token) {
  if (!read(rel).includes(token)) failures.push(`${rel}: missing ${label}`)
}

function requirePattern(rel, pattern, label) {
  if (!pattern.test(read(rel))) failures.push(`${rel}: missing ${label}`)
}

const route = 'app/api/runtime/best-market-internal-spine/route.ts'
const packageJson = JSON.parse(read('package.json'))

for (const token of [
  'buildRuntimeFailureSmokePackReport',
  'validateRuntimeFailureSmokePackReport',
  'requireAuth',
  'requireEntitlementsForUser',
  'createComponentLogger',
  'marketClaimAllowed: false',
  'releaseReady: false',
  'manualPublishRequired: true',
  'x-aethel-capability',
  'x-aethel-capability-status',
  'x-aethel-market-claim-allowed',
  'x-aethel-release-ready',
  'export async function GET',
  'export async function POST',
  "mode') === 'runtime-failure-smoke-pack",
  'readEvidenceOverrides',
  'useCanonicalFixtures',
]) {
  requireToken(route, token)
}

requirePattern(route, /capabilityStatus\s*=\s*validationErrors\.length > 0 \? 'blocked' : 'needs-review'/, 'blocked/needs-review status policy')
requirePattern(route, /logger\.info\('runtime_failure_smoke_pack\.generated'/, 'generated audit log')
requirePattern(route, /logger\.error\('runtime_failure_smoke_pack\.get_failed'/, 'GET error log')
requirePattern(route, /logger\.error\('runtime_failure_smoke_pack\.post_failed'/, 'POST error log')

if (packageJson.scripts?.['qa:v29-runtime-failure-smoke-api'] !== 'node scripts/check-v29-runtime-failure-smoke-api.mjs') {
  failures.push('package.json: missing qa:v29-runtime-failure-smoke-api script')
}
if (!read('scripts/check-v29-total-spine.mjs').includes('check-v29-runtime-failure-smoke-api.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include runtime failure smoke API gate')
}

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-api] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-api] PASS protected=true endpoint=best-market-internal-spine methods=GET+POST claims=blocked')
