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
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

requireFile('lib/production/agent-workforce-topology.ts', 'agent squads need a canonical workforce topology')
requirePattern('lib/production/agent-workforce-topology.ts', /buildAgentWorkforceTopology/, 'must expose the canonical topology')
requirePattern('lib/production/agent-workforce-topology.ts', /planAgentWorkforceForMission/, 'must route missions to squads')
requirePattern('lib/production/agent-workforce-topology.ts', /evaluateAgentWorkforceTopologyReadiness/, 'must self-audit readiness')
requirePattern('lib/production/agent-workforce-topology.ts', /game-production/, 'game-production squad must exist')
requirePattern('lib/production/agent-workforce-topology.ts', /research-intelligence/, 'research squad must exist')
requirePattern('lib/production/agent-workforce-topology.ts', /browser-operations/, 'browser operator squad must exist')
requirePattern('lib/production/agent-workforce-topology.ts', /financial-account-safety/, 'investment/account safety squad must exist')
requirePattern('lib/production/agent-workforce-topology.ts', /Tool Bus/, 'all tools must route through the Agent Tool Bus')
requirePattern('lib/production/agent-workforce-topology.ts', /read receipts/, 'agent writes must require read receipts')
requirePattern('lib/production/agent-workforce-topology.ts', /scope locks/, 'parallel work must require scope locks')
requirePattern('lib/production/agent-workforce-topology.ts', /main thread/, 'heavy work must not run on the UI main thread')
requirePattern('lib/production/agent-workforce-topology.ts', /signed human approval/, 'high-risk actions must be human-held')
requirePattern('lib/production/agent-workforce-topology.ts', /recommendedParallelWorkers/, 'planning must budget worker count')
requirePattern('lib/production/agent-workforce-topology.ts', /metadata-first/, 'wide research must use metadata-first external mirrors')
requireFile('app/api/agents/workforce/plan/route.ts', 'workforce planner must be exposed through a compact API')
requirePattern('app/api/agents/workforce/plan/route.ts', /planAgentWorkforceForMission/, 'planner API must call canonical workforce planning')
requirePattern('app/api/agents/workforce/plan/route.ts', /evaluateAgentWorkforceTopologyReadiness/, 'planner API must expose topology readiness')
requirePattern('app/api/agents/workforce/plan/route.ts', /maxAgentsForPlan/, 'planner API must respect plan concurrency limits')
requirePattern('app/api/agents/stream/route.ts', /workforcePlan/, 'agent stream ready event must include workforce planning context')
requireFile('__tests__/production/agent-workforce-topology.test.ts', 'agent workforce topology tests must exist')
requirePattern('__tests__/production/agent-workforce-topology.test.ts', /God of War quality boss fight/, 'tests must cover AAA game routing')
requirePattern('__tests__/production/agent-workforce-topology.test.ts', /Manus wide research/, 'tests must cover wide research routing')
requirePattern('__tests__/production/agent-workforce-topology.test.ts', /stock account/, 'tests must cover investment human-held policy')
requireFile('__tests__/api/agents-workforce-plan-route.test.ts', 'workforce planner route tests must exist')
requirePattern('__tests__/api/agents-workforce-plan-route.test.ts', /Resident Evil quality survival horror/, 'route tests must cover game-production planning')
requirePattern('__tests__/api/agents-workforce-plan-route.test.ts', /invest in stocks/, 'route tests must cover investment planning')
requirePattern('package.json', /qa:agent-workforce-topology/, 'package scripts must expose workforce topology QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:agent-workforce-topology/, 'enterprise gate must include workforce topology QA')

if (failures.length > 0) {
  console.error('[agent-workforce-topology] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-workforce-topology] PASS')
