import type { AgentWorkTool } from './parallel-agent-work-contract'
import type { AgentToolDefinition, AgentToolPermissions } from './agent-tool-bus'

export const KB = 1024
export const MB = KB * KB

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

export function permissions(patch: Partial<AgentToolPermissions> = {}): AgentToolPermissions {
  return { ...basePermissions, ...patch }
}

export function tool(
  id: AgentWorkTool,
  patch: Omit<AgentToolDefinition, 'id'>
): AgentToolDefinition {
  return { id, ...patch }
}

