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

const agentToolRegistryFiles = [
  'lib/production/agent-tool-bus.ts',
  'lib/production/agent-tool-bus-catalog.ts',
  'lib/production/agent-tool-bus-catalog.data.ts',
  'lib/production/agent-tool-bus-catalog.core-data.ts',
  'lib/production/agent-tool-bus-catalog.runtime-data.ts',
]
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
requirePatternAny(
  [
    'lib/production/deep-spine-scan.ts',
    'lib/production/deep-spine-scan.findings.ts',
    'lib/production/deep-spine-scan.contracts.ts',
  ],
  /safeAutofix:\s*false/,
  'deep scan must never auto-fix from scan findings'
)
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

// Governed execution kernel: the loop (tool bus -> evidence -> execution -> receipt) must be wired, not just defined.
requireFile('lib/production/agent-tool-job-runner.ts', 'agents need a governed execution kernel that closes the spine loop')
requirePattern('lib/production/agent-tool-job-runner.ts', /evaluateAgentToolInvocation/, 'kernel must consult the tool bus before execution')
requirePattern('lib/production/agent-tool-job-runner.ts', /evaluateTaskEvidenceReadiness/, 'kernel must gate on task evidence readiness')
requirePattern('lib/production/agent-tool-job-runner.ts', /recordGovernedToolExecution/, 'kernel must record execution receipts to close the loop')
requirePattern('lib/server/ai-change-apply/executor.ts', /evaluateGovernedAgentToolJob/, 'apply executor must route through the governed kernel in production')
requirePattern('lib/server/ai-change-apply/executor.ts', /recordGovernedToolExecution/, 'apply executor must record a governed execution receipt')
requireFile('__tests__/production/agent-tool-job-runner.test.ts', 'governed execution kernel tests must exist')
requirePattern('__tests__/production/agent-tool-job-runner.test.ts', /enforced/, 'kernel tests must cover enforced blocking')

requireFile('lib/production/task-evidence-ledger-store.ts', 'governed evidence ledgers must be durable beyond a single request')
requirePattern('lib/production/task-evidence-ledger-store.ts', /writeTaskEvidenceLedgerToSettings/, 'store must persist ledgers into project settings')
requireFile('lib/server/ai-change-apply/persist-governed-evidence.ts', 'apply path needs a best-effort durable evidence writer')
requirePattern('lib/server/ai-change-apply/executor.ts', /persistGovernedTaskEvidence/, 'apply executor must persist the governed evidence ledger after a successful write')
requireFile('__tests__/production/task-evidence-ledger-store.test.ts', 'evidence ledger store tests must exist')

requireFile('lib/server/project-file-store/index.ts', 'project files need one unified source-of-truth store')
requireFile('lib/server/project-file-store/disk-store.ts', 'unified store needs a disk backend for local/desktop')
requireFile('lib/server/project-file-store/db-store.ts', 'unified store needs a db backend for serverless')
requirePattern('lib/server/project-file-store/index.ts', /selectProjectFileBackend/, 'store must select backend by runtime')
requirePattern('lib/ai-tools-registry.ts', /getProjectFileStore/, 'agent file tools must write through the unified ProjectFileStore (single source of truth)')
requireFile('__tests__/server/project-file-store.test.ts', 'unified project file store tests must exist')
requirePattern('lib/server/ai-change-apply/executor.ts', /mirrorAppliedChangesToCanonicalStore/, 'apply pipeline must keep the canonical file store in sync after a successful write')
requireFile('lib/server/ai-change-apply/mirror-canonical-store.ts', 'apply pipeline needs a canonical-store mirror for serverless/db runtimes')

requireFile('lib/server/agent-context/assemble-agent-context.ts', 'agents need task-relevant repository context wired into the loop')
requirePattern('lib/server/agent-context/assemble-agent-context.ts', /queryRepoGraphRAG/, 'agent context must use AST semantic retrieval')
requirePattern('lib/server/agent-context/assemble-agent-context.ts', /mustReadFirst/, 'agent context must use cartography mustReadFirst')
requirePattern('lib/ai-agent-system.ts', /assembleAgentContext/, 'AgentExecutor must inject assembled repository context into its prompt')
requireFile('__tests__/server/assemble-agent-context.test.ts', 'agent context assembler tests must exist')

requireFile('__tests__/server/create-agent-tool-context-provider.test.ts', 'AutonomousAgent tool context provider tests must exist')
requireFile('__tests__/routes/workbench-convergence.test.ts', 'workbench convergence redirect tests must exist')
requireFile('lib/server/agent-context/create-agent-tool-context-provider.ts', 'AutonomousAgent needs a governed tool context provider')
requirePattern('lib/ai/agent-mode.ts', /assembleAgentContext|loadRepositoryContext/, 'AutonomousAgent must load assembled repository context')
requirePattern('lib/server/ai-change-apply/executor.ts', /NODE_ENV === 'production'[\s\S]*enforced/, 'production apply must default to enforced tool bus')
requirePattern('package.json', /qa:phase-a-store-coverage/, 'package scripts must expose phase-a store coverage gate')
requirePattern('package.json', /qa:evidence-ledger-coverage/, 'package scripts must expose evidence ledger coverage gate')

requirePattern('package.json', /qa:internal-spine/, 'package scripts must expose internal spine QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:internal-spine/, 'enterprise gate must include internal spine QA')
requirePattern('scripts/check-product-quality-progress.mjs', /internal-spine/, 'product quality gate must require internal spine QA')

if (failures.length > 0) {
  console.error('[internal-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[internal-spine] PASS')
