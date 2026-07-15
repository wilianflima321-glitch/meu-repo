import type { AgentToolDefinition } from './agent-tool-bus'
import { CANONICAL_AGENT_TOOLS } from './agent-tool-bus-catalog.data'

export function getCanonicalAgentTools(): AgentToolDefinition[] {
  return CANONICAL_AGENT_TOOLS.map((toolDefinition) => ({
    ...toolDefinition,
    permissions: { ...toolDefinition.permissions },
    allowedModes: [...toolDefinition.allowedModes],
    runtimeTargets: [...toolDefinition.runtimeTargets],
    requiredEvidence: [...toolDefinition.requiredEvidence],
  }))
}
