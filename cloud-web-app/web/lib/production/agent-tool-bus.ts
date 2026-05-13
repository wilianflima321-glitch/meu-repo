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
  permissions: AgentToolPermissions
  requiresReplay: boolean
  requiresRollback: boolean
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
  timeoutMs: number
  requiredApprovals: string[]
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
}

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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ externalNetwork: true }),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ writeProject: true }),
      requiresReplay: false,
      requiresRollback: true,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ externalNetwork: true }),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ externalNetwork: true }),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ externalNetwork: true }),
      requiresReplay: false,
      requiresRollback: false,
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
      permissions: permissions({ externalNetwork: true, browserControl: true, userAccount: true, secrets: true }),
      requiresReplay: true,
      requiresRollback: true,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
      requiredEvidence: ['render contract', 'artifact links', 'performance report'],
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
      permissions: permissions({ externalNetwork: true, deployment: true, writeProject: true }),
      requiresReplay: true,
      requiresRollback: true,
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
      permissions: permissions(),
      requiresReplay: false,
      requiresRollback: false,
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
  if (toolDefinition.approval === 'review') requiredApprovals.push('review approval')
  if (toolDefinition.approval === 'explicit-human') requiredApprovals.push('explicit human approval')
  if (toolDefinition.requiresReplay) requiredEvidence.push('replay evidence')
  if (toolDefinition.requiresRollback) requiredEvidence.push('rollback plan')
  if (toolDefinition.costClass !== 'free' && typeof invocation.maxCostUsd !== 'number') {
    blockers.push(`${toolDefinition.label} requires a maxCostUsd budget.`)
  }

  const highRisk = evaluateHighRiskAction({
    action: invocation.intent,
    targetUrl: invocation.targetUrl,
    amountUsd: invocation.maxCostUsd,
    hasExplicitHumanApproval: Boolean(invocation.approvalToken),
    approvalToken: invocation.approvalToken,
    hasReplayEvidence: invocation.evidenceRefs?.some((ref) => ref.includes('replay')) ?? false,
    hasDryRunEvidence: invocation.evidenceRefs?.some((ref) => ref.includes('preview') || ref.includes('dry-run')) ?? false,
    hasRollbackPlan: invocation.evidenceRefs?.some((ref) => ref.includes('rollback')) ?? false,
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
      hasReplayCapture: invocation.evidenceRefs?.some((ref) => ref.includes('replay')) ?? false,
      hasScreenshotCapture: invocation.evidenceRefs?.some((ref) => ref.includes('screenshot')) ?? false,
      hasDomSnapshot: invocation.evidenceRefs?.some((ref) => ref.includes('dom')) ?? false,
      hasPauseControl: invocation.evidenceRefs?.some((ref) => ref.includes('pause')) ?? false,
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

  const runtimeTarget = blockers.length > 0 || toolDefinition.approval === 'explicit-human'
    ? 'human-held'
    : pickRuntime(toolDefinition, invocation.requestedRuntime)
  const status = blockers.length > 0 ? 'held' : 'allowed'

  return {
    allowed: blockers.length === 0,
    status,
    tool: toolDefinition,
    runtimeTarget,
    risk: toolDefinition.risk,
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
  }
}
