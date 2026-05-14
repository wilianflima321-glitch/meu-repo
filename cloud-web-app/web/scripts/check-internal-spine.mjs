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

requireFile('lib/production/agent-tool-bus.ts', 'agents need a canonical tool bus')
requirePattern('lib/production/agent-tool-bus.ts', /getCanonicalAgentTools/, 'tool bus must expose the canonical registry')
requirePattern('lib/production/agent-tool-bus.ts', /evaluateAgentToolInvocation/, 'tool bus must evaluate each invocation')
requirePattern('lib/production/agent-tool-bus.ts', /browser-operator/, 'browser automation must be a governed tool')
requirePattern('lib/production/agent-tool-bus.ts', /explicit-human/, 'high-risk tools must require explicit human approval')
requirePattern('lib/production/agent-tool-bus.ts', /huggingface-mirror/, 'external AI asset/repo sources must be modeled as metadata-first tools')
requirePattern('lib/production/agent-tool-bus.ts', /requiresIdempotencyKey/, 'mutating or replayable tools must require idempotency keys')
requirePattern('lib/production/agent-tool-bus.ts', /requiresReadReceipts/, 'agents must prove what they read before writes and research-heavy actions')
requirePattern('lib/production/agent-tool-bus.ts', /requiresScopeLock/, 'write tools must require scoped ownership locks')
requirePattern('lib/production/agent-tool-bus.ts', /maxPayloadBytes/, 'heavy tools must cap payload size before local/cloud execution')
requirePattern('lib/production/agent-tool-bus.ts', /rollbackStrategy/, 'mutating tools must declare rollback strategy')
requirePattern('lib/production/agent-tool-bus.ts', /sandboxPolicy/, 'every tool must declare its sandbox policy')

requireFile('lib/production/high-risk-action-firewall.ts', 'high-risk actions need a safety firewall')
requirePattern('lib/production/high-risk-action-firewall.ts', /investment/, 'investment-like actions must be classified')
requirePattern('lib/production/high-risk-action-firewall.ts', /signed human approval/, 'financial actions must require signed human approval')
requirePattern('lib/production/high-risk-action-firewall.ts', /simulate-only/, 'blocked high-risk actions must remain simulation-only')

requireFile('lib/production/browser-operator-safety.ts', 'browser operator needs replay and prompt-injection policy')
requirePattern('lib/production/browser-operator-safety.ts', /Prompt injection/, 'browser operator must block prompt injection')
requirePattern('lib/production/browser-operator-safety.ts', /DOM snapshot/, 'browser operator must require DOM evidence')
requirePattern('lib/production/browser-operator-safety.ts', /Pause\/takeover/, 'browser operator must require pause/takeover')

requireFile('lib/production/multi-resolution-project-memory.ts', 'large repos need multi-resolution memory')
requirePattern('lib/production/multi-resolution-project-memory.ts', /buildMultiResolutionProjectMemory/, 'memory must build from cartography')
requirePattern('lib/production/multi-resolution-project-memory.ts', /metadata-only/, 'large external assets must stay metadata-first')
requirePattern('lib/production/multi-resolution-project-memory.ts', /Never dump an entire GB-scale repository/, 'memory must forbid raw GB context dumps')
requirePattern('lib/production/multi-resolution-project-memory.ts', /requiresReadReceipt/, 'memory shards must connect to read receipts')

requireFile('lib/production/task-evidence-ledger.ts', 'tasks need an evidence ledger')
requirePattern('lib/production/task-evidence-ledger.ts', /evaluateTaskEvidenceReadiness/, 'ledger must gate readiness on required evidence')
requirePattern('lib/production/task-evidence-ledger.ts', /browser-replay/, 'ledger must track browser replay evidence')
requirePattern('lib/production/task-evidence-ledger.ts', /rollback/, 'ledger must track rollback evidence')

requireFile('__tests__/production/internal-spine-tool-bus.test.ts', 'internal spine tool bus tests must exist')
requirePattern('__tests__/production/internal-spine-tool-bus.test.ts', /investment-like actions/, 'tests must cover investment/firewall risk')
requirePattern('__tests__/production/internal-spine-tool-bus.test.ts', /scope locks/, 'tests must cover scope-lock enforcement')
requirePattern('__tests__/production/internal-spine-tool-bus.test.ts', /idempotency/, 'tests must cover idempotency enforcement')
requirePattern('__tests__/production/internal-spine-tool-bus.test.ts', /maxPayloadBytes/, 'tests must cover payload budget enforcement')
requireFile('__tests__/production/multi-resolution-project-memory.test.ts', 'multi-resolution memory tests must exist')
requirePattern('__tests__/production/multi-resolution-project-memory.test.ts', /GB-scale repository/, 'tests must cover huge repo memory policy')
requireFile('__tests__/production/task-evidence-ledger.test.ts', 'task evidence ledger tests must exist')
requirePattern('__tests__/production/task-evidence-ledger.test.ts', /required evidence/, 'tests must cover evidence readiness')

requirePattern('package.json', /qa:internal-spine/, 'package scripts must expose internal spine QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:internal-spine/, 'enterprise gate must include internal spine QA')
requirePattern('scripts/check-product-quality-progress.mjs', /internal-spine/, 'product quality gate must require internal spine QA')

if (failures.length > 0) {
  console.error('[internal-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[internal-spine] PASS')
