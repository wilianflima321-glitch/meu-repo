'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import { AIChatBenchmarkTelemetry } from '@/components/ai-chat/AIChatBenchmarkTelemetry'
import { AIChatComposer } from '@/components/ai-chat/AIChatComposer'
import { AIChatContextStrip } from '@/components/ai-chat/AIChatContextStrip'
import { AIChatCostMeter } from '@/components/ai-chat/AIChatCostMeter'
import { AIChatHeader } from '@/components/ai-chat/AIChatHeader'
import { AIChatPendingDiffTray } from '@/components/ai-chat/AIChatPendingDiffTray'
import { AIChatProposalPreview } from '@/components/ai-chat/AIChatProposalPreview'
import { AIChatTimeline } from '@/components/ai-chat/AIChatTimeline'
import { AIChatHistoryModeRail } from '@/components/ai-chat/AIChatHistoryModeRail'
import { AIChatLedgerStrip } from '@/components/ai-chat/AIChatLedgerStrip'
import { AIChatMessagesPane } from '@/components/ai-chat/AIChatMessagesPane'
import { AIChatOpsSidebar } from '@/components/ai-chat/AIChatOpsSidebar'
import { MODE_PRESETS } from '@/components/ai-chat/presets'
import { useAIChatComposerState } from '@/components/ai-chat/useAIChatComposerState'
import { useAIChatContextActions } from '@/components/ai-chat/useAIChatContextActions'
import { useAIChatOpsState } from '@/components/ai-chat/useAIChatOpsState'
import { useAIChatPanelUiState } from '@/components/ai-chat/useAIChatPanelUiState'
import { useAIChatRunState } from '@/components/ai-chat/useAIChatRunState'
import { useAIChatHistoryMode } from '@/components/ai-chat/useAIChatHistoryMode'
import { useAIChatSpeechPlayback } from '@/components/ai-chat/useAIChatSpeechPlayback'

export default function AIChatPanelPro({
  messages = [],
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
    setShowModelSelector,
    showModelSelector,
  } = useAIChatPanelUiState({
    messages,
  })
  const {
    activeThread,
    closeHistorySidebar,
    hasHistory,
    showHistorySidebar,
    timelineItems,
    toggleHistorySidebar,
  } = useAIChatHistoryMode({
    activeThreadId,
    isLiveMode,
    liveStatus,
    messages,
    onToggleHistory,
    showHistory,
    threads,
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
    isTranscribing,
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
  const pendingDiff = editorBridge?.pendingDiff ?? null
  const [showInlineDiffPreview, setShowInlineDiffPreview] = useState(false)
  const latestEvidence = useMemo(() => {
    const candidate = [...messages]
      .reverse()
      .find((message) => message.role !== 'user' && (message.traceArtifact || message.researchArtifact))

    return candidate?.traceArtifact ?? candidate?.researchArtifact ?? null
  }, [messages])

  const handleOpenPendingDiff = () => {
    setShowInlineDiffPreview((previous) => !previous)
    enableAdvancedControls()
    setOpsTab('diff')
  }

  const handleOpenEvidence = () => {
    enableAdvancedControls()
    setOpsTab('evidence')
  }

  const handleOpenEconomics = () => {
    enableAdvancedControls()
    setOpsTab('economics')
  }

  useEffect(() => {
    if (!pendingDiff) {
      setShowInlineDiffPreview(false)
    }
  }, [pendingDiff])

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
        onCloseHistorySidebar={closeHistorySidebar}
        isLiveMode={isLiveMode}
        onToggleLiveMode={onToggleLiveMode}
        liveStatus={liveStatus}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AIChatHeader
          consoleMode={consoleMode}
          onConsoleModeChange={setConsoleMode}
          hasHistory={hasHistory}
          showHistorySidebar={showHistorySidebar}
          onToggleHistorySidebar={toggleHistorySidebar}
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

        <AIChatCostMeter
          projectId={projectId}
          currentRunEstimate={estimatedCost}
          selectedModelName={resolvedModel.name}
          isAIWorking={isAIWorking}
          onOpenEconomics={handleOpenEconomics}
        />

        <AIChatLedgerStrip
          agentCount={agentCount}
          consoleMode={consoleMode}
          currentRunEstimate={estimatedCost}
          isAIWorking={isAIWorking}
          latestEvidence={latestEvidence}
          pendingDiff={pendingDiff}
          onOpenDiff={handleOpenPendingDiff}
          onOpenEconomics={handleOpenEconomics}
          onOpenEvidence={handleOpenEvidence}
        />

        <AIChatTimeline
          activeThreadTitle={activeThread?.title ?? null}
          hasHistory={hasHistory}
          items={timelineItems}
          onOpenHistory={toggleHistorySidebar}
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

        {showAdvancedControls ? (
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
        ) : null}

        {pendingDiff ? (
          <AIChatPendingDiffTray
            pendingDiff={pendingDiff}
            onOpenDiff={handleOpenPendingDiff}
            onAcceptDiff={() => handleAcceptPendingDiff(pendingDiff.newContent)}
            onRejectDiff={handleRejectPendingDiff}
            diffOpen={showInlineDiffPreview}
          />
        ) : null}

        {pendingDiff && showInlineDiffPreview ? (
          <AIChatProposalPreview
            pendingDiff={pendingDiff}
            onAcceptDiff={handleAcceptPendingDiff}
            onRejectDiff={handleRejectPendingDiff}
          />
        ) : null}

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
          isTranscribing={isTranscribing}
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
        pendingDiff={pendingDiff}
        onAcceptDiff={handleAcceptPendingDiff}
        onRejectDiff={handleRejectPendingDiff}
        projectId={projectId}
        defaultGoal={lastUserGoal}
        latestEvidence={latestEvidence}
        currentRunEstimate={estimatedCost}
      />
    </div>
  )
}
