'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_MODELS,
  type AIChatPanelProps,
} from './AIChatPanelPro.types'
import { DEFAULT_OPENROUTER_MODEL_ID } from '../../web/lib/ai/openrouter-models'
import { useEditorApplyBridge } from './EditorApplyBridgeContext'
import {
  AIChatBenchmarkTelemetry,
  AIChatComposer,
  AIChatContextStrip,
  AIChatCostMeter,
  AIChatHeader,
  AIChatHistoryModeRail,
  AIChatLedgerStrip,
  AIChatMessagesPane,
  AIChatOpsSidebar,
  AIChatPendingDiffTray,
  AIChatProposalPreview,
  AIChatTimeline,
  MODE_PRESETS,
  useAIChatComposerState,
  useAIChatContextActions,
  useAIChatHistoryMode,
  useAIChatOpsState,
  useAIChatPanelUiState,
  useAIChatRunState,
  useAIChatSpeechPlayback,
} from '../../web/components/agents/chat'
import { ActiveContextBadge, type ActiveContextItem } from './ActiveContextBadge'
import { useAethelContext } from '../../web/contexts/AethelContextRegistry'
import { useRealtimeVoiceSession } from '../../web/components/agents/chat/voice/useRealtimeVoiceSession'
import { AIChatVoiceSessionOverlay } from './AIChatVoiceSessionOverlay'
import { ResourceMonitorHUD } from '../../web/components/agents/chat/ResourceMonitorHUD'
import { FusionTransactionUndoBanner } from '../../web/components/agents/chat/ledger/FusionTransactionUndoBanner'
import { NexusMissionPhaseStrip } from '../../web/components/agents/chat/activity/NexusMissionPhaseStrip'
import { nexusCellsToAgentBoard } from '../../web/lib/production/nexus-mission-ui'
import {
  getAgentsOpsPrefs,
  setAgentsOpsPrefs,
} from '../../web/lib/storage/ui-persistence-spine'
import { ensureProjectFusionYjsStore } from '../../web/lib/production/fusion-scope-registry'

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
  onAgentSelect,
  projectId,
  codebaseContextPreview,
}: AIChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editorBridge = useEditorApplyBridge()
  const {
    applyBusy,
    applyReceipts,
    enableAdvancedControls,
    handleAcceptPendingDiff,
    handleRejectPendingDiff,
    lastApplyDeny,
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

  const latestEvidence = useMemo(() => {
    const candidate = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role !== 'user' &&
          (message.ledgerArtifact || message.traceArtifact || message.researchArtifact),
      )

    return (
      candidate?.ledgerArtifact ??
      candidate?.traceArtifact ??
      candidate?.researchArtifact ??
      null
    )
  }, [messages])

  const latestNexus = useMemo(() => {
    const candidate = [...messages].reverse().find((message) => message.nexusMission)
    return candidate?.nexusMission ?? null
  }, [messages])

  const latestFusionUndo = useMemo(() => {
    const candidate = [...messages].reverse().find((message) => message.fusionUndoHint)
    return candidate?.fusionUndoHint ?? null
  }, [messages])

  // Trava II: bind a real Yjs fusion scope for this project so Undo banner / Ctrl+Z
  // never invent a throwaway in-memory Map (P2f #3).
  useEffect(() => {
    if (!projectId) return
    ensureProjectFusionYjsStore(projectId)
  }, [projectId])

  const nexusAgents = useMemo(() => {
    if (!latestNexus?.cells?.length) return null
    return nexusCellsToAgentBoard(latestNexus.cells)
  }, [latestNexus])

  const runState = useAIChatRunState({
    agentCount,
    currentModel,
    isLoading,
    models,
    onAgentSelect,
    onInterrupt,
    onRegenerateResponse,
    onSendMessage,
    streamingContent,
    nexusAgents,
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

  // Active context badge — derives from AethelContextRegistry
  const { chips } = useAethelContext()
  const contextItems = useMemo<ActiveContextItem[]>(() => {
    const CHIP_KIND_MAP: Record<string, ActiveContextItem['kind']> = {
      viewport: 'viewport',
      file: 'code',
      blueprint: 'node',
      terminal: 'custom',
      function: 'custom',
    }
    return chips.map((chip) => ({
      kind: CHIP_KIND_MAP[chip.kind] ?? 'custom',
      label: chip.label,
      detail: chip.payload ? Object.values(chip.payload)[0] as string | undefined : undefined,
    }))
  }, [chips])

  // Realtime voice session — active only when live mode is on
  const voiceSession = useRealtimeVoiceSession({
    isEnabled: isLiveMode ?? false,
    modelId: currentModel ?? DEFAULT_OPENROUTER_MODEL_ID,
    onMessageReceived: (text) => {
      onSendMessage?.(text)
    },
  })
  const pendingDiffs = editorBridge?.pendingDiffs ?? []
  const [showInlineDiffPreview, setShowInlineDiffPreview] = useState(false)

  // Calm mode — hides telemetry/ops panels by default (CW4 agents.opsPrefs spine).
  const [calmMode, setCalmMode] = useState<boolean>(() => {
    try {
      const prefs = getAgentsOpsPrefs()
      if (typeof prefs.calmMode === 'boolean') return prefs.calmMode
      return true
    } catch {
      return true
    }
  })
  const toggleCalmMode = () => {
    setCalmMode((prev) => {
      const next = !prev
      setAgentsOpsPrefs({ calmMode: next })
      return next
    })
  }

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
    if (pendingDiffs.length === 0) {
      setShowInlineDiffPreview(false)
    }
  }, [pendingDiffs])

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

      <div className="relative flex min-w-0 flex-1 flex-col">
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
          activeContextItems={contextItems}
          calmMode={calmMode}
          onToggleCalmMode={toggleCalmMode}
        />

        <AIChatContextStrip
          consoleMode={consoleMode}
          modePreset={modePreset}
          lastUserGoal={lastUserGoal}
          selectedModelName={resolvedModel.name}
          agentCount={agentCount}
          isAIWorking={isAIWorking}
        />

        {(latestNexus || isAIWorking) && (
          <NexusMissionPhaseStrip nexus={latestNexus} isWorking={isAIWorking && !latestNexus} />
        )}

        {latestFusionUndo && (
          <FusionTransactionUndoBanner
            transactionId={latestFusionUndo.transactionId}
            message={latestFusionUndo.message}
            projectId={projectId}
            fusionHandoffJson={latestFusionUndo.fusionHandoffJson}
          />
        )}

        {/* Calm mode hides the dense telemetry/ledger/cost strips; they are accessible via Ops toggle */}
        {!calmMode && (
          <>
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
              pendingDiff={pendingDiffs.length > 0 ? pendingDiffs[0] : null}
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
          </>
        )}

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

        {showAdvancedControls && !calmMode ? (
          <>
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
              nexus={latestNexus}
            />
            <div className="px-3 pb-2">
              <ResourceMonitorHUD
                isWorking={isAIWorking}
                cloudFraction={(estimatedCost ?? 0) > 0 ? Math.min((estimatedCost ?? 0) / 10, 1) : 0}
              />
            </div>
          </>
        ) : null}

        <AIChatVoiceSessionOverlay isLiveMode={isLiveMode} voiceSession={voiceSession} />

        {pendingDiffs.length > 0 ? (
          <AIChatPendingDiffTray
            pendingDiffs={pendingDiffs}
            onOpenDiff={handleOpenPendingDiff}
            onAcceptDiff={() => {
              void handleAcceptPendingDiff()
            }}
            onRejectDiff={handleRejectPendingDiff}
            diffOpen={showInlineDiffPreview}
            applyBusy={applyBusy}
            denyMessage={lastApplyDeny}
          />
        ) : null}

        <AIChatComposer
          input={input}
          inputRef={inputRef}
          isLoading={isLoading}
          onSubmit={handleSend}
          onInterrupt={onInterrupt}
          modePreset={modePreset}
          currentModel={currentModel}
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
        pendingDiffs={pendingDiffs}
        onAcceptDiff={handleAcceptPendingDiff}
        onRejectDiff={handleRejectPendingDiff}
        projectId={projectId}
        defaultGoal={lastUserGoal}
        latestEvidence={latestEvidence}
        currentRunEstimate={estimatedCost}
        lastApplyDeny={lastApplyDeny}
        applyReceipts={applyReceipts}
        nexusCells={latestNexus?.cells ?? []}
      />
    </div>
  )
}
