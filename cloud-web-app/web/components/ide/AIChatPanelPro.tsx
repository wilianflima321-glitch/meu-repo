'use client'
import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  AlertTriangle,
  Code,
  Lightbulb,
  Bug,
  Zap,
  MessageSquare,
  Trash2,
  Settings,
  ChevronDown,
  Paperclip,
  Image,
  Mic,
  MicOff,
  StopCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  History,
  Wand2,
  Brain,
  Layers,
  Terminal,
  Radio,
  Phone,
  Upload,
  File,
  ImageIcon,
} from 'lucide-react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
  type Attachment,
  type ChatThread,
  type CodebaseContextPreview,
  type MentionContextPreviewBlock,
  type Message,
  type MessageContext,
  type ModelOption,
  type SpeechRecognitionEventExtended,
  type SpeechRecognitionInstance,
  type ToolCall,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { CodebaseContextPanel, MentionContextPanel } from './AIChatContextPanels'
import {
  AttachmentPreview,
  ChatHistorySidebar,
  LiveModeIndicator,
  ThinkingDisplay,
  ToolCallDisplay,
} from './AIChatPanelChrome'
import { MentionChip, SuggestionList, useMentions } from '@/lib/copilot/mention-parser'

const QUICK_PROMPTS = [
  { icon: Brain, label: 'Explicar erro', prompt: 'Explique este erro e como corrigir:' },
  { icon: Bug, label: 'Corrigir arquivo', prompt: 'Corrija problemas neste arquivo:' },
  { icon: Zap, label: 'Otimizar', prompt: 'Otimize este codigo para desempenho:' },
  { icon: Wand2, label: 'Refatorar', prompt: 'Refatore este codigo:' },
  { icon: Layers, label: 'Gerar testes', prompt: 'Gere testes unitarios para:' },
  { icon: Code, label: 'Explicar codigo', prompt: 'Explique este codigo:' },
  { icon: Lightbulb, label: 'Melhorar UX', prompt: 'Sugira melhorias de UX para:' },
  { icon: Terminal, label: 'Gerar modulo', prompt: 'Gere um modulo para:' },
]

const QUICK_MENTIONS = [
  { label: '@codebase', value: '@codebase ' },
  { label: '@docs:api', value: '@docs:api ' },
  { label: '@git:diff', value: '@git:diff ' },
  { label: '@diagnostics', value: '@diagnostics ' },
]

const formatCost = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) return null
  if (value >= 10) return `$${value.toFixed(0)}`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}
function useVoiceRecording() {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const startRecording = useCallback(async () => {
    try {
      setVoiceError(null)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognitionAPI() as SpeechRecognitionInstance
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'pt-BR'
        recognitionRef.current.onresult = (event: SpeechRecognitionEventExtended) => {
          let interimTranscript = ''
          let finalTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }
          setTranscript(finalTranscript || interimTranscript)
        }
        recognitionRef.current.onerror = () => {
          setVoiceError('Falha ao transcrever. Verifique permissao do microfone.')
        }
        recognitionRef.current.start()
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      chunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setVoiceError('Nao foi possivel iniciar a captura de voz. Verifique as permissoes do navegador.')
    }
  }, [])
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [isRecording])
  const clearRecording = useCallback(() => {
    setAudioBlob(null)
    setTranscript('')
  }, [])
  const clearVoiceError = useCallback(() => {
    setVoiceError(null)
  }, [])
  return {
    isRecording,
    audioBlob,
    transcript,
    isTranscribing,
    voiceError,
    startRecording,
    stopRecording,
    clearRecording,
    clearVoiceError,
  }
}
const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Ola! Sou seu assistente de IA. Posso ajudar com:\n\n- **Explicacao de codigo** - entender trechos complexos\n- **Deteccao de bugs** - encontrar problemas no seu projeto\n- **Otimizacao** - melhorar desempenho\n- **Geracao de codigo** - criar novas rotinas\n\nComo posso ajudar hoje?',
    timestamp: new Date(Date.now() - 60000),
    model: DEFAULT_OPENROUTER_MODEL_ID,
  },
]
interface MessageBubbleProps {
  message: Message
  onCopy: (content: string) => void
  onRegenerate: () => void
  onRate: (rating: 'up' | 'down') => void
}
function MessageBubble({ message, onCopy, onRegenerate, onRate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [showThinking, setShowThinking] = useState(false)
  const isUser = message.role === 'user'
  const handleCopy = () => {
    onCopy(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/)
        if (match) {
          const [, language = 'text', code] = match
          return (
            <div key={i} className="my-3 overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(16,22,34,0.88))]">
              <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-1.5">
                <span className="text-xs text-[var(--aethel-text-tertiary)]">{language}</span>
                <button
                  onClick={() => onCopy(code)}
                  className="rounded p-1 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] hover:text-[var(--aethel-text-primary)]"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-sm">
                <code className="text-[var(--aethel-text-secondary)]">{code}</code>
              </pre>
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                <button
                  type="button"
                  disabled
                  className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
                  title="Requer integracao com o editor"
                  aria-disabled="true"
                >
                  Aplicar no editor
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
                  title="Requer integracao com o editor"
                  aria-disabled="true"
                >
                  Abrir diff
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
                  title="Requer integracao com o editor"
                  aria-disabled="true"
                >
                  Criar arquivo
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] opacity-60 cursor-not-allowed"
                  title="Requer integracao com o editor"
                  aria-disabled="true"
                >
                  Inserir selecao
                </button>
                <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
                  Integracao do editor pendente
                </span>
              </div>
            </div>
          )
        }
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.split('\n').map((line, j) => (
            <span key={j}>
              {line.startsWith('- ') ? (
                <span className="relative block pl-4 before:absolute before:left-0 before:text-[var(--aethel-text-quaternary)] before:content-['-']">
                  {line.slice(2)}
                </span>
              ) : line.startsWith('**') && line.endsWith('**') ? (
                <strong>{line.slice(2, -2)}</strong>
              ) : (
                line
              )}
              {j < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      )
    })
  }
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser ? 'bg-[var(--aethel-primary)]' : 'bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)]'}
      `}>
        {isUser ? <User className="w-4 h-4 text-[var(--aethel-text-primary)]" /> : <Bot className="w-4 h-4 text-[var(--aethel-text-primary)]" />}
      </div>
      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {/* Voice indicator */}
        {message.isVoice && (
          <div className="flex items-center gap-1 mb-1 text-xs text-[var(--aethel-info-light)]">
            <Mic className="w-3 h-3" />
            Mensagem de voz
          </div>
        )}
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_48%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
                {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <File className="w-3 h-3" />}
                {att.name}
              </div>
            ))}
          </div>
        )}
        {/* Thinking display */}
        {message.thinking && (
          <ThinkingDisplay
            thinking={message.thinking}
            isExpanded={showThinking}
            onToggle={() => setShowThinking(!showThinking)}
          />
        )}
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        <div className={`
          inline-block max-w-full text-left px-4 py-2.5 rounded-2xl
          ${isUser
            ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] rounded-tr-sm'
            : 'rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] text-[var(--aethel-text-secondary)]'
          }
        `}>
          <div className="text-sm">{renderContent(message.content)}</div>
        </div>
        {/* Meta & Actions */}
        <div className={`mt-1 flex items-center gap-2 text-xs text-[var(--aethel-text-quaternary)] ${isUser ? 'justify-end' : ''}`}>
          {message.model && (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {message.model}
            </span>
          )}
          {message.tokens && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {message.tokens} tokens
            </span>
          )}
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleCopy}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Copiar"
                aria-label="Copiar resposta"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--aethel-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onRegenerate}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Regerar"
                aria-label="Regerar resposta"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRate('up')}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Resposta boa"
                aria-label="Resposta boa"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRate('down')}
                className="rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Resposta ruim"
                aria-label="Resposta ruim"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default function AIChatPanelPro({
  messages = DEMO_MESSAGES,
  onSendMessage,
  onRegenerateResponse,
  onRateResponse,
  onClearChat,
  currentModel = DEFAULT_OPENROUTER_MODEL_ID,
  models = DEFAULT_MODELS,
  onModelChange,
  isLoading = false,
  streamingContent = '',
  className = '',
  threads = [],
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onArchiveThread,
  onDeleteThread,
  showHistory = false,
  onToggleHistory,
  isLiveMode = false,
  onToggleLiveMode,
  liveStatus = 'idle',
  allowAttachments = false,
  projectId,
  codebaseContextPreview,
}: AIChatPanelProps) {
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)
  const [agentCount, setAgentCount] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { isRecording, transcript, voiceError, startRecording, stopRecording, clearRecording, clearVoiceError } = useVoiceRecording()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const mentionState = useMentions('')
  const [localCodebaseContextPreview, setLocalCodebaseContextPreview] = useState<CodebaseContextPreview>({
    loading: false,
    results: [],
  })
  const [mentionContextPreview, setMentionContextPreview] = useState<{
    loading: boolean
    error?: string | null
    blocks: MentionContextPreviewBlock[]
  }>({
    loading: false,
    blocks: [],
  })
  const [codebaseRefreshNonce, setCodebaseRefreshNonce] = useState(0)
  const input = mentionState.text
  const inputRef = mentionState.inputRef

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px'
    }
  }, [input, inputRef])
  useEffect(() => {
    if (transcript) {
      const nextValue = input.trim() ? `${input} ${transcript}` : transcript
      mentionState.replaceText(nextValue)
    }
  }, [input, mentionState, transcript])

  useEffect(() => {
    const normalizedInput = input.trim()
    const shouldFetch = normalizedInput.toLowerCase().includes('@codebase')

    if (!shouldFetch) {
      setLocalCodebaseContextPreview((prev) => (
        prev.loading || prev.results.length > 0 || prev.error
          ? { loading: false, results: [] }
          : prev
      ))
      return
    }

    const semanticQuery = normalizedInput
      .replace(/@codebase/gi, ' ')
      .replace(/@(docs|file|folder|git):[^\s]+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setLocalCodebaseContextPreview((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await fetch('/api/ai/context/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: semanticQuery || 'project architecture entry points current implementation',
            projectId,
            maxResults: 4,
            invalidateCache: codebaseRefreshNonce > 0,
          }),
          signal: controller.signal,
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'CONTEXT_SEARCH_FAILED')
        }

        setLocalCodebaseContextPreview({
          loading: false,
          error: null,
          results: Array.isArray(payload?.results) ? payload.results : [],
          scope: payload?.readiness?.scope,
          source: payload?.readiness?.source,
          incrementalReindex: Boolean(payload?.readiness?.incrementalReindex),
          blockers: Array.isArray(payload?.readiness?.blockers) ? payload.readiness.blockers : [],
          stats: payload?.stats ?? undefined,
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setLocalCodebaseContextPreview({
          loading: false,
          results: [],
          error: error instanceof Error ? error.message : 'CONTEXT_SEARCH_FAILED',
        })
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [codebaseRefreshNonce, input, projectId])

  useEffect(() => {
    const contextualMentions = mentionState.parsed.mentions.filter(
      (mention) => mention.type === 'docs' || mention.type === 'file' || mention.type === 'folder' || mention.type === 'git'
    )

    if (contextualMentions.length === 0) {
      setMentionContextPreview((prev) =>
        prev.loading || prev.blocks.length > 0 || prev.error
          ? { loading: false, blocks: [] }
          : prev
      )
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setMentionContextPreview((prev) => ({ ...prev, loading: true, error: null }))
      try {
        const response = await fetch('/api/ai/context/mentions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: input,
            projectId,
          }),
          signal: controller.signal,
        })

        const payload = await response.json()
        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'MENTION_CONTEXT_FAILED')
        }

        setMentionContextPreview({
          loading: false,
          error: null,
          blocks: Array.isArray(payload?.blocks)
            ? payload.blocks.filter((block: MentionContextPreviewBlock) => block.kind !== 'codebase')
            : [],
        })
      } catch (error) {
        if (controller.signal.aborted) return
        setMentionContextPreview({
          loading: false,
          blocks: [],
          error: error instanceof Error ? error.message : 'MENTION_CONTEXT_FAILED',
        })
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [input, mentionState.parsed.mentions, projectId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onFileMutation = (event: Event) => {
      const detail = (event as CustomEvent<{ projectId?: string; operation?: string }>).detail
      const matchesProject =
        !projectId ||
        !detail?.projectId ||
        detail.projectId === projectId

      if (!matchesProject) return
      if (!input.toLowerCase().includes('@codebase')) return
      setCodebaseRefreshNonce((prev) => prev + 1)
    }

    window.addEventListener('aethel.ide.fileMutation', onFileMutation as EventListener)
    return () => {
      window.removeEventListener('aethel.ide.fileMutation', onFileMutation as EventListener)
    }
  }, [input, projectId])
  const speakMessage = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      speechSynthRef.current = new SpeechSynthesisUtterance(text)
      speechSynthRef.current.lang = 'pt-BR'
      speechSynthRef.current.onend = () => setIsSpeaking(false)
      speechSynthRef.current.onerror = () => setIsSpeaking(false)
      window.speechSynthesis.speak(speechSynthRef.current)
      setIsSpeaking(true)
    }
  }, [])
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])
  const handleSend = useCallback((e?: FormEvent) => {
    e?.preventDefault()
    const normalizedInput = input.trim()
    if (!normalizedInput || isLoading) return
    const hasAgentTag = /@agents:[123]/i.test(normalizedInput)
    const messageWithAgents = agentCount > 1 && !hasAgentTag
      ? `@agents:${agentCount} ${normalizedInput}`
      : normalizedInput
    onSendMessage?.(messageWithAgents, {
      attachments: allowAttachments && attachments.length > 0 ? attachments : undefined,
    })
    mentionState.replaceText('')
    setAttachments([])
    clearRecording()
  }, [agentCount, input, isLoading, attachments, onSendMessage, clearRecording, allowAttachments, mentionState])
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    mentionState.handleKeyDown(e)
    if (e.defaultPrevented) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }
  const handleImageAttach = () => {
    imageInputRef.current?.click()
  }
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = e.target.files?.[0]
    if (file) {
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        size: file.size,
      }
      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (ev) => {
          attachment.preview = ev.target?.result as string
          setAttachments(prev => [...prev, attachment])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachments(prev => [...prev, attachment])
      }
    }
    e.target.value = ''
  }
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }
  const handleQuickPrompt = (prompt: string) => {
    const nextValue = input ? `${input}\n\n${prompt}` : prompt
    mentionState.replaceText(nextValue)
    inputRef.current?.focus()
  }
  const insertQuickMention = (mentionValue: string) => {
    const cursorPosition = inputRef.current?.selectionStart ?? input.length
    const nextValue = `${input.slice(0, cursorPosition)}${mentionValue}${input.slice(cursorPosition)}`
    mentionState.replaceText(nextValue)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      const nextCursor = cursorPosition + mentionValue.length
      inputRef.current?.setSelectionRange(nextCursor, nextCursor)
    })
  }
  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }
  const handleRefreshCodebaseContext = useCallback(() => {
    setCodebaseRefreshNonce((prev) => prev + 1)
  }, [])
  const handleOpenCodeContextResult = useCallback((filePath: string, startLine?: number, endLine?: number) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('aethel.ide.openFileFromContext', {
      detail: {
        path: filePath,
        startLine,
        endLine,
        source: 'ai-codebase-context',
      },
    }))
  }, [])
  const handleOpenMentionContextBlock = useCallback((block: MentionContextPreviewBlock) => {
    if (block.kind !== 'file') return
    const normalizedPath = block.tag.replace(/^@file:/i, '').trim()
    if (!normalizedPath || typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('aethel.ide.openFileFromContext', {
      detail: {
        path: normalizedPath,
        source: 'ai-mention-context',
      },
    }))
  }, [])
  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }
  const selectedModel = models.find(m => m.id === currentModel) || models[0]
  const inputCostLabel = formatCost(selectedModel?.inputCost)
  const outputCostLabel = formatCost(selectedModel?.outputCost)
  const modelTierLabel = selectedModel?.tier?.toUpperCase() ?? 'BUDGET'
  const visibleCodebaseContextPreview = codebaseContextPreview ?? localCodebaseContextPreview
  return (
    <div className={`h-full flex ${className}`}>
      {/* History Sidebar */}
      {showHistorySidebar && threads.length > 0 && onSelectThread && onCreateThread && onArchiveThread && onDeleteThread && (
        <ChatHistorySidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={onSelectThread}
          onCreateThread={onCreateThread}
          onArchiveThread={onArchiveThread}
          onDeleteThread={onDeleteThread}
          onClose={() => setShowHistorySidebar(false)}
        />
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Live Mode Indicator */}
        {isLiveMode && onToggleLiveMode && (
          <LiveModeIndicator status={liveStatus} onEnd={onToggleLiveMode} />
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--aethel-border-secondary)] px-3 py-2">
          {/* Left: History + Model */}
          <div className="flex items-center gap-2">
            {threads.length > 0 && (
              <button
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className={`rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] ${showHistorySidebar ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)] text-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'}`}
                title="Historico do chat"
                aria-label="Alternar historico do chat"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            {/* Model Selector */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="relative">
                  <button
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                  >
                    <Sparkles className="w-4 h-4 text-[var(--aethel-info-light)]" />
                    <span>{selectedModel.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                  </button>
                  {showModelSelector && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowModelSelector(false)} />
                      <div className="absolute left-0 top-full z-50 mt-1 min-w-72 rounded-lg border border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,22,34,0.98),rgba(10,14,24,0.94))] py-1 shadow-[0_24px_80px_rgba(2,6,23,0.48)]">
                        {models.map(model => (
                          <button
                            key={model.id}
                            onClick={() => {
                              onModelChange?.(model.id)
                              setShowModelSelector(false)
                            }}
                            className={`
                              w-full flex items-start gap-3 px-3 py-2 text-left
                              ${model.id === currentModel ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)]'}
                            `}
                          >
                            <Sparkles className={`mt-0.5 h-4 w-4 ${model.id === currentModel ? 'text-[var(--aethel-info)]' : 'text-[var(--aethel-text-quaternary)]'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{model.name}</span>
                                <span className="text-xs text-[var(--aethel-text-quaternary)]">{model.provider}</span>
                                {model.tier && (
                                  <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_68%,transparent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--aethel-text-secondary)]">
                                    {model.tier}
                                  </span>
                                )}
                                {model.supportsVision && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)] rounded">Visao</span>
                                )}
                                {model.supportsVoice && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success)] rounded">Voz</span>
                                )}
                              </div>
                              {model.description && (
                                <span className="text-xs text-[var(--aethel-text-tertiary)]">{model.description}</span>
                              )}
                              {model.inputCost !== undefined && model.outputCost !== undefined && (
                                <span className="text-[11px] text-[var(--aethel-text-quaternary)]">
                                  {formatCost(model.inputCost)}/{formatCost(model.outputCost)} por 1M
                                </span>
                              )}
                            </div>
                            {model.id === currentModel && <Check className="w-4 h-4 text-[var(--aethel-info-light)]" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {showAdvancedControls ? (
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                    <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-1.5 py-0.5 uppercase tracking-wide text-[var(--aethel-text-secondary)]">
                      {modelTierLabel}
                    </span>
                    {inputCostLabel && outputCostLabel && (
                      <span>{inputCostLabel}/{outputCostLabel} por 1M</span>
                    )}
                    {agentCount > 1 && (
                      <span className="text-[var(--aethel-text-quaternary)]">x{agentCount} agentes</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-0.5 text-[11px] text-[var(--aethel-text-quaternary)]">Modo basico</div>
                )}
              </div>
              {showAdvancedControls && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[var(--aethel-text-quaternary)]">Agentes</span>
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      onClick={() => setAgentCount(count)}
                      className={`px-2 py-0.5 text-[11px] rounded border ${
                        agentCount === count
                          ? 'border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
                          : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)] hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1">
            {showAdvancedControls && (
              <>
                {/* Live Mode Toggle */}
                {selectedModel.supportsVoice && onToggleLiveMode && (
                  <button
                    onClick={onToggleLiveMode}
                    className={`rounded p-1.5 ${isLiveMode ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
                    title={isLiveMode ? 'Sair do modo live' : 'Entrar no modo live (voz em tempo real)'}
                    aria-label={isLiveMode ? 'Sair do modo live' : 'Entrar no modo live'}
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}
                {/* TTS Toggle */}
                <button
                  onClick={isSpeaking ? stopSpeaking : () => {
                    const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop()
                    if (lastAssistantMsg) speakMessage(lastAssistantMsg.content)
                  }}
                  className={`rounded p-1.5 ${isSpeaking ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
                  title={isSpeaking ? 'Parar leitura' : 'Ler ultima resposta'}
                  aria-label={isSpeaking ? 'Parar leitura' : 'Ler ultima resposta'}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}
            <button
              onClick={onClearChat}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
              title="Limpar chat"
              aria-label="Limpar chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdvancedControls((prev) => !prev)}
              className={`rounded p-1.5 ${showAdvancedControls ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
              title={showAdvancedControls ? 'Ocultar avancado' : 'Mostrar avancado'}
              aria-pressed={showAdvancedControls}
              aria-label={showAdvancedControls ? 'Ocultar avancado' : 'Mostrar avancado'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-[var(--aethel-text-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--aethel-text-primary)] mb-2">Assistente de IA</h3>
              <p className="mb-6 max-w-sm text-sm text-[var(--aethel-text-tertiary)]">
                Selecione um arquivo, cole um erro ou use @codebase para iniciar. Eu explico, depuro e gero trechos sob demanda.
              </p>
              {selectedModel.supportsVoice && (
                <p className="text-xs text-[var(--aethel-info-light)] mb-4 flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  Este modelo suporta modo live para voz em tempo real
                </p>
              )}
              {showAdvancedControls ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)]"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdvancedControls(true)}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                >
                  Mostrar atalhos avancados
                </button>
              )}
            </div>
        )}
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onCopy={handleCopy}
            onRegenerate={() => onRegenerateResponse?.(message.id)}
            onRate={(rating) => onRateResponse?.(message.id, rating)}
          />
        ))}
        {/* Streaming response */}
        {streamingContent && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-[var(--aethel-text-primary)] animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-block max-w-full rounded-2xl rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] px-4 py-2.5 text-left text-[var(--aethel-text-secondary)]">
                <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                <span className="inline-block w-2 h-4 bg-[var(--aethel-info-light)] animate-pulse ml-1" />
              </div>
            </div>
          </div>
        )}
        {/* Loading indicator */}
        {isLoading && !streamingContent && (
          <div className="flex gap-3" role="status" aria-live="polite" aria-label="Gerando resposta">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-[var(--aethel-text-primary)] animate-pulse" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_86%,transparent)] px-4 py-3">
              <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--aethel-text-quaternary)]" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* Quick prompts bar */}
      {showAdvancedControls && (
        <div className="border-t border-[var(--aethel-border-secondary)] px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => handleQuickPrompt(prompt)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] px-2.5 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)]"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
        {/* Input area */}
      <form onSubmit={handleSend} className="border-t border-[var(--aethel-border-secondary)] p-3">
        {mentionState.parsed.mentions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {mentionState.parsed.mentions.map((mention, index) => (
              <MentionChip key={`${mention.displayName}-${index}`} mention={mention} />
            ))}
          </div>
        )}
        {/* Attachments preview */}
        {allowAttachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachments.map(att => (
              <AttachmentPreview
                key={att.id}
                attachment={att}
                onRemove={() => removeAttachment(att.id)}
              />
            ))}
          </div>
        )}
        {/* Voice recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] rounded-lg" role="status" aria-live="polite">
            <div className="w-2 h-2 bg-[var(--aethel-error)] rounded-full animate-pulse" />
            <span className="flex-1 text-sm text-[var(--aethel-error)]">Gravando... {transcript && `"${transcript}"`}</span>
            <button
              type="button"
              onClick={stopRecording}
              className="px-2 py-1 bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] rounded text-xs text-[var(--aethel-error)]"
            >
              Parar
            </button>
          </div>
        )}
        {voiceError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-warning)]" role="alert" aria-live="polite">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="flex-1">{voiceError}</span>
            <button
              type="button"
              onClick={clearVoiceError}
              className="rounded px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
            >
              Fechar
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* Attach buttons */}
          <div className="flex items-center gap-1 pb-1">
            {allowAttachments && (
              <button
                type="button"
                onClick={handleFileAttach}
                className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Anexar arquivo"
                aria-label="Anexar arquivo"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            {allowAttachments && selectedModel.supportsVision && (
              <button
                type="button"
                onClick={handleImageAttach}
                className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
                title="Anexar imagem"
                aria-label="Anexar imagem"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`rounded p-1.5 ${isRecording ? 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
              title={isRecording ? 'Parar gravacao' : 'Entrada de voz'}
              aria-label={isRecording ? 'Parar gravacao' : 'Entrada de voz'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          {/* Input */}
          <div className="flex-1 relative">
            {mentionState.showSuggestions && mentionState.suggestions.length > 0 && (
              <SuggestionList
                suggestions={mentionState.suggestions}
                activeIndex={mentionState.activeSuggestionIndex}
                onSelect={mentionState.applySuggestion}
                onHover={mentionState.setActiveSuggestionIndex}
                listboxId="mention-suggestions-list"
              />
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => mentionState.setText(e.target.value, e.target.selectionStart ?? e.target.value.length)}
              onKeyDown={handleComposerKeyDown}
              placeholder={isRecording ? 'Ouvindo...' : 'Pergunte a IA sobre o seu codigo...'}
              disabled={isLoading}
              aria-controls="mention-suggestions-list"
              aria-label="Mensagem do chat"
              className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-4 py-2.5 pr-12 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] focus:outline-none"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`
                absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors
                ${input.trim() && !isLoading
                  ? 'bg-[var(--aethel-primary)] hover:brightness-110 text-[var(--aethel-text-primary)]'
                  : 'cursor-not-allowed bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_72%,transparent)] text-[var(--aethel-text-quaternary)]'
                }
              `}
              aria-label={isLoading ? 'Parar resposta' : 'Enviar mensagem'}
              title={isLoading ? 'Parar resposta' : 'Enviar mensagem'}
            >
              {isLoading ? (
                <StopCircle className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {showAdvancedControls && (
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_MENTIONS.map((mention) => (
              <button
                key={mention.label}
                type="button"
                onClick={() => insertQuickMention(mention.value)}
                className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)]"
              >
                {mention.label}
              </button>
            ))}
          </div>
        )}
        <CodebaseContextPanel
          input={input}
          preview={visibleCodebaseContextPreview}
          onRefresh={handleRefreshCodebaseContext}
          onCopy={handleCopy}
          onOpenResult={handleOpenCodeContextResult}
        />
        <MentionContextPanel
          preview={mentionContextPreview}
          onCopy={handleCopy}
          onOpenFileBlock={handleOpenMentionContextBlock}
        />
        {/* Hidden file inputs */}
        {allowAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".ts,.tsx,.js,.jsx,.json,.md,.txt,.py,.css,.html"
              onChange={(e) => handleFileSelect(e, 'file')}
            />
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'image')}
            />
          </>
        )}
      </form>
      </div>
    </div>
  )
}
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
