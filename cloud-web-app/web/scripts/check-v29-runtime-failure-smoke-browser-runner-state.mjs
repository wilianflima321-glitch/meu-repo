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

const stateFile = 'lib/production/runtime-failure-smoke-browser-runner-state.ts'
const stateTest = '__tests__/runtime/runtime-failure-smoke-browser-runner-state.test.ts'
const evidencePackageFile = 'lib/production/runtime-execution-evidence-package.ts'
const packageRouteFile = 'app/api/projects/[id]/production-state/runtime-execution-evidence-package/route.ts'
const receiptsRouteFile = 'app/api/projects/[id]/production-state/runtime-job-receipts/route.ts'
const totalSpineGate = 'scripts/check-v29-total-spine.mjs'
const packageJson = JSON.parse(read('package.json'))

for (const token of [
  'RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY',
  'RuntimeFailureSmokeBrowserRunnerState',
  'RuntimeFailureSmokeBrowserRunnerStoredSummary',
  'buildRuntimeFailureSmokeBrowserRunnerState',
  'buildRuntimeFailureSmokeBrowserRunnerStateFromReport',
  'validateRuntimeFailureSmokeBrowserRunnerState',
  'readRuntimeFailureSmokeBrowserRunnerStateFromSettings',
  'writeRuntimeFailureSmokeBrowserRunnerStateToSettings',
  'releasePolicy',
  'human-review-required',
]) {
  requireToken(stateFile, token, `browser runner state token: ${token}`)
}

for (const token of [
  'buildRuntimeFailureSmokeBrowserRunnerStateFromReport',
  'validateRuntimeFailureSmokeBrowserRunnerState',
  'readRuntimeFailureSmokeBrowserRunnerStateFromSettings',
  'writeRuntimeFailureSmokeBrowserRunnerStateToSettings',
  'runtime-failure-smoke-browser-runner-report',
  'Runtime failure smoke browser runner report is required',
  'browserRunnerState',
  'x-aethel-market-claim-allowed',
  'releaseReady: false',
]) {
  requireToken(packageRouteFile, token, `package route token: ${token}`)
}

for (const token of [
  'RuntimeFailureSmokeBrowserRunnerState',
  'failureSmokeBrowserRunnerState',
  'runtime-failure-smoke-browser-runner-state:',
  'Runtime failure smoke browser runner state is missing from the evidence package.',
  'Runtime execution package must include failure smoke browser runner state.',
  'failure smoke browser runner evidence attached',
  'Runtime failure smoke browser runner receipts are incomplete.',
]) {
  requireToken(evidencePackageFile, token, `evidence package token: ${token}`)
}

for (const token of [
  'readRuntimeFailureSmokeBrowserRunnerStateFromSettings',
  'readRuntimeFailureSmokePackStateFromSettings',
  'failureSmokeBrowserRunnerState',
  'failureSmokePackState',
]) {
  requireToken(receiptsRouteFile, token, `receipts route token: ${token}`)
}

for (const token of [
  'buildRuntimeFailureSmokeBrowserRunnerStateFromReport',
  'writeRuntimeFailureSmokeBrowserRunnerStateToSettings',
  'RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY',
  'rejects incomplete browser runner receipts',
]) {
  requireToken(stateTest, token, `state test token: ${token}`)
}

requireToken(totalSpineGate, 'check-v29-runtime-failure-smoke-browser-runner-state.mjs', 'v29 total gate inclusion')
requireToken(totalSpineGate, 'gates=33', 'v29 gate count')

if (
  packageJson.scripts?.['qa:v29-runtime-failure-smoke-browser-runner-state'] !==
  'node scripts/check-v29-runtime-failure-smoke-browser-runner-state.mjs'
) {
  failures.push('package.json: missing qa:v29-runtime-failure-smoke-browser-runner-state script')
}

if (failures.length > 0) {
  console.error('[v29-runtime-failure-smoke-browser-runner-state] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-browser-runner-state] PASS state=true route=true evidencePackage=true releaseHeld=true')
