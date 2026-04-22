'use client'

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from 'react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
  type Attachment,
  type MentionContextPreviewBlock,
  type Message,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { ChatHistorySidebar, LiveModeIndicator } from './AIChatPanelChrome'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { useMentions } from '@/lib/copilot/mention-parser'
import { type AgentInfo } from '@/components/ai-chat/AgentBoard'
import { AIChatActivityDeck } from '@/components/ai-chat/AIChatActivityDeck'
import { AIChatComposer } from '@/components/ai-chat/AIChatComposer'
import { AIChatHeader } from '@/components/ai-chat/AIChatHeader'
import { AIChatMessagesPane } from '@/components/ai-chat/AIChatMessagesPane'
import { AIChatOpsSidebar } from '@/components/ai-chat/AIChatOpsSidebar'
import {
  QUICK_PROMPTS,
  type AIChatConsoleMode,
  type AIChatOpsTab,
} from '@/components/ai-chat/presets'
import { useChatContextPreviews } from '@/components/ai-chat/useChatContextPreviews'
import { useVoiceRecording } from '@/components/ai-chat/useVoiceRecording'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('AIChatPanelPro')

const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content:
      'Ola! Sou seu assistente de IA. Posso ajudar com:\n\n- **Explicacao de codigo** - entender trechos complexos\n- **Deteccao de bugs** - encontrar problemas no seu codigo\n- **Otimizacao** - melhorar performance\n- **Geracao de codigo** - escrever codigo novo\n\nComo posso ajudar voce hoje?',
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
  const [opsTab, setOpsTab] = useState<AIChatOpsTab>('memory')
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [consoleMode, setConsoleMode] = useState<AIChatConsoleMode>('ask')
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
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
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
  const {
    isRecording,
    transcript,
    voiceError,
    startRecording,
    stopRecording,
    clearRecording,
    clearVoiceError,
  } = useVoiceRecording()

  void onToggleHistory

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

  useEffect(() => {
    setIsAIWorking(isLoading || streamingContent.length > 0)
    if (isLoading && !runStartTime) {
      setRunStartTime(Date.now())
    } else if (!isLoading && !streamingContent && runStartTime) {
      setRunStartTime(null)
    }
  }, [isLoading, streamingContent, runStartTime])

  const runDuration = runStartTime ? (Date.now() - runStartTime) / 1000 : undefined
  const selectedModel = models.find((model) => model.id === currentModel) || models[0]
  const estimatedCost =
    runDuration && selectedModel.outputCost
      ? (runDuration * selectedModel.outputCost * 100) / 1000000
      : undefined

  useEffect(() => {
    if (agentCount > 1 && isAIWorking) {
      const agentRoles = [
        {
          id: '1',
          role: 'Architect',
          name: 'Arquiteto',
          currentTask: 'Analisando requisitos',
          dependency: undefined,
          progress: 75,
          output: 'Estrutura definida',
          confidence: 85,
          cost: 0.0023,
          status: 'working' as const,
        },
        {
          id: '2',
          role: 'Engineer',
          name: 'Engenheiro',
          currentTask: 'Implementando componentes',
          dependency: 'Arquiteto',
          progress: 45,
          output: 'Componentes base criados',
          confidence: 78,
          cost: 0.0045,
          status: 'working' as const,
        },
        {
          id: '3',
          role: 'QA',
          name: 'QA',
          currentTask: 'Aguardando implementacao',
          dependency: 'Engenheiro',
          progress: 0,
          output: undefined,
          confidence: 0,
          cost: 0,
          status: 'idle' as const,
        },
      ]
      setAgents(agentRoles.slice(0, agentCount))
    } else {
      setAgents([])
    }
  }, [agentCount, isAIWorking])

  const handleAgentClick = useCallback((agentId: string) => {
    log.info('Agent clicked', { agentId })
  }, [])

  const handleLiveInterrupt = useCallback(() => {
    if (onRegenerateResponse) {
      log.info('Live interrupt triggered')
    }
    setIsAIWorking(false)
  }, [onRegenerateResponse])

  const handleLiveSendMessage = useCallback((message: string) => {
    onSendMessage?.(message)
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

  const handleSend = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault()
      const normalizedInput = input.trim()
      if (!normalizedInput || isLoading) return
      const hasAgentTag = /@agents:[123]/i.test(normalizedInput)
      const messageWithAgents =
        agentCount > 1 && !hasAgentTag ? `@agents:${agentCount} ${normalizedInput}` : normalizedInput
      onSendMessage?.(messageWithAgents, {
        attachments: allowAttachments && attachments.length > 0 ? attachments : undefined,
      })
      mentionState.replaceText('')
      setAttachments([])
      clearRecording()
    },
    [agentCount, input, isLoading, attachments, onSendMessage, clearRecording, allowAttachments, mentionState]
  )

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    mentionState.handleKeyDown(event)
    if (event.defaultPrevented) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleImageAttach = () => {
    imageInputRef.current?.click()
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image') => {
    const file = event.target.files?.[0]
    if (file) {
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        type,
        name: file.name,
        size: file.size,
      }
      if (type === 'image') {
        const reader = new FileReader()
        reader.onload = (loadEvent) => {
          const result = loadEvent.target?.result
          if (typeof result === 'string') {
            attachment.preview = result
          }
          setAttachments((previous) => [...previous, attachment])
        }
        reader.readAsDataURL(file)
      } else {
        setAttachments((previous) => [...previous, attachment])
      }
    }
    event.target.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments((previous) => previous.filter((attachment) => attachment.id !== id))
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
    window.dispatchEvent(
      new CustomEvent('aethel.ide.openFileFromContext', {
        detail: {
          path: filePath,
          startLine,
          endLine,
          source: 'ai-codebase-context',
        },
      })
    )
  }, [])

  const handleOpenMentionContextBlock = useCallback((block: MentionContextPreviewBlock) => {
    if (block.kind !== 'file') return
    const normalizedPath = block.tag.replace(/^@file:/i, '').trim()
    if (!normalizedPath || typeof window === 'undefined') return
    window.dispatchEvent(
      new CustomEvent('aethel.ide.openFileFromContext', {
        detail: {
          path: normalizedPath,
          source: 'ai-mention-context',
        },
      })
    )
  }, [])

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const modelTierLabel = selectedModel.tier?.toUpperCase() ?? 'BUDGET'
  const visibleCodebaseContextPreview = codebaseContextPreview ?? localCodebaseContextPreview

  const handleToggleSpeaking = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking()
      return
    }
    const lastAssistantMessage = messages.filter((message) => message.role === 'assistant').pop()
    if (lastAssistantMessage) {
      speakMessage(lastAssistantMessage.content)
    }
  }, [isSpeaking, messages, speakMessage, stopSpeaking])

  const handleAcceptPendingDiff = useCallback(
    (finalModified: string) => {
      if (!editorBridge) return
      const result = editorBridge.replaceEntireFile(finalModified)
      if (!result.ok) {
        window.alert(result.message)
        return
      }
      editorBridge.clearPendingDiff()
    },
    [editorBridge]
  )

  return (
    <div className={`flex h-full ${className}`}>
      {showHistorySidebar &&
        threads.length > 0 &&
        onSelectThread &&
        onCreateThread &&
        onArchiveThread &&
        onDeleteThread && (
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

      <div className="flex min-w-0 flex-1 flex-col">
        {isLiveMode && onToggleLiveMode && <LiveModeIndicator status={liveStatus} onEnd={onToggleLiveMode} />}

        <AIChatHeader
          consoleMode={consoleMode}
          onConsoleModeChange={setConsoleMode}
          hasHistory={threads.length > 0}
          showHistorySidebar={showHistorySidebar}
          onToggleHistorySidebar={() => setShowHistorySidebar((previous) => !previous)}
          selectedModel={selectedModel}
          currentModel={currentModel}
          models={models}
          showModelSelector={showModelSelector}
          onToggleModelSelector={() => setShowModelSelector((previous) => !previous)}
          onCloseModelSelector={() => setShowModelSelector(false)}
          onModelChange={onModelChange}
          showAdvancedControls={showAdvancedControls}
          modelTierLabel={modelTierLabel}
          agentCount={agentCount}
          onAgentCountChange={setAgentCount}
          isLiveMode={isLiveMode}
          onToggleLiveMode={onToggleLiveMode}
          isSpeaking={isSpeaking}
          onToggleSpeaking={handleToggleSpeaking}
          onClearChat={onClearChat}
          onToggleAdvancedControls={() => setShowAdvancedControls((previous) => !previous)}
        />

        <AIChatMessagesPane
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          showAdvancedControls={showAdvancedControls}
          supportsVoice={Boolean(selectedModel.supportsVoice)}
          onQuickPrompt={handleQuickPrompt}
          onEnableAdvancedControls={() => setShowAdvancedControls(true)}
          onCopy={handleCopy}
          onRegenerateResponse={onRegenerateResponse}
          onRateResponse={onRateResponse}
          messagesEndRef={messagesEndRef}
        />

        <AIChatActivityDeck
          consoleMode={consoleMode}
          isAIWorking={isAIWorking}
          runDuration={runDuration}
          estimatedCost={estimatedCost}
          selectedModelName={selectedModel.name}
          onInterrupt={handleLiveInterrupt}
          onSendLiveMessage={handleLiveSendMessage}
          agentCount={agentCount}
          agents={agents}
          onAgentClick={handleAgentClick}
        />

        {showAdvancedControls && (
          <div className="border-t border-[var(--aethel-border-secondary)] px-3 py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                <button
                  type="button"
                  aria-label={`Usar prompt rapido ${label}`}
                  key={label}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)] px-2.5 py-1 text-xs text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <AIChatComposer
          input={input}
          inputRef={inputRef}
          isLoading={isLoading}
          onSubmit={handleSend}
          onInputChange={mentionState.setText}
          onKeyDown={handleComposerKeyDown}
          mentionState={{
            parsedMentions: mentionState.parsed.mentions,
            showSuggestions: mentionState.showSuggestions,
            suggestions: mentionState.suggestions,
            activeSuggestionIndex: mentionState.activeSuggestionIndex,
            setActiveSuggestionIndex: mentionState.setActiveSuggestionIndex,
            applySuggestion: mentionState.applySuggestion,
          }}
          allowAttachments={allowAttachments}
          attachments={attachments}
          onRemoveAttachment={removeAttachment}
          onFileAttach={handleFileAttach}
          onImageAttach={handleImageAttach}
          onFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
          supportsVision={Boolean(selectedModel.supportsVision)}
          isRecording={isRecording}
          transcript={transcript}
          voiceError={voiceError}
          onStopRecording={stopRecording}
          onClearVoiceError={clearVoiceError}
          onToggleVoice={handleVoiceToggle}
          showAdvancedControls={showAdvancedControls}
          onInsertQuickMention={insertQuickMention}
          codebaseContextPreview={visibleCodebaseContextPreview}
          mentionContextPreview={mentionContextPreview}
          onRefreshCodebaseContext={handleRefreshCodebaseContext}
          onCopy={handleCopy}
          onOpenCodeContextResult={handleOpenCodeContextResult}
          onOpenMentionContextBlock={handleOpenMentionContextBlock}
        />
      </div>

      <AIChatOpsSidebar
        showAdvancedControls={showAdvancedControls}
        opsTab={opsTab}
        onOpsTabChange={setOpsTab}
        pendingDiff={editorBridge?.pendingDiff}
        onAcceptDiff={handleAcceptPendingDiff}
        onRejectDiff={() => editorBridge?.clearPendingDiff()}
        projectId={projectId}
        defaultGoal={lastUserGoal}
      />
    </div>
  )
}
