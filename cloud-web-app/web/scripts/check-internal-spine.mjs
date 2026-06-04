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

function requirePatternAny(relativePaths, pattern, reason) {
  const existing = relativePaths.filter(exists)
  if (existing.length === 0) {
    failures.push(`${relativePaths.join(', ')}: missing (${reason})`)
    return
  }
  const content = existing.map(read).join('\n')
  if (!pattern.test(content)) failures.push(`${relativePaths.join(', ')}: missing pattern ${pattern} (${reason})`)
}

const agentToolRegistryFiles = ['lib/production/agent-tool-bus.ts', 'lib/production/agent-tool-bus-catalog.ts']
requireFile('lib/production/agent-tool-bus.ts', 'agents need a canonical tool bus')
requireFile('lib/production/agent-tool-bus-catalog.ts', 'canonical tool contracts may live in the catalog split')
requirePattern('lib/production/agent-tool-bus.ts', /getCanonicalAgentTools/, 'tool bus must expose the canonical registry')
requirePattern('lib/production/agent-tool-bus.ts', /evaluateAgentToolInvocation/, 'tool bus must evaluate each invocation')
requirePatternAny(agentToolRegistryFiles, /browser-operator/, 'browser automation must be a governed tool')
requirePatternAny(agentToolRegistryFiles, /explicit-human/, 'high-risk tools must require explicit human approval')
requirePatternAny(agentToolRegistryFiles, /huggingface-mirror/, 'external AI asset/repo sources must be modeled as metadata-first tools')
requirePatternAny(agentToolRegistryFiles, /requiresIdempotencyKey/, 'mutating or replayable tools must require idempotency keys')
requirePatternAny(agentToolRegistryFiles, /requiresReadReceipts/, 'agents must prove what they read before writes and research-heavy actions')
requirePatternAny(agentToolRegistryFiles, /requiresScopeLock/, 'write tools must require scoped ownership locks')
requirePatternAny(agentToolRegistryFiles, /maxPayloadBytes/, 'heavy tools must cap payload size before local/cloud execution')
requirePatternAny(agentToolRegistryFiles, /rollbackStrategy/, 'mutating tools must declare rollback strategy')
requirePatternAny(agentToolRegistryFiles, /sandboxPolicy/, 'every tool must declare its sandbox policy')

if (exists('lib/production/agent-tool-bus.ts') && exists('lib/production/parallel-agent-work-contract.ts')) {
  const toolBus = agentToolRegistryFiles.filter(exists).map(read).join('\n')
  const workContract = read('lib/production/parallel-agent-work-contract.ts')
  const canonicalToolIds = new Set([...toolBus.matchAll(/tool\('([^']+)'/g)].map((match) => match[1]))
  const toolTypeBlock = workContract.match(/export type AgentWorkTool =([\s\S]*?)\n\nexport type AgentScopeMode/)?.[1] ?? ''
  const declaredToolIds = [...toolTypeBlock.matchAll(/'([^']+)'/g)].map((match) => match[1])
  const missingCanonicalTools = declaredToolIds.filter((toolId) => !canonicalToolIds.has(toolId))
  if (missingCanonicalTools.length > 0) {
    failures.push(`lib/production/agent-tool-bus.ts: missing canonical contracts for ${missingCanonicalTools.join(', ')}`)
  }
}

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

requireFile('lib/production/deep-spine-scan.ts', 'agents need a governed pente-fino scan for MB/GB projects')
requirePattern('lib/production/deep-spine-scan.ts', /DeepSpineScanManifest/, 'deep scan must expose a manifest contract')
requirePattern('lib/production/deep-spine-scan.ts', /buildMultiResolutionProjectMemory/, 'deep scan must reuse multi-resolution memory')
requirePattern('lib/production/deep-spine-scan.ts', /metadata-first/, 'deep scan must keep external sources metadata-first')
requirePattern('lib/production/deep-spine-scan.ts', /safeAutofix:\s*false/, 'deep scan must never auto-fix from scan findings')
requirePatternAny(agentToolRegistryFiles, /tool\('deep-spine-scan'/, 'deep scan must be governed by the Agent Tool Bus')
requirePattern('package.json', /qa:deep-spine-scan/, 'package scripts must expose deep spine scan QA')

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
