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

const file = 'lib/runtime/runtime-failure-smoke-runner-report.ts'
const test = '__tests__/runtime/runtime-failure-smoke-runner-report.test.ts'
const runner = 'scripts/run-v29-runtime-failure-smoke-runner.mjs'
const pkg = JSON.parse(read('package.json') || '{}')

for (const token of [
  'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER',
  'RuntimeFailureSmokeBrowserRunnerReport',
  'RuntimeFailureSmokeBrowserRunnerResult',
  'buildRuntimeFailureSmokeBrowserRunnerReport',
  'validateRuntimeFailureSmokeBrowserRunnerReport',
  'buildRuntimeFailureSmokeBrowserRunnerEvidenceRefs',
  'strictReceiptMatchCount',
  'runtime-failure-smoke-browser:',
  'runtime-failure-smoke-browser-screenshot:',
  'runtime-failure-smoke-browser-receipt:',
  'output/playwright/v29-runtime-failure-smoke/',
  'marketClaimAllowed !== false',
  'releaseReady !== false',
]) {
  requireToken(file, token)
}

requirePattern(file, /receipt !== result\.expectedReceipt/, 'strict result receipt validation')
requirePattern(file, /strictReceiptMatchCount !== report\.harnessCount/, 'all receipts must match validation')
requirePattern(file, /route\.includes\('aethelRuntimeFailureSmoke='\)/, 'runtime smoke route validation')
requirePattern(file, /screenshot\.startsWith\('output\/playwright\/v29-runtime-failure-smoke\/'\)/, 'screenshot output guard')

requireToken(test, 'builds a strict report with screenshot and receipt evidence refs', 'strict report test')
requireToken(test, 'rejects mismatched receipts and fake release readiness', 'mismatch rejection test')

for (const token of [
  'strictReceiptMatch',
  'strictReceiptMatchCount',
  'buildResultEvidenceRefs',
  'evidenceRefs: unique(results.flatMap',
]) {
  requireToken(runner, token, `runner emits ${token}`)
}

if (pkg.scripts?.['qa:v29-runtime-failure-smoke-runner-report'] !== 'node scripts/check-v29-runtime-failure-smoke-runner-report.mjs') {
  failures.push('package.json: missing qa:v29-runtime-failure-smoke-runner-report script')
}

requireToken('scripts/check-v29-total-spine.mjs', 'check-v29-runtime-failure-smoke-runner-report.mjs', 'V29 total runner report gate')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-runner-report] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-runner-report] PASS schema=strict receipts=evidence')
