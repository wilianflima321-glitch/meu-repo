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

const file = 'lib/runtime/runtime-failure-smoke-pack.ts'
const test = '__tests__/runtime/runtime-failure-smoke-pack.test.ts'

for (const token of [
  'AETHEL_RUNTIME_FAILURE_SMOKE_PACK',
  'RuntimeFailureSmokeScenario',
  'RuntimeFailureSmokeScenarioResult',
  'buildRuntimeFailureSmokePackReport',
  'validateRuntimeFailureSmokePackReport',
  'ide-region-crash-isolated',
  'preview-render-fallback',
  'agent-tool-retry-held',
  'research-browser-takeover',
  'studio-local-crash-loop',
  'cloud-render-teardown',
  'publish-rollback',
  'buildRuntimeResilienceLedger',
  'validateRuntimeResilienceLedger',
  'marketClaimAllowed: false',
]) {
  requireToken(file, token)
}

requirePattern(file, /'research-browser-takeover'[\s\S]*'takeover-requested'[\s\S]*'takeover-control'/, 'research takeover scenario')
requirePattern(file, /'studio-local-crash-loop'[\s\S]*'crash-loop'[\s\S]*'hold-for-human-review'/, 'desktop crash-loop scenario')
requirePattern(file, /'cloud-render-teardown'[\s\S]*'teardown-completed'[\s\S]*'cost-cap-receipt'/, 'cloud teardown scenario')
requirePattern(file, /marketClaimAllowed !== false/, 'validator blocks market claims')
requireToken(test, 'keeps takeover and desktop crash scenarios as governed failures', 'critical failure test')
requireToken(test, 'supports receipt-backed recovery without allowing market claims', 'receipt-backed recovery test')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-pack] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-pack] PASS scenarios=7 ledger=required claims=blocked')
