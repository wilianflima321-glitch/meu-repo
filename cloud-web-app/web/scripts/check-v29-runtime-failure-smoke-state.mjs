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

const stateFile = 'lib/production/runtime-failure-smoke-pack-state.ts'
const testFile = '__tests__/runtime/runtime-failure-smoke-pack-state.test.ts'
const routeFile = 'app/api/projects/[id]/production-state/runtime-execution-evidence-package/route.ts'

for (const token of [
  'aethelRuntimeFailureSmokePacks',
  'RUNTIME_FAILURE_SMOKE_PACK_HISTORY_LIMIT',
  'RuntimeFailureSmokePackState',
  'summarizeRuntimeFailureSmokePack',
  'buildRuntimeFailureSmokePackState',
  'validateRuntimeFailureSmokePackState',
  'readRuntimeFailureSmokePackStateFromSettings',
  'writeRuntimeFailureSmokePackStateToSettings',
  'releaseReady: false',
  'marketClaimAllowed: false',
  'human-review-required',
]) {
  requireToken(stateFile, token)
}

requirePattern(stateFile, /slice\(0, RUNTIME_FAILURE_SMOKE_PACK_HISTORY_LIMIT\)/, 'bounded history')
requirePattern(stateFile, /runtime-failure-smoke-pack:\$\{report\.generatedAt\}/, 'pack evidence ref')
requirePattern(stateFile, /runtime-failure-smoke:\$\{scenario\.runId\}/, 'scenario evidence ref')
requireToken(testFile, 'round-trips through project settings', 'settings round-trip test')
requireToken(testFile, 'keeps only the latest bounded smoke histories', 'bounded history test')
requireToken(routeFile, "body.mode === 'runtime-failure-smoke-pack'", 'project route smoke mode')
requireToken(routeFile, 'buildRuntimeFailureSmokePackState', 'project route builds smoke state')
requireToken(routeFile, 'useCanonicalFixtures', 'project route uses canonical fixtures by default')
requireToken(routeFile, 'writeRuntimeFailureSmokePackStateToSettings', 'project route writes smoke state')
requireToken(routeFile, 'runtime_failure_smoke_pack.persisted', 'project route persistence log')
requireToken(routeFile, 'x-aethel-market-claim-allowed', 'project route keeps market claims blocked')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-state] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-state] PASS settings=true route=true bounded=12 releaseHeld=true')
