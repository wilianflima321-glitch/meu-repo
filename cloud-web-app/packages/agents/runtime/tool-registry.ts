import type { AgentType } from './agent-roles'
import type { AgentRuntimeRoleManifest, AgentRuntimeToolPermission } from './types'

export function toolPermission(input: AgentRuntimeToolPermission): AgentRuntimeToolPermission {
  return input
}

export function buildAgentRoleManifest(input: {
  role: AgentType
  missionScope: string
  allowedTools?: AgentRuntimeToolPermission[]
  requiredReceipts?: string[]
  blockedActions?: string[]
}): AgentRuntimeRoleManifest {
  return {
    role: input.role,
    missionScope: input.missionScope,
    allowedTools: input.allowedTools ?? [],
    requiredReceipts: input.requiredReceipts ?? ['read receipt', 'tool receipt', 'approval receipt for mutations'],
    blockedActions: input.blockedActions ?? ['deploy without approval', 'delete without approval', 'purchase without approval'],
  }
}

export function validateAgentRoleManifest(manifest: AgentRuntimeRoleManifest): string[] {
  const failures: string[] = []
  if (!manifest.missionScope.trim()) failures.push(`${manifest.role}: mission scope is required`)
  if (manifest.requiredReceipts.length === 0) failures.push(`${manifest.role}: required receipts are required`)
  for (const tool of manifest.allowedTools) {
    if ((tool.risk === 'high' || tool.risk === 'critical') && !tool.requiresApproval) failures.push(`${manifest.role}:${tool.toolId}: high risk tools require approval`)
    if (!tool.evidenceRequired) failures.push(`${manifest.role}:${tool.toolId}: tool evidence is required`)
  }
  return failures
}
