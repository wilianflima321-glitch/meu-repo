import type { AgentWorkLane, AgentWorkTool } from './parallel-agent-work-contract'
import { evaluateBrowserOperatorPolicy } from './browser-operator-safety'
import { evaluateHighRiskAction } from './high-risk-action-firewall'

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

const KB = 1024
const MB = KB * KB

const basePermissions: AgentToolPermissions = {
  readProject: true,
  writeProject: false,
  externalNetwork: false,
  browserControl: false,
  userAccount: false,
  secrets: false,
  financialAction: false,
  destructiveAction: false,
  deployment: false,
}

function permissions(patch: Partial<AgentToolPermissions> = {}): AgentToolPermissions {
  return { ...basePermissions, ...patch }
}

function tool(
  id: AgentWorkTool,
  patch: Omit<AgentToolDefinition, 'id'>
): AgentToolDefinition {
  return { id, ...patch }
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

export function getCanonicalAgentTools(): AgentToolDefinition[] {
  return [
    tool('project-brain', {
      label: 'Project Brain',
      lane: 'orchestration',
      allowedModes: ['Coordinator', 'Research', 'Builder', 'Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'low',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 15_000,
      maxPayloadBytes: 1 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['brain read receipt'],
    }),
    tool('mission-ledger', {
      label: 'Mission Ledger',
      lane: 'orchestration',
      allowedModes: ['Coordinator', 'Research', 'Builder', 'Creative', 'QA', 'Browser Operator', 'Release'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'low',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 15_000,
      maxPayloadBytes: 512 * KB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: true,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['ledger event'],
    }),
    tool('repository-cartography', {
      label: 'Repository Cartography',
      lane: 'orchestration',
      allowedModes: ['Coordinator', 'Research', 'Builder', 'Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'review',
      costClass: 'metered-low',
      defaultTimeoutMs: 120_000,
      maxPayloadBytes: 50 * MB,
      permissions: permissions({ externalNetwork: true }),
      sandboxPolicy: 'network-allowed',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['cartography manifest', 'context budget'],
    }),
    tool('context-budget', {
      label: 'Context Budget',
      lane: 'orchestration',
      allowedModes: ['Coordinator', 'Research', 'Builder', 'Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'low',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 20_000,
      maxPayloadBytes: 5 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['retrieval plan'],
    }),
    tool('file-read', {
      label: 'File Read',
      lane: 'software',
      allowedModes: ['Coordinator', 'Research', 'Builder', 'Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      risk: 'low',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 20_000,
      maxPayloadBytes: 10 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['file read receipt'],
    }),
    tool('diff-proposal', {
      label: 'Diff Proposal',
      lane: 'software',
      allowedModes: ['Builder', 'Creative', 'Release'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'review',
      costClass: 'metered-low',
      defaultTimeoutMs: 60_000,
      maxPayloadBytes: 5 * MB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'diff-revert',
      requiresReplay: false,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['diff', 'rollback plan', 'read receipts'],
    }),
    tool('test-runner', {
      label: 'Test Runner',
      lane: 'validation',
      allowedModes: ['Builder', 'QA', 'Release'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'none',
      costClass: 'metered-low',
      defaultTimeoutMs: 180_000,
      maxPayloadBytes: 2 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: true,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['test output'],
    }),
    tool('deep-research', {
      label: 'Deep Research',
      lane: 'research',
      allowedModes: ['Coordinator', 'Research'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'review',
      costClass: 'metered-medium',
      defaultTimeoutMs: 180_000,
      maxPayloadBytes: 10 * MB,
      permissions: permissions({ externalNetwork: true }),
      sandboxPolicy: 'network-allowed',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['source citations', 'research packet'],
    }),
    tool('github-mirror', {
      label: 'GitHub Mirror',
      lane: 'research',
      allowedModes: ['Research', 'Coordinator'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'review',
      costClass: 'metered-low',
      defaultTimeoutMs: 120_000,
      maxPayloadBytes: 20 * MB,
      permissions: permissions({ externalNetwork: true }),
      sandboxPolicy: 'network-allowed',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['metadata manifest', 'license summary'],
    }),
    tool('huggingface-mirror', {
      label: 'Hugging Face Mirror',
      lane: 'asset',
      allowedModes: ['Research', 'Creative'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox'],
      risk: 'high',
      approval: 'review',
      costClass: 'metered-medium',
      defaultTimeoutMs: 240_000,
      maxPayloadBytes: 50 * MB,
      permissions: permissions({ externalNetwork: true }),
      sandboxPolicy: 'network-allowed',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: false,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['metadata-first scan', 'license summary', 'download budget'],
    }),
    tool('browser-operator', {
      label: 'Browser Operator',
      lane: 'browser-operator',
      allowedModes: ['Browser Operator'],
      runtimeTargets: ['browser-operator', 'human-held'],
      risk: 'critical',
      approval: 'explicit-human',
      costClass: 'metered-medium',
      defaultTimeoutMs: 180_000,
      maxPayloadBytes: 5 * MB,
      permissions: permissions({ externalNetwork: true, browserControl: true, userAccount: true, secrets: true }),
      sandboxPolicy: 'browser-held',
      rollbackStrategy: 'human-recovery',
      requiresReplay: true,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['browser replay', 'screenshot', 'DOM snapshot', 'approval record'],
    }),
    tool('render-queue', {
      label: 'Render Queue',
      lane: 'creative',
      allowedModes: ['Creative', 'QA'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox'],
      risk: 'high',
      approval: 'review',
      costClass: 'metered-high',
      defaultTimeoutMs: 300_000,
      maxPayloadBytes: 20 * MB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'artifact-delete',
      requiresReplay: false,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['render contract', 'artifact links', 'performance report', 'rollback plan'],
    }),
    tool('renderer-probe', {
      label: 'Renderer Probe',
      lane: 'performance',
      allowedModes: ['Coordinator', 'Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'local-sidecar', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 30_000,
      maxPayloadBytes: 1 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: true,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['runtime capability report', 'toolchain registry', 'backend health'],
    }),
    tool('asset-optimize', {
      label: 'Asset Optimize',
      lane: 'asset',
      allowedModes: ['Creative', 'QA'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox'],
      risk: 'high',
      approval: 'review',
      costClass: 'metered-medium',
      defaultTimeoutMs: 300_000,
      maxPayloadBytes: 100 * MB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'artifact-delete',
      requiresReplay: false,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['asset metadata', 'license summary', 'optimization budget', 'proxy/LOD artifact', 'rollback plan'],
    }),
    tool('shader-compile', {
      label: 'Shader Compile',
      lane: 'performance',
      allowedModes: ['Builder', 'Creative', 'QA'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox'],
      risk: 'high',
      approval: 'review',
      costClass: 'metered-low',
      defaultTimeoutMs: 120_000,
      maxPayloadBytes: 5 * MB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'artifact-delete',
      requiresReplay: false,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['shader source hash', 'compile log', 'fallback material', 'rollback plan'],
    }),
    tool('render-submit', {
      label: 'Render Submit',
      lane: 'creative',
      allowedModes: ['Creative', 'Release'],
      runtimeTargets: ['local-sidecar', 'cloud-sandbox', 'human-held'],
      risk: 'high',
      approval: 'review',
      costClass: 'metered-high',
      defaultTimeoutMs: 600_000,
      maxPayloadBytes: 20 * MB,
      permissions: permissions({ writeProject: true }),
      sandboxPolicy: 'write-scoped',
      rollbackStrategy: 'artifact-delete',
      requiresReplay: false,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['render backend contract', 'runtime budget', 'asset graph', 'validation graph', 'rollback plan'],
    }),
    tool('render-validate', {
      label: 'Render Validate',
      lane: 'validation',
      allowedModes: ['Creative', 'QA', 'Release'],
      runtimeTargets: ['local-worker', 'cloud-sandbox'],
      risk: 'medium',
      approval: 'none',
      costClass: 'metered-low',
      defaultTimeoutMs: 120_000,
      maxPayloadBytes: 10 * MB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: false,
      requiredEvidence: ['render evidence', 'performance report', 'artifact ownership validation'],
    }),
    tool('deployment', {
      label: 'Deployment',
      lane: 'release',
      allowedModes: ['Release'],
      runtimeTargets: ['cloud-sandbox', 'human-held'],
      risk: 'critical',
      approval: 'explicit-human',
      costClass: 'metered-low',
      defaultTimeoutMs: 240_000,
      maxPayloadBytes: 5 * MB,
      permissions: permissions({ externalNetwork: true, deployment: true, writeProject: true }),
      sandboxPolicy: 'release-held',
      rollbackStrategy: 'deployment-rollback',
      requiresReplay: true,
      requiresRollback: true,
      requiresIdempotencyKey: true,
      requiresReadReceipts: true,
      requiresScopeLock: true,
      requiredEvidence: ['build result', 'deploy preview', 'approval record', 'rollback plan'],
    }),
    tool('human-approval', {
      label: 'Human Approval',
      lane: 'orchestration',
      allowedModes: ['Coordinator', 'Browser Operator', 'Release'],
      runtimeTargets: ['human-held'],
      risk: 'low',
      approval: 'none',
      costClass: 'free',
      defaultTimeoutMs: 86_400_000,
      maxPayloadBytes: 128 * KB,
      permissions: permissions(),
      sandboxPolicy: 'read-only',
      rollbackStrategy: 'none',
      requiresReplay: false,
      requiresRollback: false,
      requiresIdempotencyKey: true,
      requiresReadReceipts: false,
      requiresScopeLock: false,
      requiredEvidence: ['approval record'],
    }),
  ]
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
