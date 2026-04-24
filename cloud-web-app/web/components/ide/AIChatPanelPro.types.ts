import type { AIChatConsoleMode } from '@/components/ai-chat/presets'
import {
  OPENROUTER_BEST_MODELS_SORTED,
  OPENROUTER_BUDGET_MODELS_SORTED,
  OPENROUTER_FREE_MODELS_SORTED,
  type OpenRouterModel,
} from '@/lib/ai/openrouter-models'

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
  consoleMode?: AIChatConsoleMode
}

export interface ModelOption {
  id: string
  name: string
  provider: string
  description?: string
  maxTokens?: number
  supportsVision?: boolean
  supportsVoice?: boolean
  inputCost?: number
  outputCost?: number
  tier?: 'free' | 'budget' | 'best'
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
  onInterrupt?: () => void
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

const toModelOption = (tierLabel: 'Free' | 'Budget' | 'Best') => (model: OpenRouterModel) => ({
  id: model.id,
  name: model.name,
  provider: 'OpenRouter',
  description: `${tierLabel} - ${model.description}`,
  maxTokens: model.contextWindow,
  supportsVision: model.supportsVision,
  supportsVoice: false,
  inputCost: model.inputCost,
  outputCost: model.outputCost,
  tier: model.tier,
})

export const DEFAULT_MODELS: ModelOption[] = [
  ...OPENROUTER_FREE_MODELS_SORTED.map(toModelOption('Free')),
  ...OPENROUTER_BUDGET_MODELS_SORTED.map(toModelOption('Budget')),
  ...OPENROUTER_BEST_MODELS_SORTED.map(toModelOption('Best')),
]
