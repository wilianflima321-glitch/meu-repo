import type { AgentType } from '../../../web/lib/agent-orchestrator'

export type AgentRuntimeExecutionState = 'held' | 'blocked' | 'needs-review' | 'available'
export type AgentRuntimeToolRisk = 'low' | 'medium' | 'high' | 'critical'
export type AgentRuntimeSandboxProvider = 'none' | 'local-script-sandbox' | 'vercel-sandbox' | 'studio-local'

export type AgentRuntimeToolPermission = {
  toolId: string
  risk: AgentRuntimeToolRisk
  readOnly: boolean
  requiresApproval: boolean
  evidenceRequired: boolean
}

export type AgentRuntimeRoleManifest = {
  role: AgentType
  missionScope: string
  allowedTools: AgentRuntimeToolPermission[]
  requiredReceipts: string[]
  blockedActions: string[]
}

export type AgentRuntimeReceipt = {
  id: string
  kind: 'tool' | 'sandbox' | 'browser-replay' | 'memory' | 'eval' | 'approval'
  state: 'recorded' | 'needs-review' | 'blocked'
  role: AgentType
  evidenceRefs: string[]
  reason: string
}

export type AgentRuntimeExecutionPlan = {
  version: 1
  state: AgentRuntimeExecutionState
  roles: AgentRuntimeRoleManifest[]
  sandboxProvider: AgentRuntimeSandboxProvider
  receipts: AgentRuntimeReceipt[]
  blockers: string[]
  nextAction: string
}

export const AGENT_RUNTIME_FORBIDDEN_CLAIMS = [
  'autonomous execution ready',
  'apply without approval',
  'production ready',
  'research verified',
] as const

export function uniqueAgentRuntimeValues(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}
