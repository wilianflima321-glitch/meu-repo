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
requirePattern('lib/server/agent-run-ledger.ts', /marketReadiness/, 'market readiness status')
requirePattern('lib/server/agent-run-ledger.ts', /responsibilityModel:\s*'human-owner-required'/, 'human owner responsibility model')
requirePattern('lib/server/agent-run-ledger.ts', /Evidence refs required before agent work can be trusted/, 'evidence is mandatory')
requirePattern('lib/server/agent-run-ledger.ts', /Branch or pull request artifact required/, 'reviewable branch or PR artifact is mandatory')
requirePattern('lib/server/agent-run-ledger.ts', /Preview, replay, or screenshot artifact required/, 'visual/product proof artifact is mandatory')

requirePattern('app/api/ai/agents/route.ts', /buildAgentRunLedger/, 'agent overview route must expose run ledger')
requirePattern('app/api/ai/agents/executions/route.ts', /runLedger/, 'executions route must expose run ledger')
requirePattern('app/api/ai/agents/metrics/route.ts', /runLedgerSummary/, 'metrics route must expose ledger summary')
requirePattern('__tests__/server/agent-run-ledger.test.ts', /buildAgentRunLedger/, 'ledger tests must cover summary helpers')
requirePattern('package.json', /qa:agent-run-ledger/, 'package must expose qa:agent-run-ledger')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:agent-run-ledger/, 'enterprise gate must include agent run ledger')

if (failures.length) {
  console.error('[agent-run-ledger] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-run-ledger] PASS run ledger exposes evidence, review artifacts, and human-owner responsibility')
