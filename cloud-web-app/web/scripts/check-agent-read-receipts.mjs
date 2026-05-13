#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
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

requireFile('lib/production/agent-read-receipts.ts', 'agent read receipt contract must exist')
requirePattern('lib/production/agent-read-receipts.ts', /evaluateAgentReadinessForApply/, 'readiness evaluator must gate apply decisions')
requirePattern('lib/production/agent-read-receipts.ts', /repository-cartography/, 'agents must acknowledge repository cartography')
requirePattern('lib/production/agent-read-receipts.ts', /research-intelligence/, 'agents must acknowledge external research packets')
requirePattern('lib/production/agent-read-receipts.ts', /AGENT_READ_RECEIPTS_SURFACE_UNREAD/, 'target surfaces must be acknowledged before apply')
requirePattern('lib/production/agent-read-receipts.ts', /senior coordinator agent/i, 'coordinator receipts must satisfy delegated agents')

requireFile('app/api/projects/[id]/production-state/read-receipts/route.ts', 'read receipt state must have a production-state API route')
requirePattern('app/api/projects/[id]/production-state/read-receipts/route.ts', /writeAgentReadReceiptStateToSettings/, 'read receipt API must persist receipts')
requirePattern('app/api/projects/[id]/production-state/read-receipts/route.ts', /evaluateAgentReadinessForApply/, 'read receipt API must return readiness decisions')
requirePattern('app/api/projects/[id]/production-state/read-receipts/route.ts', /buildProductionReadinessSummary/, 'read receipt API must keep Mission Ledger readiness visible')

requirePattern('app/api/ai/change/apply/route.ts', /enforceReadReceipts/, 'apply route must accept explicit read receipt enforcement')
requirePattern('app/api/ai/change/apply/route.ts', /evaluateAgentReadinessForApply/, 'apply route must evaluate read receipt readiness')
requirePattern('app/api/ai/change/apply/route.ts', /readRepositoryCartographyManifestFromSettings/, 'apply route must load Repository Cartography from project settings')
requirePattern('app/api/ai/change/apply/route.ts', /readResearchIntelligencePacketFromSettings/, 'apply route must load Research Intelligence from project settings')
requirePattern('app/api/ai/change/apply/route.ts', /readReceiptIds/, 'successful apply metadata must include accepted read receipts')

requireFile('__tests__/production/agent-read-receipts.test.ts', 'unit tests must cover read receipt decisions')
requirePattern('__tests__/production/agent-read-receipts.test.ts', /AGENT_READ_RECEIPTS_CARTOGRAPHY_REQUIRED/, 'tests must cover missing cartography')
requirePattern('__tests__/production/agent-read-receipts.test.ts', /AGENT_READ_RECEIPTS_RESEARCH_BLOCKED/, 'tests must cover research blocker risks')
requirePattern('__tests__/production/agent-read-receipts.test.ts', /Producer Agent/, 'tests must cover coordinator delegated receipts')
requireFile('__tests__/api/production-state-read-receipts-route.test.ts', 'API tests must cover read receipt persistence')
requirePattern('__tests__/api/ai-change-apply-agent-scope-route.test.ts', /enforceReadReceipts/, 'apply tests must cover read receipt enforcement')
requirePattern('components/ai/AgentFleetCoordinatorStrip.tsx', /fetchReadReceipts/, 'Agent Fleet must surface read receipt readiness')
requirePattern('components/ai/AgentFleetCoordinatorStrip.tsx', /Agent read receipt details/, 'Agent Fleet must expose compact read receipt evidence')
requirePattern('components/ai/AgentFleetCoordinatorStrip.tsx', /Acknowledge context/, 'Coordinator must be able to acknowledge context receipts from the fleet strip')
requirePattern('__tests__/ai/AgentFleetCoordinatorStrip.test.tsx', /Acknowledge context/, 'Agent Fleet tests must cover read receipt acknowledgement')

requirePattern('package.json', /qa:agent-read-receipts/, 'package scripts must expose read receipt QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:agent-read-receipts/, 'enterprise gate must include read receipt QA')
requirePattern('scripts/check-product-quality-progress.mjs', /agent-read-receipts/, 'product quality gate must require read receipts')
requirePattern('scripts/check-no-fake-success.mjs', /AGENT_READ_RECEIPTS_CARTOGRAPHY_UNREAD/, 'fake-success gate must know read receipt status codes')

if (failures.length > 0) {
  console.error('[agent-read-receipts] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-read-receipts] PASS')
