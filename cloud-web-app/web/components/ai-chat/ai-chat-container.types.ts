export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
}

export type ProviderGateState = {
  code: string
  message: string
  capability?: string
  setupUrl?: string
}
