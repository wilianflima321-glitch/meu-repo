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

function requireFile(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`${rel}: missing`)
}

function requireToken(rel, token, label = token) {
  if (!read(rel).includes(token)) failures.push(`${rel}: missing ${label}`)
}

function requirePattern(rel, pattern, label) {
  if (!pattern.test(read(rel))) failures.push(`${rel}: missing ${label}`)
}

const file = 'lib/runtime/runtime-failure-smoke-harness.ts'
const test = '__tests__/runtime/runtime-failure-smoke-harness.test.ts'

requireFile('components/ide/ModernIDEShell.tsx')
requireFile('components/preview/CanonicalPreviewSurface.tsx')
requireToken('components/error/ErrorBoundary.tsx', 'getRuntimeFailureSmokeReceipt', 'scenario-specific smoke receipt resolver')
requireToken('components/error/ErrorBoundary.tsx', 'error boundary receipt:preview-render-adapter', 'preview scenario receipt')

for (const token of [
  'AETHEL_RUNTIME_FAILURE_SMOKE_HARNESS',
  'RuntimeFailureSmokeHarness',
  'RuntimeFailureSmokeHarnessReport',
  'buildRuntimeFailureSmokeHarnessReport',
  'validateRuntimeFailureSmokeHarnessReport',
  'ide-modern-shell-region-boundary',
  'preview-canonical-fallback-surface',
  'components/ide/ModernIDEShell.tsx',
  'components/preview/CanonicalPreviewSurface.tsx',
  'fixture:ide:error-boundary-region-crash',
  'fixture:preview:canonical-fallback',
  'harness:modern-ide-shell-mounted',
  'harness:canonical-preview-surface-mounted',
  'manualRunnerRequired',
  'runner-ready',
  'runnerCommand',
  'npm run runtime:v29-failure-smoke',
  'marketClaimAllowed: false',
]) {
  requireToken(file, token)
}

requirePattern(file, /id: 'ide-modern-shell-region-boundary'[\s\S]*error boundary receipt:ide-editor-region/, 'IDE error-boundary receipt')
requirePattern(file, /id: 'ide-modern-shell-region-boundary'[\s\S]*crash state receipt:ide-region-isolated/, 'IDE crash-state receipt')
requirePattern(file, /id: 'preview-canonical-fallback-surface'[\s\S]*error boundary receipt:preview-render-adapter/, 'preview error-boundary receipt')
requirePattern(file, /id: 'preview-canonical-fallback-surface'[\s\S]*performance trace receipt:preview-fallback-frame-budget/, 'preview performance trace receipt')
requirePattern(file, /harnessCount !== 2/, 'two-harness validation')
requirePattern(file, /runnerReadyCount !== 2/, 'runner-ready validation')
requirePattern(file, /needsRunnerCount !== 0/, 'missing-runner regression validation')

requireToken(test, 'declares canonical IDE and preview harness contracts without market claims', 'harness no-market-claims test')
requireToken(test, "runnerCommand).toBe('npm run runtime:v29-failure-smoke')", 'executable runner command test')
requireToken(test, 'maps ModernIDEShell and CanonicalPreviewSurface to replayable smoke fixtures', 'canonical harness mapping test')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-harness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-harness] PASS harnesses=2 runner=ready live-server=required')
