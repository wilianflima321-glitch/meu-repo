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

const ledger = 'lib/runtime/runtime-resilience-ledger.ts'
const test = '__tests__/runtime/runtime-resilience-ledger.test.ts'

for (const token of [
  'AETHEL_RUNTIME_RESILIENCE_LEDGER',
  'RuntimeResilienceLedgerEvent',
  'RuntimeResilienceLedgerSummary',
  'buildRuntimeResilienceLedger',
  'validateRuntimeResilienceLedger',
  'region-error',
  'crash-loop',
  'retry-attempted',
  'fallback-activated',
  'rollback-applied',
  'takeover-requested',
  'teardown-completed',
  'human-review-recorded',
  'autonomous execution ready',
  'desktop ready',
  'native renderer ready',
  'cloud render available',
  'research verified',
  'production ready',
]) {
  requireToken(ledger, token)
}

requirePattern(ledger, /'takeover-requested': \['takeover-control-receipt', 'browser-replay-receipt'\]/, 'takeover evidence requirements')
requirePattern(ledger, /'teardown-completed': \['teardown-receipt', 'cost-cap-receipt'\]/, 'cloud teardown evidence requirements')
requirePattern(ledger, /readyForStrongerClaims[\s\S]*criticalCount === 0[\s\S]*missingEvidenceCount === 0/, 'stronger claim guard')
requireToken(test, 'keeps cloud render governed by teardown and cost-cap evidence', 'cloud governance test')
requireToken(test, 'allows stronger claims only when every receipt is present', 'positive receipt test')

if (failures.length) {
  console.error('[v29-runtime-resilience-ledger] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-resilience-ledger] PASS events=8 blocked-claims=6 receipts=required')
