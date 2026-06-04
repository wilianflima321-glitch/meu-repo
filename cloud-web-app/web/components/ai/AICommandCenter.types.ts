import type { AgentExecution } from '../../lib/ai-agent-system';

// ============================================================================
// TIPOS
// ============================================================================

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  execution?: AgentExecution
  isStreaming?: boolean
}

export interface CommandSuggestion {
  command: string
  description: string
  agentId: string
}
