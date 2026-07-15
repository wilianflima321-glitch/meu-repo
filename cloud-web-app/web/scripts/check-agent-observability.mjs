#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }

  const content = read(relativePath)
  if (!pattern.test(content)) {
    failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
  }
}

function forbidPattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) return
  const content = read(relativePath)
  if (pattern.test(content)) failures.push(`${relativePath}: forbidden pattern ${pattern} (${reason})`)
}

const routeFiles = [
  'app/api/ai/agents/route.ts',
  'app/api/ai/agents/executions/route.ts',
  'app/api/ai/agents/metrics/route.ts',
]

requireFile('lib/server/agent-observability.ts', 'agent observability must summarize persisted runtime snapshots')
requirePattern('lib/server/agent-observability.ts', /buildAgentOverview/, 'overview builder must exist')
requirePattern('lib/server/agent-observability.ts', /buildAgentMetrics/, 'metrics builder must exist')
requirePattern('lib/server/agent-observability.ts', /costModel:\s*'agent-store-does-not-meter-token-usage-yet'/, 'unmetered token/cost economics must be explicit')
requirePattern('lib/server/agent-store.ts', /listAgentSnapshots/, 'routes must read the persisted local agent store')

for (const route of routeFiles) {
  requirePattern(route, /listAgentSnapshots/, 'agent route must use persisted snapshots instead of static baselines')
  requirePattern(route, /capabilityStatus:\s*'READY'/, 'agent route must expose real readiness after store-backed implementation')
  requirePattern(route, /retention:\s*'local-agent-store'/, 'agent route must disclose persisted-retention source')
  forbidPattern(route, /blockIfSimulationDisabled/, 'store-backed agent observability must not be gated as unimplemented')
  forbidPattern(route, /baseline telemetry only/, 'baseline-only telemetry would hide real agent state')
  forbidPattern(route, /capabilityStatus:\s*'PARTIAL'/, 'agent observability should no longer report partial baseline state')
}

requireFile('__tests__/server/agent-observability.test.ts', 'pure summary helpers need tests')
requireFile('__tests__/api/ai-agents-observability-routes.test.ts', 'API routes need persisted snapshot tests')
requirePattern('package.json', /qa:agent-observability/, 'enterprise gate must include agent observability')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:agent-observability/, 'enterprise gate must run agent observability before release')
requirePattern('scripts/check-product-quality-progress.mjs', /agent-observability/, 'product quality gate must know agent observability is required')

if (failures.length) {
  console.error('[agent-observability] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-observability] PASS persisted agent overview, executions, and metrics are wired')
