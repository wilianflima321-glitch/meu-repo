"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import type * as monacoEditor from 'monaco-editor'
import CollaboratorsBar from "@/components/collaboration/CollaboratorsBar";
import AIChatPanelContainer from "@/components/ide/AIChatPanelContainer";
import type { EditorGroup, EditorTab } from "@/components/editor/SplitEditor";
import { TabProvider } from "@/components/editor/TabBar";
import CommandPaletteProvider from "@/components/ide/CommandPalette";
import { ModernIDEShell } from "@/components/ide/ModernIDEShell";
import { EditorApplyBridgeProvider } from "@/components/ide/EditorApplyBridgeContext";
import { IdeWorkbenchCommandExtras } from "@/components/ide/IdeWorkbenchCommandExtras";
import type { DocumentSymbol } from "@/components/outline/OutlinePanel";
import { buildOutlineSymbols } from "@/components/outline/outline-parser";
import { analytics } from "@/lib/analytics";
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { submitChangeFeedback } from '@/lib/ai/change-feedback-client';
import {
  getAuthHeaders,
  normalizePath,
} from '@/components/ide/fullscreen/workbench-helpers';
import { WorkbenchSidebar } from '@/components/ide/fullscreen/WorkbenchSidebar';
import { WorkbenchEditorPane } from '@/components/ide/fullscreen/WorkbenchEditorPane';
import { WorkbenchPreviewPane } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import {
  WorkbenchEntryNotice,
} from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import {
  type InlineApplyResult,
} from '@/components/ide/fullscreen/types';
import { useWorkbenchEntryConvergence } from '@/components/ide/fullscreen/useWorkbenchEntryConvergence';
import { useWorkbenchChrome } from '@/components/ide/fullscreen/useWorkbenchChrome';
import { useWorkbenchFiles } from '@/components/ide/fullscreen/useWorkbenchFiles';
import { useWorkbenchFullAccess } from '@/components/ide/fullscreen/useWorkbenchFullAccess';
import { useWorkbenchPresence } from '@/components/ide/fullscreen/useWorkbenchPresence';
import { useWorkbenchRealtimeCollaboration } from '@/components/ide/fullscreen/useWorkbenchRealtimeCollaboration';
import {
  LAST_PROJECT_ID_STORAGE_KEY,
  PREVIEW_ENABLED_STORAGE_KEY,
  PANEL_STATE_STORAGE_KEY,
  useWorkbenchShellState,
} from '@/components/ide/fullscreen/useWorkbenchShellState';

// NOTE: Workbench helpers + EntryNotice type + WorkbenchEntryNotice component
// live in components/ide/fullscreen/{workbench-helpers,WorkbenchEntryNotice}
// to keep this orchestrator under the component-budget.

function IDEContent() {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const fileParam = searchParams.get("file");
  const projectIdParam = searchParams.get("projectId");
  const entryParam = searchParams.get("entry");
  const previewUrlParam = searchParams.get("previewUrl");
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const primaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const secondaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
  const runtimeSyncTimerRef = useRef<number | null>(null)
  const lastRuntimeSyncAtRef = useRef<number>(0)
  const {
    projectId,
    splitEditorOpen,
    setSplitEditorOpen,
    splitDirection,
    setSplitDirection,
    splitActivePane,
    setSplitActivePane,
    nextOpenTarget,
    setNextOpenTarget,
    previewEnabled,
    setPreviewEnabled,
    modernPanelState,
    setModernPanelState,
    previewMode,
    setPreviewMode,
    sidebarTab,
    setSidebarTab,
    entryNotice,
    showIntelliSense,
    setShowIntelliSense,
    showDiagnostics,
    setShowDiagnostics,
    showOutline,
    setShowOutline,
    editorDiagnostics,
    setEditorDiagnostics,
    secondaryEditorDiagnostics,
    setSecondaryEditorDiagnostics,
    isCompactViewport,
    setIsCompactViewport,
    rollbackBusy,
    setRollbackBusy,
    hasToken,
    setHasToken,
    lastAiApply,
    setLastAiApply,
    openCommandPalette,
    handleOpenSettings,
    handleEditorUndo,
    handleEditorRedo,
    handleEditorFind,
    handleEditorReplace,
    emitLayoutEvent,
    handleAIInline,
    handleAIPanel,
    handleSelectSidebarTab,
    handleSelectPreviewMode,
    clearEntryNotice,
    showEntryNotice,
    handleToggleDiagnosticsPanel,
    handleJumpToOutlineSymbol,
  } = useWorkbenchShellState({
    projectIdParam,
    editorRef,
    primaryEditorRef,
    secondaryEditorRef,
  })
  const {
    previewRuntimeUrl,
    previewRuntimeInput,
    setPreviewRuntimeInput,
    showRuntimeSettings,
    setShowRuntimeSettings,
    runtimeHealth,
    runtimeHealthCheckedAt,
    isDiscoveringRuntime,
    isProvisioningRuntime,
    isSyncingRuntime,
    runtimeDiscoveryMessage,
    runtimeDiscoveryTone,
    runtimeHealthHint,
    runtimeReadiness,
    refreshRuntimeReadiness,
    runtimeStrategyLabel,
    runtimeStrategyHint,
    runtimePrimaryAction,
    runtimePrimaryActionLabel,
    forceInlinePreviewFallback,
    applyRuntimeUrl,
    discoverRuntime,
    provisionRuntime,
    syncRuntime,
    syncRuntimeFile,
    checkRuntimeHealth,
    handleUseInlineFallback,
    previewSandboxId,
  } = usePreviewRuntimeManager({
    projectId,
    previewEnabled,
    hasToken,
    previewUrlParam,
  })

  const scheduleRuntimeSync = useCallback(() => {
    if (!previewSandboxId || isSyncingRuntime) return
    if (runtimeSyncTimerRef.current) {
      window.clearTimeout(runtimeSyncTimerRef.current)
    }
    runtimeSyncTimerRef.current = window.setTimeout(() => {
      runtimeSyncTimerRef.current = null
      const now = Date.now()
      if (now - lastRuntimeSyncAtRef.current < 1000) return
      lastRuntimeSyncAtRef.current = now
      void syncRuntime()
    }, 1500)
  }, [previewSandboxId, isSyncingRuntime, syncRuntime])

  const {
    activeFile,
    fileError,
    isReadingFile,
    isSavingFile,
    previewRefreshTick,
    readFile,
    secondaryFile,
    setActiveFile,
    setFileError,
    setLastSavedAt,
    setPreviewRefreshTick,
    setSecondaryFile,
    workspaceFiles,
    workspaceFilesLoaded,
    writeFile,
  } = useWorkbenchFiles({
    projectId,
    fileParam,
    previewEnabled,
    previewSandboxId,
    scheduleRuntimeSync,
    syncRuntimeFile,
  })

  const bridgeActiveFile = splitActivePane === 'secondary' && secondaryFile ? secondaryFile : activeFile
  const activeDiagnostics = splitActivePane === 'secondary' ? secondaryEditorDiagnostics : editorDiagnostics
  const outlineSymbols = useMemo<DocumentSymbol[]>(() => {
    if (!bridgeActiveFile) return []
    return buildOutlineSymbols(bridgeActiveFile.content, bridgeActiveFile.language)
  }, [bridgeActiveFile])

  useEffect(() => {
    return () => {
      if (runtimeSyncTimerRef.current) {
        window.clearTimeout(runtimeSyncTimerRef.current)
        runtimeSyncTimerRef.current = null
      }
    }
  }, [])

  const {
    fullAccessActiveGrant,
    toggleFullAccess: handleToggleFullAccess,
  } = useWorkbenchFullAccess({
    hasToken,
    projectId,
  })

  const { headerCollaborators } = useWorkbenchPresence({
    hasToken,
    projectId,
  })

  const {
    collaborationConnected,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  } = useWorkbenchRealtimeCollaboration({
    hasToken,
    projectId,
  })

  useWorkbenchChrome({
    lastProjectIdStorageKey: LAST_PROJECT_ID_STORAGE_KEY,
    previewEnabledStorageKey: PREVIEW_ENABLED_STORAGE_KEY,
    panelStateStorageKey: PANEL_STATE_STORAGE_KEY,
    projectId,
    previewEnabled,
    modernPanelState,
    setModernPanelState,
    setShowDiagnostics,
    setHasToken,
    setIsCompactViewport,
    handleSelectPreviewMode,
    handleSelectSidebarTab,
    openCommandPalette,
    emitLayoutEvent,
    handleEditorUndo,
    handleEditorRedo,
    handleEditorFind,
    handleEditorReplace,
    handleAIInline,
    handleAIPanel,
  })

  const handleSaveActiveFile = useCallback(() => {
    if (!activeFile) return
    void writeFile(activeFile.path, activeFile.content)
  }, [activeFile, writeFile])

  useEffect(() => {
    if (!activeFile?.path) {
      setEditorDiagnostics([])
    }
  }, [activeFile?.path, setEditorDiagnostics])

  useEffect(() => {
    if (!splitEditorOpen || secondaryFile || !activeFile) return
    setSecondaryFile({ ...activeFile })
  }, [activeFile, secondaryFile, setSecondaryFile, splitEditorOpen])

  useWorkbenchEntryConvergence({
    entryParam,
    clearEntryNotice,
    openCommandPalette,
    showEntryNotice,
    setPreviewEnabled,
    handleSelectPreviewMode,
  })

  useEffect(() => {
    const onOpenFileFromContext = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; startLine?: number; endLine?: number; source?: string }>).detail
      const targetPath = typeof detail?.path === 'string' ? normalizePath(detail.path) : null
      if (!targetPath) return
      const startLine = typeof detail?.startLine === 'number' ? detail.startLine : null
      const endLine = typeof detail?.endLine === 'number' ? detail.endLine : startLine

      analytics?.track?.('project', 'project_open', {
        metadata: {
          source: detail?.source || 'ai-context',
          projectId,
          file: targetPath,
          startLine,
          endLine,
        },
      })

      void readFile(targetPath).then(() => {
        if (!editorRef.current || !startLine) return
        editorRef.current.revealLineInCenter(startLine)
        editorRef.current.setPosition({ lineNumber: startLine, column: 1 })
        if (endLine && endLine >= startLine) {
          editorRef.current.setSelection({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: 1,
          })
        }
        editorRef.current.focus()
      })
      window.dispatchEvent(new Event('aethel.layout.openAI'))
    }

    window.addEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener)
    return () => {
      window.removeEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener)
    }
  }, [projectId, readFile]);

  useEffect(() => {
    analytics?.track("engine", "editor_open", {
      metadata: {
        surface: "ide",
        projectId,
        file: fileParam ?? null,
        entry: entryParam ?? null,
        runtimePreviewUrl: previewRuntimeUrl ?? null,
      },
    });
    analytics?.trackPageLoad?.("ide");
  }, [entryParam, fileParam, projectId, previewRuntimeUrl]);

  const handleFileSelect = useCallback(
    (file: { path: string; type: "file" | "folder" }) => {
      if (file.type !== "file") return;
      void readFile(file.path, nextOpenTarget);
    },
    [nextOpenTarget, readFile]
  );

  const handlePaletteOpenFile = useCallback((path: string) => {
    void readFile(path, nextOpenTarget);
  }, [nextOpenTarget, readFile]);

  const handleRunRecommendedPreviewAction = useCallback(() => {
    if (runtimePrimaryAction === 'provision') {
      void provisionRuntime('manual').then(() => {
        void refreshRuntimeReadiness()
      })
      return
    }
    if (runtimePrimaryAction === 'discover') {
      void discoverRuntime('manual').then(() => {
        void refreshRuntimeReadiness()
      })
      return
    }
    handleUseInlineFallback()
  }, [
    discoverRuntime,
    handleUseInlineFallback,
    provisionRuntime,
    refreshRuntimeReadiness,
    runtimePrimaryAction,
  ])

  const handleToggleSplitEditor = useCallback(() => {
    setSplitEditorOpen((prev) => {
      const next = !prev
      if (!next) {
        setSecondaryFile(null)
        setNextOpenTarget('primary')
        setSplitActivePane('primary')
      } else if (activeFile) {
        setSecondaryFile((current) => current ?? { ...activeFile })
      }
      return next
    })
  }, [activeFile, setNextOpenTarget, setSecondaryFile, setSplitActivePane, setSplitEditorOpen])

  const splitEditorGroups = useMemo<EditorGroup[]>(() => {
    const groups: EditorGroup[] = []
    if (activeFile) {
      const primaryTab: EditorTab = {
        id: `primary:${activeFile.path}`,
        title: activeFile.path.split('/').pop() || activeFile.path,
        path: activeFile.path,
        language: activeFile.language,
        dirty: false,
        pinned: true,
        preview: false,
      }
      groups.push({
        id: 'primary',
        tabs: [primaryTab],
        activeTabId: primaryTab.id,
      })
    }

    if (splitEditorOpen && secondaryFile) {
      const secondaryTab: EditorTab = {
        id: `secondary:${secondaryFile.path}`,
        title: secondaryFile.path.split('/').pop() || secondaryFile.path,
        path: secondaryFile.path,
        language: secondaryFile.language,
        dirty: false,
        pinned: false,
        preview: false,
      }
      groups.push({
        id: 'secondary',
        tabs: [secondaryTab],
        activeTabId: secondaryTab.id,
      })
    }

    return groups
  }, [activeFile, secondaryFile, splitEditorOpen])

  const handleInlineApplyResult = useCallback((result: InlineApplyResult) => {
    setLastAiApply({
      runId: result.runId,
      rollbackToken: result.rollbackToken,
      message: result.message,
      filePath: result.filePath,
      appliedAt: new Date().toISOString(),
    })
  }, [setLastAiApply])

  const handleRollbackLastAiApply = useCallback(() => {
    if (!lastAiApply?.rollbackToken || rollbackBusy || !activeFile) return

    void (async () => {
      setRollbackBusy(true)
      setFileError(null)
      try {
        const rollbackRunId = lastAiApply.runId
        const rollbackFilePath = lastAiApply.filePath || activeFile.path
        const response = await fetch('/api/ai/change/rollback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            rollbackToken: lastAiApply.rollbackToken,
          }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string }
        if (!response.ok) {
          throw new Error(payload.error || payload.message || `Falha ao desfazer (HTTP ${response.status})`)
        }

        const rollbackPath = rollbackFilePath
        await readFile(rollbackPath)
        setPreviewRefreshTick((prev) => prev + 1)
        setLastSavedAt(new Date())
        setLastAiApply(null)
        if (rollbackRunId) {
          void submitChangeFeedback({
            runId: rollbackRunId,
            feedback: 'rejected',
            reason: 'USER_TRIGGERED_ROLLBACK',
            notes: 'User triggered rollback from IDE status bar.',
            filePath: rollbackPath,
            runSource: 'production',
          })
        }
        analytics?.track?.('project', 'project_save', {
          metadata: {
            source: 'ide-inline-rollback',
            projectId,
            file: rollbackPath,
            runId: lastAiApply.runId,
          },
        })
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Não foi possível desfazer a última aplicação de IA.')
      } finally {
        setRollbackBusy(false)
      }
    })()
  }, [activeFile, lastAiApply?.filePath, lastAiApply?.rollbackToken, lastAiApply?.runId, projectId, readFile, rollbackBusy, setFileError, setLastAiApply, setLastSavedAt, setPreviewRefreshTick, setRollbackBusy])

  return (
    <CommandPaletteProvider
      onOpenFile={handlePaletteOpenFile}
      onOpenFileDialog={() => openCommandPalette('files')}
      onSaveFile={handleSaveActiveFile}
      onUndo={handleEditorUndo}
      onRedo={handleEditorRedo}
      onFind={handleEditorFind}
      onReplace={handleEditorReplace}
      onOpenSettings={handleOpenSettings}
      onToggleSidebar={() => emitLayoutEvent("aethel.layout.toggleSidebar")}
      onToggleTerminal={() => emitLayoutEvent("aethel.layout.toggleTerminal")}
      onAIChat={handleAIPanel}
      files={workspaceFilesLoaded ? workspaceFiles : []}
    >
      <IdeWorkbenchCommandExtras />
      <TabProvider>
        <EditorApplyBridgeProvider
          editorRef={editorRef}
          activeFilePath={bridgeActiveFile?.path ?? null}
          activeFileContent={bridgeActiveFile?.content ?? ""}
          normalizePath={normalizePath}
          writeFile={writeFile}
          readFile={readFile}
        >
        <ModernIDEShell
            projectName={`Projeto ${projectId}`}
            activeFileName={activeFile?.path}
            headerExtras={
              headerCollaborators.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid var(--aethel-border-secondary)',
                    background: 'color-mix(in srgb, var(--aethel-surface-secondary) 68%, transparent)',
                  }}
                >
                  <CollaboratorsBar
                    peers={headerCollaborators}
                    maxVisible={4}
                    showStatusDot
                  />
                </div>
              ) : null
            }
            banner={
              entryNotice ? (
                <WorkbenchEntryNotice
                  notice={entryNotice}
                  onDismiss={clearEntryNotice}
                />
              ) : null
            }
            panelState={modernPanelState}
            onResizePanel={(panel, size) => {
              setModernPanelState((prev) => ({
                ...prev,
                [panel]: {
                  ...prev[panel],
                  size,
                },
              }))
            }}
            onToggleSidebar={() => {
              setModernPanelState((prev) => ({
                ...prev,
                sidebar: {
                  ...prev.sidebar,
                  open: !prev.sidebar.open,
                },
              }))
            }}
            onTogglePanel={(panel) => {
              if (panel === 'preview') {
                setPreviewEnabled((prev) => !prev)
                return
              }
              if (panel === 'chat') {
                handleAIPanel()
              }
              setModernPanelState((prev) => ({
                ...prev,
                [panel]: {
                  ...prev[panel],
                  open: !prev[panel].open,
                },
              }))
            }}
            onRunPrimaryAction={handleRunRecommendedPreviewAction}
            onOpenSettings={handleOpenSettings}
            onOpenCommandPalette={openCommandPalette}
            onSelectSidebarTab={handleSelectSidebarTab}
            onSelectPreviewMode={handleSelectPreviewMode}
            onToggleDiagnostics={handleToggleDiagnosticsPanel}
            activeSidebarTab={sidebarTab}
            activePreviewMode={previewMode}
          >
            {{
              sidebar: (
                <WorkbenchSidebar
                  sidebarTab={sidebarTab}
                  onSidebarTabChange={setSidebarTab}
                  onFileSelect={handleFileSelect}
                />
              ),
              chat: <AIChatPanelContainer />,
              editor: (
                <WorkbenchEditorPane
                  activeFile={activeFile}
                  secondaryFile={secondaryFile}
                  bridgeActiveFile={bridgeActiveFile}
                  activeDiagnostics={activeDiagnostics}
                  splitEditorGroups={splitEditorGroups}
                  outlineSymbols={outlineSymbols}
                  splitEditorOpen={splitEditorOpen}
                  splitActivePane={splitActivePane}
                  splitDirection={splitDirection}
                  nextOpenTarget={nextOpenTarget}
                  isCompactViewport={isCompactViewport}
                  isReadingFile={isReadingFile}
                  fileError={fileError}
                  showIntelliSense={showIntelliSense}
                  showOutline={showOutline}
                  showDiagnostics={showDiagnostics}
                  fullAccessActive={Boolean(fullAccessActiveGrant)}
                  collaborationConnected={collaborationConnected}
                  collaborationPeers={editorPeers}
                  primaryEditorRef={primaryEditorRef}
                  secondaryEditorRef={secondaryEditorRef}
                  editorRef={editorRef}
                  setSplitActivePane={setSplitActivePane}
                  setSecondaryFile={setSecondaryFile}
                  setActiveFile={setActiveFile}
                  setShowIntelliSense={setShowIntelliSense}
                  setShowOutline={setShowOutline}
                  setShowDiagnostics={setShowDiagnostics}
                  setSplitDirection={setSplitDirection}
                  setNextOpenTarget={setNextOpenTarget}
                  setSplitEditorOpen={setSplitEditorOpen}
                  setEditorDiagnostics={setEditorDiagnostics}
                  setSecondaryEditorDiagnostics={setSecondaryEditorDiagnostics}
                  onFind={handleEditorFind}
                  onReplace={handleEditorReplace}
                  onToggleSplitEditor={handleToggleSplitEditor}
                  onJumpToOutlineSymbol={handleJumpToOutlineSymbol}
                  onInlineApplyResult={handleInlineApplyResult}
                  onRequestFullAccess={handleToggleFullAccess}
                  onSaveFile={writeFile}
                  onCursorPresenceChange={broadcastCursor}
                  onSelectionPresenceChange={broadcastSelection}
                />
              ),
              preview: (
                <WorkbenchPreviewPane
                  activeFile={activeFile}
                  previewMode={previewMode}
                  previewRefreshTick={previewRefreshTick}
                  previewRuntimeUrl={previewRuntimeUrl}
                  previewRuntimeInput={previewRuntimeInput}
                  showRuntimeSettings={showRuntimeSettings}
                  runtimeHealth={runtimeHealth}
                  runtimeHealthCheckedAt={runtimeHealthCheckedAt}
                  runtimeHealthHint={runtimeHealthHint}
                  runtimeReadiness={runtimeReadiness}
                  runtimePrimaryAction={runtimePrimaryAction}
                  runtimePrimaryActionLabel={runtimePrimaryActionLabel}
                  runtimeStrategyLabel={runtimeStrategyLabel}
                  runtimeStrategyHint={runtimeStrategyHint}
                  runtimeDiscoveryMessage={runtimeDiscoveryMessage}
                  runtimeDiscoveryTone={runtimeDiscoveryTone}
                  isDiscoveringRuntime={isDiscoveringRuntime}
                  isProvisioningRuntime={isProvisioningRuntime}
                  isSyncingRuntime={isSyncingRuntime}
                  previewSandboxId={previewSandboxId}
                  forceInlinePreviewFallback={forceInlinePreviewFallback}
                  isSavingFile={isSavingFile}
                  projectId={projectId}
                  setPreviewMode={setPreviewMode}
                  setPreviewRuntimeInput={setPreviewRuntimeInput}
                  setShowRuntimeSettings={setShowRuntimeSettings}
                  setPreviewRefreshTick={setPreviewRefreshTick}
                  applyRuntimeUrl={applyRuntimeUrl}
                  handleUseInlineFallback={handleUseInlineFallback}
                  refreshRuntimeReadiness={refreshRuntimeReadiness}
                  discoverRuntime={discoverRuntime}
                  provisionRuntime={provisionRuntime}
                  syncRuntime={syncRuntime}
                  checkRuntimeHealth={checkRuntimeHealth}
                />
              ),
            }}
        </ModernIDEShell>
        </EditorApplyBridgeProvider>
      </TabProvider>
    </CommandPaletteProvider>
  );
}

export default function FullscreenIDE() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6 text-sm text-[var(--aethel-text-tertiary)]">
          Carregando contexto do workspace...
        </div>
      }
    >
      <IDEContent />
    </Suspense>
  );
}


