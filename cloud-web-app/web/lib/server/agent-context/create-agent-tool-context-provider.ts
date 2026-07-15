import type { AgentAction, AgentToolContextProvider } from '@/lib/ai/agent-mode-contracts'

export function createAgentToolContextProvider(input: {
  userId: string
  projectId?: string
  agent?: string
}): AgentToolContextProvider {
  return async (_action: AgentAction) => {
    if (!input.userId) return null
    return {
      __aethelContext: {
        userId: input.userId,
        projectId: input.projectId,
        agent: input.agent ?? 'autonomous-agent',
      },
    }
  }
}
