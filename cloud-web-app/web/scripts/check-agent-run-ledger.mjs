#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

requirePattern('lib/server/agent-run-ledger.ts', /export type AgentRunLedgerEntry/, 'AgentRunLedgerEntry type')
requirePattern('lib/server/agent-run-ledger.ts', /AGENT_RUN_LEDGER_SETTINGS_KEY/, 'persisted settings key')
requirePattern('lib/server/agent-run-ledger.ts', /marketReadiness/, 'market readiness status')
requirePattern('lib/server/agent-run-ledger.ts', /responsibilityModel:\s*'human-owner-required'/, 'human owner responsibility model')
requirePattern('lib/server/agent-run-ledger.ts', /Evidence refs required before agent work can be trusted/, 'evidence is mandatory')
requirePattern('lib/server/agent-run-ledger.ts', /Branch or pull request artifact required/, 'reviewable branch or PR artifact is mandatory')
requirePattern('lib/server/agent-run-ledger.ts', /Preview, replay, or screenshot artifact required/, 'visual/product proof artifact is mandatory')
requirePattern('lib/server/agent-run-ledger.ts', /filterAgentSnapshotsForProject/, 'project-scoped run filtering')
requirePattern('lib/server/agent-run-ledger.ts', /mergeAgentRunLedgerIntoProductionState/, 'production-state merge')
requirePattern('lib/server/agent-run-ledger.ts', /decision-agent-run-ledger/, 'Project Brain decision tracking')
requirePattern('lib/server/agent-run-ledger.ts', /agent-run-ledger-evidenceGraph/, 'evidence graph node')
requirePattern('lib/server/agent-run-ledger.ts', /agent-run-ledger-validationGraph/, 'validation graph node')
requirePattern('lib/server/agent-run-ledger.ts', /Human-owner responsibility remains required/, 'human approval constraint')

requirePattern('app/api/ai/agents/route.ts', /buildAgentRunLedger/, 'agent overview route must expose run ledger')
requirePattern('app/api/ai/agents/executions/route.ts', /runLedger/, 'executions route must expose run ledger')
requirePattern('app/api/ai/agents/metrics/route.ts', /runLedgerSummary/, 'metrics route must expose ledger summary')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /requireAuth/, 'production-state route auth guard')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /requireEntitlementsForUser/, 'production-state entitlement guard')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /filterAgentSnapshotsForProject/, 'project-scoped snapshot filtering')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /writeAgentRunLedgerToSettings/, 'settings persistence')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /writeAgenticProductionStateToSettings/, 'production-state persistence')
requirePattern('app/api/projects/[id]/production-state/agent-run-ledger/route.ts', /canWriteAgentRunLedger/, 'viewer mutation guard')
requirePattern('__tests__/server/agent-run-ledger.test.ts', /buildAgentRunLedger/, 'ledger tests must cover summary helpers')
requirePattern('__tests__/server/agent-run-ledger.test.ts', /mergeAgentRunLedgerIntoProductionState/, 'ledger tests must cover production-state merge')
requirePattern('__tests__/api/production-state-agent-run-ledger-route.test.ts', /persists project-scoped agent run ledger/, 'production-state route persistence regression')
requirePattern('__tests__/api/production-state-agent-run-ledger-route.test.ts', /viewer-only collaborators/, 'production-state viewer guard regression')
requirePattern('package.json', /qa:agent-run-ledger/, 'package must expose qa:agent-run-ledger')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:agent-run-ledger/, 'enterprise gate must include agent run ledger')

if (failures.length) {
  console.error('[agent-run-ledger] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-run-ledger] PASS run ledger exposes evidence, review artifacts, and human-owner responsibility')
