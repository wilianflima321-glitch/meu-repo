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

const file = 'lib/runtime/runtime-failure-smoke-fixtures.ts'
const test = '__tests__/runtime/runtime-failure-smoke-fixtures.test.ts'

for (const token of [
  'AETHEL_RUNTIME_FAILURE_SMOKE_FIXTURES',
  'RuntimeFailureSmokeFixture',
  'RuntimeFailureSmokeFixtureReport',
  'buildRuntimeFailureSmokeFixtureReport',
  'validateRuntimeFailureSmokeFixtureReport',
  'fixture:ide:error-boundary-region-crash',
  'fixture:preview:canonical-fallback',
  'fixture:agent:bounded-tool-retry',
  'fixture:research:browser-takeover',
  'fixture:desktop:sidecar-crash-loop',
  'fixture:cloud:teardown-cost-cap',
  'fixture:publish:rollback-checkpoint',
  'evidenceOverrideMap',
  'replayableCount',
  'persistableCount',
]) {
  requireToken(file, token)
}

requirePattern(file, /scenarioId: 'research-browser-takeover'[\s\S]*takeover control receipt/, 'research fixture takeover receipt')
requirePattern(file, /scenarioId: 'cloud-render-teardown'[\s\S]*cost cap receipt/, 'cloud fixture cost-cap receipt')
requirePattern(file, /scenarioId: 'studio-local-crash-loop'[\s\S]*crash state receipt/, 'desktop fixture crash-state receipt')
requireToken(test, 'can drive smoke packs with fixture evidence overrides', 'fixture-driven smoke pack test')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-fixtures] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-fixtures] PASS fixtures=7 replayable=true persistable=true')
