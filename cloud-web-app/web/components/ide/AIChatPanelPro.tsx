'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
  type Message,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { ChatHistorySidebar, LiveModeIndicator } from './AIChatPanelChrome'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { AIChatActivityDeck } from '@/components/ai-chat/AIChatActivityDeck'
import { AIChatComposer } from '@/components/ai-chat/AIChatComposer'
import { AIChatHeader } from '@/components/ai-chat/AIChatHeader'
import { AIChatMessagesPane } from '@/components/ai-chat/AIChatMessagesPane'
import { AIChatOpsSidebar } from '@/components/ai-chat/AIChatOpsSidebar'
import { AIChatQuickPromptStrip } from '@/components/ai-chat/AIChatQuickPromptStrip'
import { type AIChatConsoleMode } from '@/components/ai-chat/presets'
import { useAIChatComposerState } from '@/components/ai-chat/useAIChatComposerState'
import { useAIChatContextActions } from '@/components/ai-chat/useAIChatContextActions'
import { useAIChatOpsState } from '@/components/ai-chat/useAIChatOpsState'
import { useAIChatRunState } from '@/components/ai-chat/useAIChatRunState'
import { useAIChatSpeechPlayback } from '@/components/ai-chat/useAIChatSpeechPlayback'

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
  const [consoleMode, setConsoleMode] = useState<AIChatConsoleMode>('ask')
  const lastUserGoal = useMemo(() => {
    const list = messages ?? []
    const last = [...list].reverse().find((item) => item.role === 'user')
    return last?.content?.trim() || ''
  }, [messages])
  const [showHistorySidebar, setShowHistorySidebar] = useState(showHistory)
  const [agentCount, setAgentCount] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editorBridge = useEditorApplyBridge()
  const {
    enableAdvancedControls,
    handleAcceptPendingDiff,
    handleRejectPendingDiff,
    opsTab,
    setOpsTab,
    showAdvancedControls,
    toggleAdvancedControls,
  } = useAIChatOpsState({ editorBridge })
  const {
    attachments,
    clearVoiceError,
    fileInputRef,
    handleComposerKeyDown,
    handleFileAttach,
    handleFileSelect,
    handleImageAttach,
    handleQuickPrompt,
    mentionContextPreview,
    handleRefreshCodebaseContext,
    handleSend,
    handleVoiceToggle,
    imageInputRef,
    input,
    inputRef,
    insertQuickMention,
    isRecording,
    mentionState,
    removeAttachment,
    stopRecording,
    transcript,
    visibleCodebaseContextPreview,
    voiceError,
  } = useAIChatComposerState({
    allowAttachments,
    agentCount,
    codebaseContextPreview,
    isLoading,
    onSendMessage,
    projectId,
  })
  const {
    agents,
    estimatedCost,
    handleAgentClick,
    handleLiveInterrupt,
    handleLiveSendMessage,
    isAIWorking,
    runDuration,
    selectedModel,
  } = useAIChatRunState({
    agentCount,
    currentModel,
    isLoading,
    models,
    onRegenerateResponse,
    onSendMessage,
    streamingContent,
  })
  const { handleCopy, handleOpenCodeContextResult, handleOpenMentionContextBlock } =
    useAIChatContextActions()
  const { handleToggleSpeaking, isSpeaking } = useAIChatSpeechPlayback({ messages })

  void onToggleHistory

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const modelTierLabel = selectedModel.tier?.toUpperCase() ?? 'BUDGET'

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
          onToggleAdvancedControls={toggleAdvancedControls}
        />

        <AIChatMessagesPane
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          showAdvancedControls={showAdvancedControls}
          supportsVoice={Boolean(selectedModel.supportsVoice)}
          onQuickPrompt={handleQuickPrompt}
          onEnableAdvancedControls={enableAdvancedControls}
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

        {showAdvancedControls && <AIChatQuickPromptStrip onQuickPrompt={handleQuickPrompt} />}

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
        onRejectDiff={handleRejectPendingDiff}
        projectId={projectId}
        defaultGoal={lastUserGoal}
      />
    </div>
  )
}
