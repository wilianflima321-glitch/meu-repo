/**
 * Governed agent tool job runner — the execution kernel that closes the spine loop:
 *   tool-bus decision -> evidence readiness -> execution -> evidence receipts.
 *
 * Historically `evaluateAgentToolInvocation` (tool bus) and the task-evidence
 * ledger existed but were never wired into the production apply path: a tool
 * could be "allowed" and yet nothing recorded that it ran, and the tool bus was
 * never consulted before a real filesystem write. This module is the single
 * authority that any agent surface (code apply, autonomous agent, role agent)
 * routes tool execution through.
 *
 * Enforcement is graduated on purpose so it can be adopted without breaking
 * existing callers:
 *   - 'observe'  : evaluate the decision + record evidence, but never block.
 *   - 'enforced' : block execution when the tool bus or evidence readiness deny.
 */
import {
  evaluateAgentToolInvocation,
  type AgentMode,
  type AgentToolBusDecision,
  type AgentToolInvocation,
} from './agent-tool-bus'
import type { AgentWorkTool } from './parallel-agent-work-contract'
import {
  appendTaskEvidence,
  createTaskEvidenceLedger,
  evaluateTaskEvidenceReadiness,
  summarizeTaskEvidenceLedger,
  type TaskEvidenceLedger,
  type TaskEvidenceReadiness,
} from './task-evidence-ledger'

export type GovernedToolJobEnforcement = 'enforced' | 'observe'

export interface GovernedAgentToolJobInput {
  toolId: AgentWorkTool
  mode: AgentMode
  projectId: string
  agent: string
  mission: string
  intent: string
  taskId?: string
  targetPaths?: string[]
  idempotencyKey?: string | null
  readReceiptRefs?: string[]
  scopeLockRef?: string | null
  rollbackRef?: string | null
  evidenceRefs?: string[]
  approvalToken?: string | null
  maxCostUsd?: number | null
  /** Whether the diff/proposal artifact already exists (defaults to true for apply). */
  hasDiffEvidence?: boolean
  enforcement?: GovernedToolJobEnforcement
  now?: string
}

export interface GovernedAgentToolJobDecision {
  taskId: string
  enforcement: GovernedToolJobEnforcement
  toolDecision: AgentToolBusDecision
  evidenceReadiness: TaskEvidenceReadiness
  ledger: TaskEvidenceLedger
  /** True when the tool bus allows AND evidence is ready. */
  ready: boolean
  /** True when execution may proceed (always true in observe mode). */
  allowed: boolean
  blockers: string[]
  warnings: string[]
  evidenceSummary: string
}

export interface GovernedToolExecutionRecord {
  status: 'success' | 'failed'
  appliedPaths?: string[]
  rollbackRefs?: string[]
  validationVerdict?: string
  error?: string
  now?: string
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'job'
}

function resolveTaskId(input: GovernedAgentToolJobInput): string {
  if (input.taskId) return input.taskId
  const key = input.idempotencyKey ?? `${Date.now().toString(36)}`
  return `tool-job:${input.toolId}:${slug(key)}`
}

export function buildAgentToolInvocation(input: GovernedAgentToolJobInput): AgentToolInvocation {
  return {
    toolId: input.toolId,
    mode: input.mode,
    projectId: input.projectId,
    intent: input.intent,
    targetPaths: input.targetPaths,
    idempotencyKey: input.idempotencyKey ?? null,
    readReceiptRefs: input.readReceiptRefs,
    scopeLockRef: input.scopeLockRef ?? null,
    rollbackRef: input.rollbackRef ?? null,
    evidenceRefs: input.evidenceRefs,
    approvalToken: input.approvalToken ?? null,
    maxCostUsd: input.maxCostUsd ?? null,
  }
}

/**
 * Seeds a fresh ledger with evidence events for every artifact that is already
 * available at decision time, so that evidence readiness reflects reality.
 */
function seedLedgerWithAvailableEvidence(
  ledger: TaskEvidenceLedger,
  input: GovernedAgentToolJobInput,
  now: string
): TaskEvidenceLedger {
  let next = ledger
  const actor = input.agent
  const add = (
    kind: Parameters<typeof appendTaskEvidence>[1]['kind'],
    title: string,
    summary: string,
    refs: string[]
  ) => {
    next = appendTaskEvidence(next, { kind, title, summary, refs, actor, createdAt: now })
  }

  if (input.hasDiffEvidence !== false) {
    add('diff', 'Diff proposed', input.intent, input.targetPaths ?? [])
  }
  if (input.idempotencyKey) {
    add('idempotency', 'Idempotency key bound', input.idempotencyKey, [input.idempotencyKey])
  }
  if (input.rollbackRef) {
    add('rollback', 'Rollback snapshot prepared', 'Rollback artifact is available before execution.', [input.rollbackRef])
  }
  if (input.readReceiptRefs && input.readReceiptRefs.length > 0) {
    add(
      'read-receipt',
      'Read receipts attached',
      `${input.readReceiptRefs.length} read receipt(s) acknowledged.`,
      input.readReceiptRefs
    )
  }
  if (input.scopeLockRef) {
    add('scope-lock', 'Scope lock acquired', 'Surface lock held for target paths.', [input.scopeLockRef])
  }
  if (typeof input.maxCostUsd === 'number') {
    add('cost', 'Cost budget set', `maxCostUsd=${input.maxCostUsd}`, [])
  }

  return next
}

/**
 * Evaluates a governed tool job BEFORE execution. Computes the tool-bus
 * decision, seeds an evidence ledger, and returns whether execution may proceed.
 */
export function evaluateGovernedAgentToolJob(
  input: GovernedAgentToolJobInput
): GovernedAgentToolJobDecision {
  const now = input.now ?? new Date().toISOString()
  const enforcement: GovernedToolJobEnforcement = input.enforcement ?? 'observe'
  const taskId = resolveTaskId(input)

  const toolDecision = evaluateAgentToolInvocation(buildAgentToolInvocation(input))

  const baseLedger = createTaskEvidenceLedger({
    taskId,
    projectId: input.projectId,
    mission: input.mission,
    ownerAgent: input.agent,
    now,
  })
  const ledger = seedLedgerWithAvailableEvidence(baseLedger, input, now)
  const evidenceReadiness = evaluateTaskEvidenceReadiness(ledger, toolDecision)

  const ready = toolDecision.allowed && evidenceReadiness.ready
  const blockers = unique([...toolDecision.blockers, ...evidenceReadiness.blockers])

  return {
    taskId,
    enforcement,
    toolDecision,
    evidenceReadiness,
    ledger,
    ready,
    allowed: enforcement === 'enforced' ? ready : true,
    blockers,
    warnings: toolDecision.warnings,
    evidenceSummary: summarizeTaskEvidenceLedger(ledger),
  }
}

/**
 * Records the outcome of a governed tool job AFTER execution, appending a
 * tool-call receipt (and optional validation) to the evidence ledger so the
 * loop is closed.
 */
export function recordGovernedToolExecution(
  decision: GovernedAgentToolJobDecision,
  record: GovernedToolExecutionRecord
): TaskEvidenceLedger {
  const now = record.now ?? new Date().toISOString()
  let ledger = appendTaskEvidence(decision.ledger, {
    kind: 'tool-call',
    title: record.status === 'success' ? 'Tool executed' : 'Tool execution failed',
    summary:
      record.status === 'success'
        ? `${decision.toolDecision.tool.label} executed on ${decision.toolDecision.runtimeTarget}.`
        : record.error ?? 'Tool execution failed.',
    refs: record.appliedPaths ?? [],
    actor: decision.ledger.ownerAgent,
    createdAt: now,
  })

  if (record.rollbackRefs && record.rollbackRefs.length > 0) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'rollback',
      title: 'Rollback tokens recorded',
      summary: `${record.rollbackRefs.length} rollback token(s) captured for this run.`,
      refs: record.rollbackRefs,
      actor: ledger.ownerAgent,
      createdAt: now,
    })
  }

  if (record.validationVerdict) {
    ledger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Validation verdict recorded',
      summary: record.validationVerdict,
      refs: [],
      actor: ledger.ownerAgent,
      createdAt: now,
    })
  }

  return ledger
}
