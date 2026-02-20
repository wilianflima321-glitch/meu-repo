/**
 * AI Chat Panel Pro types and defaults
 */

// ============= Web Speech API Type Declarations =============

// TypeScript declarations for Web Speech API (not fully standardized yet)
export interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

export interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionEventExtended extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventExtended) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

// ============= Types =============

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  tokens?: number
  codeBlocks?: CodeBlock[]
  isVoice?: boolean
  audioUrl?: string
  thinking?: string
  toolCalls?: ToolCall[]
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  type: 'file' | 'image' | 'code'
  name: string
  size?: number
  url?: string
  preview?: string
}

export interface ToolCall {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  args?: Record<string, unknown>
  result?: string
  duration?: number
}

export interface CodeBlock {
  language: string
  code: string
  filename?: string
}

export interface ChatThread {
  id: string
  title: string
  lastMessage: string
  updatedAt: Date
  messageCount: number
  isArchived?: boolean
}

export interface AIChatPanelProps {
  messages?: Message[]
  onSendMessage?: (message: string, context?: MessageContext) => void
  onRegenerateResponse?: (messageId: string) => void
  onRateResponse?: (messageId: string, rating: 'up' | 'down') => void
  onClearChat?: () => void
  currentModel?: string
  models?: ModelOption[]
  onModelChange?: (model: string) => void
  isLoading?: boolean
  streamingContent?: string
  className?: string
  // New props for advanced features
  threads?: ChatThread[]
  activeThreadId?: string
  onSelectThread?: (threadId: string) => void
  onCreateThread?: () => void
  onArchiveThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
  showHistory?: boolean
  onToggleHistory?: () => void
  // Live mode props
  isLiveMode?: boolean
  onToggleLiveMode?: () => void
  liveStatus?: 'idle' | 'listening' | 'thinking' | 'speaking'
  allowAttachments?: boolean
}

export interface MessageContext {
  files?: string[]
  selection?: string
  image?: string
  attachments?: Attachment[]
}

export interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
  maxTokens?: number
  supportsVision?: boolean
  supportsVoice?: boolean
}

// ============= Constants =============

export const DEFAULT_MODELS: ModelOption[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable model', maxTokens: 128000, supportsVision: true, supportsVoice: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and efficient', maxTokens: 128000, supportsVision: true },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Balanced performance', maxTokens: 200000, supportsVision: true },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Live multimodal', maxTokens: 1000000, supportsVision: true, supportsVoice: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Multimodal', maxTokens: 1000000, supportsVision: true },
  { id: 'deepseek-chat', name: 'DeepSeek R1', provider: 'DeepSeek', description: 'Reasoning model', maxTokens: 64000 },
]

export const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m your AI assistant. I can help you with:\n\n- **Code explanation** - Understand complex code\n- **Bug detection** - Find issues in your code\n- **Optimization** - Improve performance\n- **Code generation** - Write new code\n\nHow can I help you today?',
    timestamp: new Date(Date.now() - 60000),
    model: 'gpt-4o',
  },
]
