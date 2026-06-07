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

const runner = 'scripts/run-v29-runtime-failure-smoke-runner.mjs'
const check = 'scripts/check-v29-runtime-failure-smoke-runner.mjs'
const shell = 'components/ide/ModernIDEShell.tsx'
const panels = 'components/ide/modern-shell/ModernIDEShellPanels.tsx'
const errors = 'components/error/ErrorBoundary.tsx'
const pkg = JSON.parse(read('package.json') || '{}')

for (const token of [
  'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER',
  'ide-modern-shell-region-boundary',
  'preview-canonical-fallback-surface',
  'aethelRuntimeFailureSmoke=ide-region-crash-isolated',
  'aethelRuntimeFailureSmoke=preview-render-fallback',
  '[data-modern-ide-shell="true"]',
  '[data-aethel-editor-error-boundary="active"]',
  '[data-aethel-panel-error-boundary]',
  "'output', 'playwright', 'v29-runtime-failure-smoke'",
  'error boundary receipt:preview-render-adapter',
  'receipt mismatch expected=',
  'marketClaimAllowed: false',
  'releaseReady: false',
  'AUTH_TOKEN_MISSING',
  'PLAYWRIGHT_MISSING',
]) {
  requireToken(runner, token)
}

requireToken(shell, 'data-modern-ide-shell="true"', 'ModernIDEShell browser mount marker')
requireToken(panels, 'RuntimeFailureSmokeFault', 'runtime smoke fault injector')
requireToken(panels, 'AETHEL_RUNTIME_FAILURE_SMOKE', 'controlled runtime smoke error marker')
requireToken(panels, 'ide-region-crash-isolated', 'IDE crash scenario injection')
requireToken(panels, 'preview-render-fallback', 'preview fallback scenario injection')
requireToken(errors, 'data-aethel-editor-error-boundary="active"', 'editor error boundary receipt selector')
requireToken(errors, 'data-aethel-panel-error-boundary={panelName}', 'panel error boundary receipt selector')
requireToken(errors, 'getRuntimeFailureSmokeReceipt', 'scenario-specific smoke receipt resolver')
requireToken(errors, 'error boundary receipt:preview-render-adapter', 'preview adapter receipt')
requireToken(errors, 'data-aethel-runtime-failure-smoke-receipt', 'error-boundary receipt attribute')

requirePattern(runner, /page\.locator\(harness\.shellSelector\)\.waitFor/, 'shell mounted assertion')
requirePattern(runner, /page\.locator\(harness\.receiptSelector\)/, 'receipt selector assertion')
requirePattern(runner, /result\.receipt === result\.expectedReceipt/, 'strict receipt equality assertion')
requirePattern(runner, /page\.screenshot\(\{ path: screenshot/, 'screenshot receipt capture')
requirePattern(runner, /fs\.writeFileSync\(path\.join\(OUTPUT_DIR, 'index\.json'\)/, 'runner report persistence')

if (pkg.scripts?.['qa:v29-runtime-failure-smoke-runner'] !== 'node scripts/check-v29-runtime-failure-smoke-runner.mjs') {
  failures.push('package.json: missing qa:v29-runtime-failure-smoke-runner script')
}

if (pkg.scripts?.['runtime:v29-failure-smoke'] !== 'node scripts/run-v29-runtime-failure-smoke-runner.mjs') {
  failures.push('package.json: missing runtime:v29-failure-smoke script')
}

requireToken('scripts/check-v29-total-spine.mjs', 'check-v29-runtime-failure-smoke-runner.mjs', 'V29 total runner gate')
requireToken(check, 'AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER', 'self-check capability token')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-runner] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-runner] PASS executable=playwright hooks=ide+preview')
