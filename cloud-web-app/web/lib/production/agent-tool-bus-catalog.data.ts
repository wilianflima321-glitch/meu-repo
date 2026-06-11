import type { AgentToolDefinition } from './agent-tool-bus'
import { CANONICAL_AGENT_CORE_TOOLS } from './agent-tool-bus-catalog.core-data'
import { CANONICAL_AGENT_RUNTIME_TOOLS } from './agent-tool-bus-catalog.runtime-data'

export const CANONICAL_AGENT_TOOLS: AgentToolDefinition[] = [
  ...CANONICAL_AGENT_CORE_TOOLS,
  ...CANONICAL_AGENT_RUNTIME_TOOLS,
]
