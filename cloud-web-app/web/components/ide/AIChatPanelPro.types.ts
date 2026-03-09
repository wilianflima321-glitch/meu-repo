export interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

export interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
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

export interface ChatThread {
  id: string
  title: string
  lastMessage: string
  updatedAt: Date
  messageCount: number
  isArchived?: boolean
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

export interface CodebaseContextPreviewItem {
  id: string
  filePath: string
  score: number
  excerpt: string
  startLine: number
  endLine: number
  language: string
}

export interface CodebaseContextPreview {
  loading: boolean
  error?: string | null
  scope?: 'project' | 'repository'
  source?: 'local-transient' | 'local-persistent-cache'
  incrementalReindex?: boolean
  blockers?: string[]
  stats?: {
    filesIndexed: number
    chunksIndexed: number
    indexedAt: string
    changedFiles: number
    reusedFiles: number
  }
  results: CodebaseContextPreviewItem[]
}

export interface MentionContextPreviewBlock {
  tag: string
  kind: 'codebase' | 'docs' | 'file' | 'folder' | 'git' | 'error'
  content: string
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
  threads?: ChatThread[]
  activeThreadId?: string
  onSelectThread?: (threadId: string) => void
  onCreateThread?: () => void
  onArchiveThread?: (threadId: string) => void
  onDeleteThread?: (threadId: string) => void
  showHistory?: boolean
  onToggleHistory?: () => void
  isLiveMode?: boolean
  onToggleLiveMode?: () => void
  liveStatus?: 'idle' | 'listening' | 'thinking' | 'speaking'
  allowAttachments?: boolean
  projectId?: string
  codebaseContextPreview?: CodebaseContextPreview
}

export const DEFAULT_MODELS: ModelOption[] = [
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'OpenRouter',
    description: 'Low-cost routed default for broad interactive work',
    maxTokens: 1000000,
    supportsVision: false,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (Routed)',
    provider: 'OpenRouter',
    description: 'OpenAI-compatible routed model',
    maxTokens: 128000,
    supportsVision: false,
  },
  {
    id: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku (Routed)',
    provider: 'OpenRouter',
    description: 'Anthropic-quality routed model',
    maxTokens: 200000,
    supportsVision: false,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Most capable model',
    maxTokens: 128000,
    supportsVision: true,
    supportsVoice: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    description: 'Fast and efficient',
    maxTokens: 128000,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    description: 'Balanced performance',
    maxTokens: 200000,
    supportsVision: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    description: 'Live multimodal',
    maxTokens: 1000000,
    supportsVision: true,
    supportsVoice: true,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    description: 'Multimodal',
    maxTokens: 1000000,
    supportsVision: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    description: 'Reasoning model',
    maxTokens: 64000,
  },
]
