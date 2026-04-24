'use client'

import { useEffect, useRef } from 'react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
  type Message,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { AIChatBenchmarkTelemetry } from '@/components/ai-chat/AIChatBenchmarkTelemetry'
import { AIChatComposer } from '@/components/ai-chat/AIChatComposer'
import { AIChatContextStrip } from '@/components/ai-chat/AIChatContextStrip'
import { AIChatHeader } from '@/components/ai-chat/AIChatHeader'
import { AIChatHistoryModeRail } from '@/components/ai-chat/AIChatHistoryModeRail'
import { AIChatMessagesPane } from '@/components/ai-chat/AIChatMessagesPane'
import { AIChatOpsSidebar } from '@/components/ai-chat/AIChatOpsSidebar'
import { MODE_PRESETS } from '@/components/ai-chat/presets'
import { useAIChatComposerState } from '@/components/ai-chat/useAIChatComposerState'
import { useAIChatContextActions } from '@/components/ai-chat/useAIChatContextActions'
import { useAIChatOpsState } from '@/components/ai-chat/useAIChatOpsState'
import { useAIChatPanelUiState } from '@/components/ai-chat/useAIChatPanelUiState'
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
  onInterrupt,
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
    agentCount,
    consoleMode,
    lastUserGoal,
    setAgentCount,
    setConsoleMode,
    setShowHistorySidebar,
    setShowModelSelector,
    showHistorySidebar,
    showModelSelector,
  } = useAIChatPanelUiState({
    messages,
    showHistory,
  })
  const modePreset = MODE_PRESETS[consoleMode]
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
    consoleMode,
    isLoading,
    onSendMessage,
    projectId,
  })
  const runState = useAIChatRunState({
    agentCount,
    currentModel,
    isLoading,
    models,
    onInterrupt,
    onRegenerateResponse,
    onSendMessage,
    streamingContent,
  })
  const {
    agents,
    estimatedCost,
    handleAgentClick,
    handleLiveInterrupt,
    handleLiveSendMessage,
    isAIWorking,
    runDuration,
    selectedModel: resolvedModel,
  } = runState
  const modelTierLabel = resolvedModel.tier?.toUpperCase() ?? 'BUDGET'
  const { handleCopy, handleOpenCodeContextResult, handleOpenMentionContextBlock } =
    useAIChatContextActions()
  const { handleToggleSpeaking, isSpeaking } = useAIChatSpeechPlayback({ messages })

  void onToggleHistory

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <div className={`flex h-full ${className}`}>
      <AIChatHistoryModeRail
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={onSelectThread}
        onCreateThread={onCreateThread}
        onArchiveThread={onArchiveThread}
        onDeleteThread={onDeleteThread}
        showHistorySidebar={showHistorySidebar}
        onCloseHistorySidebar={() => setShowHistorySidebar(false)}
        isLiveMode={isLiveMode}
        onToggleLiveMode={onToggleLiveMode}
        liveStatus={liveStatus}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AIChatHeader
          consoleMode={consoleMode}
          onConsoleModeChange={setConsoleMode}
          hasHistory={threads.length > 0}
          showHistorySidebar={showHistorySidebar}
          onToggleHistorySidebar={() => setShowHistorySidebar((previous) => !previous)}
          selectedModel={resolvedModel}
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

        <AIChatContextStrip
          consoleMode={consoleMode}
          modePreset={modePreset}
          lastUserGoal={lastUserGoal}
          selectedModelName={resolvedModel.name}
          agentCount={agentCount}
          isAIWorking={isAIWorking}
        />

        <AIChatMessagesPane
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          showAdvancedControls={showAdvancedControls}
          supportsVoice={Boolean(resolvedModel.supportsVoice)}
          modePreset={modePreset}
          onQuickPrompt={handleQuickPrompt}
          onEnableAdvancedControls={enableAdvancedControls}
          onCopy={handleCopy}
          onRegenerateResponse={onRegenerateResponse}
          onRateResponse={onRateResponse}
          messagesEndRef={messagesEndRef}
        />

        <AIChatBenchmarkTelemetry
          consoleMode={consoleMode}
          isAIWorking={isAIWorking}
          runDuration={runDuration}
          estimatedCost={estimatedCost}
          selectedModelName={resolvedModel.name}
          onInterrupt={handleLiveInterrupt}
          onSendLiveMessage={handleLiveSendMessage}
          agentCount={agentCount}
          agents={agents}
          onAgentClick={handleAgentClick}
          quickPrompts={modePreset.quickPrompts}
          showAdvancedControls={showAdvancedControls}
          onQuickPrompt={handleQuickPrompt}
        />

        <AIChatComposer
          input={input}
          inputRef={inputRef}
          isLoading={isLoading}
          onSubmit={handleSend}
          onInterrupt={onInterrupt}
          modePreset={modePreset}
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
          supportsVision={Boolean(resolvedModel.supportsVision)}
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
