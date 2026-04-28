import type { AIChatResearchArtifact, AIChatTraceArtifact } from '@/components/ai-chat/ai-chat-evidence'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  traceArtifact?: AIChatTraceArtifact | null
  researchArtifact?: AIChatResearchArtifact | null
}

export type ProviderGateState = {
  code: string
  message: string
  capability?: string
  setupUrl?: string
}
