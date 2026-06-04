import type { AgentWorkLane, AgentWorkTool } from './parallel-agent-work-contract'
import { evaluateBrowserOperatorPolicy } from './browser-operator-safety'
import { evaluateHighRiskAction } from './high-risk-action-firewall'
import { getCanonicalAgentTools } from './agent-tool-bus-catalog'
export { getCanonicalAgentTools } from './agent-tool-bus-catalog'

export type AgentMode =
  | 'Coordinator'
  | 'Research'
  | 'Builder'
  | 'Creative'
  | 'QA'
  | 'Browser Operator'
  | 'Release'

export type AgentToolRuntimeTarget =
  | 'local-worker'
  | 'local-sidecar'
  | 'cloud-sandbox'
  | 'browser-operator'
  | 'human-held'

export type AgentToolRisk = 'low' | 'medium' | 'high' | 'critical'
export type AgentToolApproval = 'none' | 'review' | 'explicit-human'
export type AgentToolCostClass = 'free' | 'metered-low' | 'metered-medium' | 'metered-high'
export type AgentToolRollbackStrategy =
  | 'none'
  | 'diff-revert'
  | 'artifact-delete'
  | 'deployment-rollback'
  | 'human-recovery'
export type AgentToolSandboxPolicy =
  | 'read-only'
  | 'write-scoped'
  | 'network-allowed'
  | 'browser-held'
  | 'release-held'

export interface AgentToolPermissions {
  readProject: boolean
  writeProject: boolean
  externalNetwork: boolean
  browserControl: boolean
  userAccount: boolean
  secrets: boolean
  financialAction: boolean
  destructiveAction: boolean
  deployment: boolean
}

export interface AgentToolDefinition {
  id: AgentWorkTool
  label: string
  lane: AgentWorkLane
  allowedModes: AgentMode[]
  runtimeTargets: AgentToolRuntimeTarget[]
  risk: AgentToolRisk
  approval: AgentToolApproval
  costClass: AgentToolCostClass
  defaultTimeoutMs: number
  maxPayloadBytes: number
  permissions: AgentToolPermissions
  sandboxPolicy: AgentToolSandboxPolicy
  rollbackStrategy: AgentToolRollbackStrategy
  requiresReplay: boolean
  requiresRollback: boolean
  requiresIdempotencyKey: boolean
  requiresReadReceipts: boolean
  requiresScopeLock: boolean
  requiredEvidence: string[]
}

export interface AgentToolInvocation {
  toolId: AgentWorkTool
  mode: AgentMode
  projectId: string
  intent: string
  targetUrl?: string | null
  targetPaths?: string[]
  requestedRuntime?: AgentToolRuntimeTarget
  maxCostUsd?: number | null
  payloadBytes?: number | null
  idempotencyKey?: string | null
  readReceiptRefs?: string[]
  scopeLockRef?: string | null
  rollbackRef?: string | null
  evidenceRefs?: string[]
  approvalToken?: string | null
  allowedDomains?: string[]
  deniedDomains?: string[]
}

export interface AgentToolBusDecision {
  allowed: boolean
  status: 'allowed' | 'held' | 'blocked'
  tool: AgentToolDefinition
  runtimeTarget: AgentToolRuntimeTarget
  risk: AgentToolRisk
  sandboxPolicy: AgentToolSandboxPolicy
  rollbackStrategy: AgentToolRollbackStrategy
  timeoutMs: number
  requiredApprovals: string[]
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
}

function evidenceIncludes(invocation: AgentToolInvocation, pattern: RegExp): boolean {
  return invocation.evidenceRefs?.some((ref) => pattern.test(ref)) ?? false
}

function hasReadReceipt(invocation: AgentToolInvocation): boolean {
  return (invocation.readReceiptRefs?.length ?? 0) > 0 || evidenceIncludes(invocation, /read[-_ ]?receipt/i)
}

function hasScopeLock(invocation: AgentToolInvocation): boolean {
  return Boolean(invocation.scopeLockRef) || evidenceIncludes(invocation, /(scope[-_ ]?lock|surface[-_ ]?lock|lock:)/i)
}

function hasRollbackEvidence(invocation: AgentToolInvocation): boolean {
  return Boolean(invocation.rollbackRef) || evidenceIncludes(invocation, /rollback/i)
}

function findTool(toolId: AgentWorkTool): AgentToolDefinition | null {
  return getCanonicalAgentTools().find((candidate) => candidate.id === toolId) ?? null
}

function pickRuntime(toolDefinition: AgentToolDefinition, requestedRuntime?: AgentToolRuntimeTarget): AgentToolRuntimeTarget {
  if (requestedRuntime && toolDefinition.runtimeTargets.includes(requestedRuntime)) return requestedRuntime
  return toolDefinition.runtimeTargets[0]
}

export function evaluateAgentToolInvocation(invocation: AgentToolInvocation): AgentToolBusDecision {
  const toolDefinition = findTool(invocation.toolId)
  if (!toolDefinition) {
    const fallback = getCanonicalAgentTools()[0]
    return {
      allowed: false,
      status: 'blocked',
      tool: fallback,
      runtimeTarget: 'human-held',
      risk: 'critical',
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'human-recovery',
      timeoutMs: 0,
      requiredApprovals: ['tool registry review'],
      requiredEvidence: ['unknown tool request'],
      blockers: [`Unknown agent tool: ${invocation.toolId}.`],
      warnings: [],
    }
  }

  const blockers: string[] = []
  const warnings: string[] = []
  const requiredApprovals: string[] = []
  const requiredEvidence = [...toolDefinition.requiredEvidence]

  if (!toolDefinition.allowedModes.includes(invocation.mode)) {
    blockers.push(`${invocation.mode} mode cannot use ${toolDefinition.label}.`)
  }
  if (invocation.requestedRuntime && !toolDefinition.runtimeTargets.includes(invocation.requestedRuntime)) {
    blockers.push(`${toolDefinition.label} cannot run on requested runtime ${invocation.requestedRuntime}.`)
  }
  if (typeof invocation.payloadBytes === 'number' && invocation.payloadBytes > toolDefinition.maxPayloadBytes) {
    blockers.push(`${toolDefinition.label} payload exceeds maxPayloadBytes (${invocation.payloadBytes} > ${toolDefinition.maxPayloadBytes}).`)
  }
  if (toolDefinition.approval === 'review') requiredApprovals.push('review approval')
  if (toolDefinition.approval === 'explicit-human') {
    requiredApprovals.push('explicit human approval')
    if (!invocation.approvalToken) {
      blockers.push(`${toolDefinition.label} requires an explicit human approval token before execution.`)
    }
  }
  if (toolDefinition.requiresReplay) requiredEvidence.push('replay evidence')
  if (toolDefinition.requiresRollback) requiredEvidence.push('rollback plan')
  if (toolDefinition.requiresIdempotencyKey) {
    requiredEvidence.push('idempotency key')
    if (!invocation.idempotencyKey) {
      blockers.push(`${toolDefinition.label} requires an idempotency key for replay-safe execution.`)
    }
  }
  if (toolDefinition.requiresReadReceipts) {
    requiredEvidence.push('read receipts')
    if (!hasReadReceipt(invocation)) {
      blockers.push(`${toolDefinition.label} requires read receipts before execution.`)
    }
  }
  if (toolDefinition.requiresScopeLock) {
    requiredEvidence.push('scope lock')
    if (!hasScopeLock(invocation)) {
      blockers.push(`${toolDefinition.label} requires a scope lock before execution.`)
    }
  }
  if (toolDefinition.requiresRollback && !hasRollbackEvidence(invocation)) {
    blockers.push(`${toolDefinition.label} requires rollback evidence before execution.`)
  }
  if (toolDefinition.costClass !== 'free' && typeof invocation.maxCostUsd !== 'number') {
    blockers.push(`${toolDefinition.label} requires a maxCostUsd budget.`)
  }

  const highRisk = evaluateHighRiskAction({
    action: invocation.intent,
    targetUrl: invocation.targetUrl,
    amountUsd: invocation.maxCostUsd,
    hasExplicitHumanApproval: Boolean(invocation.approvalToken),
    approvalToken: invocation.approvalToken,
    hasReplayEvidence: evidenceIncludes(invocation, /replay/i),
    hasDryRunEvidence: evidenceIncludes(invocation, /(preview|dry-run)/i),
    hasRollbackPlan: hasRollbackEvidence(invocation),
    hasSpendingLimit: typeof invocation.maxCostUsd === 'number',
  })

  if (highRisk.kinds.length > 0) {
    requiredApprovals.push(...highRisk.requiredApprovals)
    requiredEvidence.push(...highRisk.requiredEvidence)
    warnings.push(...highRisk.warnings)
    if (highRisk.status !== 'allowed') blockers.push(...highRisk.blockers)
  }

  if (toolDefinition.id === 'browser-operator') {
    const browserDecision = evaluateBrowserOperatorPolicy({
      targetUrl: invocation.targetUrl ?? '',
      intendedAction: invocation.intent,
      hasReplayCapture: evidenceIncludes(invocation, /replay/i),
      hasScreenshotCapture: evidenceIncludes(invocation, /screenshot/i),
      hasDomSnapshot: evidenceIncludes(invocation, /dom/i),
      hasPauseControl: evidenceIncludes(invocation, /pause/i),
      hasHumanApproval: Boolean(invocation.approvalToken),
      approvalToken: invocation.approvalToken,
      allowedDomains: invocation.allowedDomains,
      deniedDomains: invocation.deniedDomains,
      amountUsd: invocation.maxCostUsd,
    })
    requiredEvidence.push(...browserDecision.requiredEvidence)
    blockers.push(...browserDecision.blockers)
    warnings.push(...browserDecision.warnings)
  }

  const runtimeTarget = blockers.length > 0
    ? 'human-held'
    : pickRuntime(toolDefinition, invocation.requestedRuntime)
  const status = blockers.length > 0 ? 'held' : 'allowed'

  return {
    allowed: blockers.length === 0,
    status,
    tool: toolDefinition,
    runtimeTarget,
    risk: toolDefinition.risk,
    sandboxPolicy: toolDefinition.sandboxPolicy,
    rollbackStrategy: toolDefinition.rollbackStrategy,
    timeoutMs: toolDefinition.defaultTimeoutMs,
    requiredApprovals: Array.from(new Set(requiredApprovals)),
    requiredEvidence: Array.from(new Set(requiredEvidence)),
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  }
}

export function buildAgentToolBusSnapshot() {
  const tools = getCanonicalAgentTools()
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    toolCount: tools.length,
    criticalTools: tools.filter((toolDefinition) => toolDefinition.risk === 'critical').map((toolDefinition) => toolDefinition.id),
    replayRequiredTools: tools.filter((toolDefinition) => toolDefinition.requiresReplay).map((toolDefinition) => toolDefinition.id),
    explicitApprovalTools: tools.filter((toolDefinition) => toolDefinition.approval === 'explicit-human').map((toolDefinition) => toolDefinition.id),
    idempotencyRequiredTools: tools.filter((toolDefinition) => toolDefinition.requiresIdempotencyKey).map((toolDefinition) => toolDefinition.id),
    readReceiptRequiredTools: tools.filter((toolDefinition) => toolDefinition.requiresReadReceipts).map((toolDefinition) => toolDefinition.id),
    scopeLockedTools: tools.filter((toolDefinition) => toolDefinition.requiresScopeLock).map((toolDefinition) => toolDefinition.id),
    rollbackRequiredTools: tools.filter((toolDefinition) => toolDefinition.requiresRollback).map((toolDefinition) => toolDefinition.id),
    writeScopedTools: tools.filter((toolDefinition) => toolDefinition.sandboxPolicy === 'write-scoped').map((toolDefinition) => toolDefinition.id),
  }
}
