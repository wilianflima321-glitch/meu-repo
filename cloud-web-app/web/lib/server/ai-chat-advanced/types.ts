import type { ToolResult } from '@/lib/ai-tools-registry'
import type { AITraceSummary } from '@/lib/ai-internal-trace'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

export interface AdvancedChatRequest {
  messages: ChatMessage[]
  projectId?: string
  agentId?: string
  useTools?: boolean
  model?: string
  qualityMode?: 'standard' | 'delivery' | 'studio'
  enableWebResearch?: boolean
  agentCount?: 1 | 2 | 3
  roleModels?: {
    architect?: string
    engineer?: string
    critic?: string
  }
  stream?: boolean
  includeTrace?: boolean
}

export interface ChatResponse {
  message: ChatMessage
  tokensUsed: number
  roleUsage?: {
    architect?: { model: string; tokensUsed: number; latencyMs?: number }
    engineer?: { model: string; tokensUsed: number; latencyMs?: number }
    critic?: { model: string; tokensUsed: number; latencyMs?: number }
  }
  toolsExecuted?: { name: string; result: ToolResult }[]
  agentExecution?: {
    steps: number
    artifacts: number
  }
  traceId?: string
  traceSummary?: AITraceSummary
}
