'use client'
import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import { ptBR } from '@/lib/locales/pt-BR'
import {
  Send,
  Bot,
  Sparkles,
  Check,
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
  Mic,
  MicOff,
  StopCircle,
  Play,
  Volume2,
  VolumeX,
  History,
  Wand2,
  Brain,
  Layers,
  Terminal,
  Radio,
  ImageIcon,
  ClipboardList,
} from 'lucide-react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
  type Attachment,
  type MentionContextPreviewBlock,
  type Message,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { CodebaseContextPanel, MentionContextPanel } from './AIChatContextPanels'
import {
  AttachmentPreview,
  ChatHistorySidebar,
  LiveModeIndicator,
} from './AIChatPanelChrome'
import { MemoryPanel } from './MemoryPanel'
import { ApprovalCard } from './ApprovalCard'
const MonacoChatDiffPanel = dynamic(
  () => import('./MonacoChatDiffPanel').then((m) => m.MonacoChatDiffPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-[11px] text-[var(--aethel-text-tertiary)]">
        A carregar comparador Monaco...
      </div>
    ),
  }
)
import { TaskOpsPanel } from './TaskOpsPanel'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { MentionChip, SuggestionList, useMentions } from '@/lib/copilot/mention-parser'
import { MessageBubble } from '@/components/ai-chat/MessageBubble'
import { RunCard } from '@/components/ai-chat/RunCard'
import { AgentBoard, type AgentInfo } from '@/components/ai-chat/AgentBoard'
import { LiveConversationPanel } from '@/components/ai-chat/LiveConversationPanel'
import { useChatContextPreviews } from '@/components/ai-chat/useChatContextPreviews'
import { useVoiceRecording } from '@/components/ai-chat/useVoiceRecording'
import { formatCost } from '@/components/ai-chat/chat-utils'

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

const t = ptBR.ide.ai.console
const tc = ptBR.common
const ta = ptBR.ide.ai

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Ola! Sou seu assistente de IA. Posso ajudar com:\n\n- **Explicacao de codigo** - entender trechos complexos\n- **Deteccao de bugs** - encontrar problemas no seu codigo\n- **Otimizacao** - melhorar performance\n- **Geracao de codigo** - escrever codigo novo\n\nComo posso ajudar voce hoje?',
    timestamp: new Date(Date.now() - 60000),
    model: DEFAULT_OPENROUTER_MODEL_ID,
  },
]

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
  const [opsTab, setOpsTab] = useState<'memory' | 'approval' | 'diff' | 'execution'>('memory')
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [consoleMode, setConsoleMode] = useState<'ask' | 'plan' | 'execute' | 'review' | 'live'>('ask')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const lastUserGoal = useMemo(() => {
    const list = messages ?? []
    const last = [...list].reverse().find((item) => item.role === 'user')
    return last?.content?.trim() || ''
  }, [messages])
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)
  const [agentCount, setAgentCount] = useState(1)
  const [isAIWorking, setIsAIWorking] = useState(false)
  const [runStartTime, setRunStartTime] = useState<number | null>(null)
  const [runCost, setRunCost] = useState<number | null>(null)
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const { isRecording, transcript, voiceError, startRecording, stopRecording, clearRecording, clearVoiceError } = useVoiceRecording()
  const [isSpeaking, setIsSpeaking] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null)
  const mentionState = useMentions('')
  const editorBridge = useEditorApplyBridge()
  const input = mentionState.text
  const inputRef = mentionState.inputRef
  const {
    localCodebaseContextPreview,
    mentionContextPreview,
    refreshCodebaseContext: handleRefreshCodebaseContext,
  } = useChatContextPreviews({
    input,
    mentions: mentionState.parsed.mentions,
    projectId,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    if (editorBridge?.pendingDiff) {
      setShowAdvancedControls(true)
      setOpsTab('diff')
    }
  }, [editorBridge?.pendingDiff])

  useEffect(() => {
    const onOpenDiff = () => {
      setShowAdvancedControls(true)
      setOpsTab('diff')
    }
    const onOpenExecution = () => {
      setShowAdvancedControls(true)
      setOpsTab('execution')
    }
    window.addEventListener('aethel.ide.openChatDiff', onOpenDiff)
    window.addEventListener('aethel.ide.openChatExecution', onOpenExecution)
    return () => {
      window.removeEventListener('aethel.ide.openChatDiff', onOpenDiff)
      window.removeEventListener('aethel.ide.openChatExecution', onOpenExecution)
    }
  }, [])

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

  // Control AI working state for live conversation
  useEffect(() => {
    setIsAIWorking(isLoading || streamingContent.length > 0)
    
    // Track run start time
    if (isLoading && !runStartTime) {
      setRunStartTime(Date.now())
    } else if (!isLoading && !streamingContent && runStartTime) {
      setRunStartTime(null)
    }
  }, [isLoading, streamingContent, runStartTime])

  // Calculate run duration and estimated cost
  const runDuration = runStartTime ? (Date.now() - runStartTime) / 1000 : undefined
  const selectedModel = models.find(m => m.id === currentModel) || models[0]
  const estimatedCost = runDuration && selectedModel.outputCost
    ? (runDuration * selectedModel.outputCost * 100) / 1000000 // Rough estimate
    : undefined

  // Simulate agents when multi-agent mode is active
  useEffect(() => {
    if (agentCount > 1 && isAIWorking) {
      const agentRoles = [
        { id: '1', role: 'Architect', name: 'Arquiteto', currentTask: 'Analisando requisitos', dependency: undefined, progress: 75, output: 'Estrutura definida', confidence: 85, cost: 0.0023, status: 'working' as const },
        { id: '2', role: 'Engineer', name: 'Engenheiro', currentTask: 'Implementando componentes', dependency: 'Arquiteto', progress: 45, output: 'Componentes base criados', confidence: 78, cost: 0.0045, status: 'working' as const },
        { id: '3', role: 'QA', name: 'QA', currentTask: 'Aguardando implementação', dependency: 'Engenheiro', progress: 0, output: undefined, confidence: 0, cost: 0.0000, status: 'idle' as const },
      ]
      setAgents(agentRoles.slice(0, agentCount))
    } else {
      setAgents([])
    }
  }, [agentCount, isAIWorking])

  const handleAgentClick = useCallback((agentId: string) => {
    console.log('Agent clicked:', agentId)
    // Would open agent details panel
  }, [])

  const handleLiveInterrupt = useCallback(() => {
    // Trigger interrupt callback if available
    if (onRegenerateResponse) {
      // This would need to be implemented in the parent component
      console.log('Live interrupt triggered')
    }
    setIsAIWorking(false)
  }, [onRegenerateResponse])

  const handleLiveSendMessage = useCallback((message: string) => {
    if (onSendMessage) {
      onSendMessage(message)
    }
  }, [onSendMessage])

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
          const result = ev.target?.result
          if (typeof result === 'string') {
            attachment.preview = result
          }
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
      if (!inputRef.current) return
      inputRef.current.focus()
      const nextCursor = cursorPosition + mentionValue.length
      inputRef.current.setSelectionRange(nextCursor, nextCursor)
    })
  }
  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }
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
  const inputCostLabel =
    selectedModel.inputCost !== undefined ? formatCost(selectedModel.inputCost) : null
  const outputCostLabel =
    selectedModel.outputCost !== undefined ? formatCost(selectedModel.outputCost) : null
  const modelTierLabel = selectedModel.tier?.toUpperCase() ?? 'BUDGET'
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
        <div className="flex flex-col border-b border-[var(--aethel-border-secondary)]">
          {/* Console Mode Tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] border-b border-[var(--aethel-border-secondary)]">
            {[
              { id: 'ask' as const, label: 'Perguntar', icon: MessageSquare, description: 'Perguntas rápidas' },
              { id: 'plan' as const, label: 'Planejar', icon: Layers, description: 'Planejar tarefas' },
              { id: 'execute' as const, label: 'Executar', icon: Play, description: 'Executar plano' },
              { id: 'review' as const, label: 'Revisar', icon: Check, description: 'Revisar mudanças' },
              { id: 'live' as const, label: 'Ao vivo', icon: Radio, description: 'Conversação ao vivo' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setConsoleMode(mode.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${consoleMode === mode.id ?
                     'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] shadow-sm'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'
                  }
                `}
                title={mode.description}
                aria-label={`Modo ${mode.label}: ${mode.description}`}
                aria-pressed={consoleMode === mode.id}
              >
                <mode.icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Header Actions */}
          <div className="flex items-center justify-between px-3 py-2">
          {/* Left: History + Model */}
          <div className="flex items-center gap-2">
            {threads.length > 0 && (
              <button type="button" aria-label="Alternar hist?rico do chat"
                onClick={() => setShowHistorySidebar(!showHistorySidebar)}
                className={`rounded p-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${showHistorySidebar ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)] text-[var(--aethel-info)]' : 'text-[var(--aethel-text-tertiary)]'}`}
                title="Histórico do chat"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            {/* Model Selector */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="relative">
                  <button type="button" aria-label="Abrir seletor de modelo de IA"
                    onClick={() => setShowModelSelector(!showModelSelector)}
                    aria-expanded={showModelSelector}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
                          <button type="button" aria-label={`Select AI model ${model.name}`}
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
                                  <span className="px-1.5 py-0.5 text-[10px] bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)] rounded">Visão</span>
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
                  <div className="mt-0.5 text-[11px] text-[var(--aethel-text-quaternary)]">Modo básico</div>
                )}
              </div>
              {showAdvancedControls && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[var(--aethel-text-quaternary)]">Agentes</span>
                  {[1, 2, 3].map((count) => (
                    <button type="button" aria-label={`Set agent count to ${count}`}
                      key={count}
                      onClick={() => setAgentCount(count)}
                      className={`px-2 py-0.5 text-[11px] rounded border ${
                        agentCount === count ?
                           'border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)] text-[var(--aethel-info-light)]'
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
                  <button type="button" aria-label={isLiveMode ? 'Sair do modo ao vivo' : 'Entrar no modo ao vivo'}
                    onClick={onToggleLiveMode}
                    className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${isLiveMode ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
                    title={isLiveMode ? 'Sair do modo ao vivo' : 'Entrar no modo ao vivo (voz em tempo real)'}
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                )}
                {/* TTS Toggle */}
                <button type="button" aria-label={isSpeaking ? 'Parar leitura' : 'Ler ?ltima resposta'}
                  onClick={isSpeaking ? stopSpeaking : () => {
                    const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop()
                    if (lastAssistantMsg) speakMessage(lastAssistantMsg.content)
                  }}
                  className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${isSpeaking ? 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
                  title={isSpeaking ? 'Parar leitura' : 'Ler última resposta'}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </>
            )}
            <button type="button" aria-label="Limpar chat"
              onClick={onClearChat}
              className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              title="Limpar chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button type="button" aria-label={showAdvancedControls ? 'Ocultar avan?ado' : 'Mostrar avan?ado'}
              onClick={() => setShowAdvancedControls((prev) => !prev)}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${showAdvancedControls ? 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
              title={showAdvancedControls ? 'Ocultar avançado' : 'Mostrar avançado'}
              aria-pressed={showAdvancedControls}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
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
                  Este modelo suporta modo ao vivo para voz em tempo real
                </p>
              )}
              {showAdvancedControls ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                    <button type="button" aria-label={`Usar prompt rápido ${label}`}
                      key={label}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <button type="button" aria-label={showAdvancedControls ? 'Hide advanced shortcuts' : 'Show advanced shortcuts'}
                  onClick={() => setShowAdvancedControls(true)}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                >
                  Mostrar atalhos avançados
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

      {/* Live Conversation Panel - Gemini Live-style */}
      {consoleMode === 'live' && (
        <LiveConversationPanel
          isWorking={isAIWorking}
          onInterrupt={handleLiveInterrupt}
          onSendMessage={handleLiveSendMessage}
        />
      )}

      {/* Run Card - Visualização de operações de IA */}
      {consoleMode !== 'ask' && (
        <RunCard
          status={isAIWorking ? 'running' : 'idle'}
          duration={runDuration ?? 0}
          cost={estimatedCost ?? 0}
          model={selectedModel.name}
          onInterrupt={handleLiveInterrupt}
        />
      )}

      {/* Agent Board - Visualização de progresso de agentes */}
      {agentCount > 1 && (
        <AgentBoard
          agents={agents}
          onAgentClick={handleAgentClick}
        />
      )}

      {/* Quick prompts bar */}
      {showAdvancedControls && (
        <div className="border-t border-[var(--aethel-border-secondary)] px-3 py-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
              <button type="button" aria-label={`Usar prompt rápido ${label}`}
                key={label}
                onClick={() => handleQuickPrompt(prompt)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] px-2.5 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
            <button type="button" aria-label="Parar gravação de voz"
              onClick={stopRecording}
              className="rounded px-2 py-1 text-xs text-[var(--aethel-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Parar
            </button>
          </div>
        )}
        {voiceError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-warning)]" role="alert" aria-live="polite">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="flex-1">{voiceError}</span>
            <button type="button" aria-label="Close voice error"
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
              <button type="button" aria-label="Anexar arquivo"
                onClick={handleFileAttach}
                className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Anexar arquivo"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            )}
            {allowAttachments && selectedModel.supportsVision && (
              <button type="button" aria-label="Anexar imagem"
                onClick={handleImageAttach}
                className="rounded p-1.5 text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                title="Anexar imagem"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
            )}
            <button type="button" aria-label={isRecording ? 'Parar gravação por voz' : 'Iniciar gravação por voz'}
              onClick={handleVoiceToggle}
              className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${isRecording ? 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]'}`}
              title={isRecording ? 'Parar gravação' : 'Entrada de voz'}
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
              placeholder={isRecording ? 'Ouvindo...' : 'Pergunte para a IA sobre o seu código...'}
              disabled={isLoading}
              aria-controls="mention-suggestions-list"
              aria-label="Mensagem do chat"
              className="min-h-[44px] max-h-[200px] w-full resize-none rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_84%,transparent)] px-4 py-2.5 pr-12 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:border-[color-mix(in_srgb,var(--aethel-info)_48%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`
                absolute right-2 bottom-2 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]
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
                className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
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
      {showAdvancedControls && (
        <aside className="w-80 border-l border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] flex flex-col">
          <div className="flex items-center gap-1 border-b border-[var(--aethel-border-secondary)] px-2 py-2">
            {[
              { id: 'memory' as const, label: 'Memória', icon: Brain },
              { id: 'approval' as const, label: 'Aprovação', icon: Check },
              { id: 'diff' as const, label: 'Diff', icon: Code },
              { id: 'execution' as const, label: 'Execução', icon: ClipboardList },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpsTab(tab.id)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  opsTab === tab.id
                    ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            {opsTab === 'memory' && (
              <MemoryPanel memories={[]} onAdd={() => undefined} onDelete={() => undefined} onUpdate={() => undefined} />
            )}
            {opsTab === 'approval' && (
              <ApprovalCard changes={[]} onApprove={() => undefined} onReject={() => undefined} />
            )}
            {opsTab === 'diff' &&
              (editorBridge?.pendingDiff ? (
                <MonacoChatDiffPanel
                  filePath={editorBridge.pendingDiff.path}
                  original={editorBridge.pendingDiff.oldContent}
                  modified={editorBridge.pendingDiff.newContent}
                  onAcceptAll={(finalModified) => {
                    if (!editorBridge) return
                    const r = editorBridge.replaceEntireFile(finalModified)
                    if (!r.ok) {
                      window.alert(r.message)
                      return
                    }
                    editorBridge.clearPendingDiff()
                  }}
                  onReject={() => editorBridge?.clearPendingDiff()}
                />
              ) : (
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-4 text-center text-[11px] text-[var(--aethel-text-tertiary)]">
                  <p>Nenhum diff pendente.</p>
                  <p className="max-w-[240px] text-[var(--aethel-text-quaternary)]">
                    Use &quot;Abrir diff&quot; num bloco de código da assistente.
                  </p>
                </div>
              ))}
            {opsTab === 'execution' && (
              <TaskOpsPanel projectId={projectId} defaultGoal={lastUserGoal} />
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
