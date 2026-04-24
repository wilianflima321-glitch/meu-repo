"use client";

import { Suspense, useCallback, useMemo, useRef } from "react";
import type * as monacoEditor from 'monaco-editor';

import CollaboratorsBar from "@/components/collaboration/CollaboratorsBar";
import { FullscreenIDEWorkspace } from '@/components/ide/fullscreen/FullscreenIDEWorkspace';
import { WorkbenchEntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { InlineApplyResult } from '@/components/ide/fullscreen/types';
import { useWorkbenchChrome } from '@/components/ide/fullscreen/useWorkbenchChrome';
import { useWorkbenchEditorModel } from '@/components/ide/fullscreen/useWorkbenchEditorModel';
import { useWorkbenchEntryConvergence } from '@/components/ide/fullscreen/useWorkbenchEntryConvergence';
import { useWorkbenchFiles } from '@/components/ide/fullscreen/useWorkbenchFiles';
import { useWorkbenchFullAccess } from '@/components/ide/fullscreen/useWorkbenchFullAccess';
import { useWorkbenchIDEEffects } from '@/components/ide/fullscreen/useWorkbenchIDEEffects';
import { useWorkbenchPanelCallbacks } from '@/components/ide/fullscreen/useWorkbenchPanelCallbacks';
import { useWorkbenchPresence } from '@/components/ide/fullscreen/useWorkbenchPresence';
import { useWorkbenchRealtimeCollaboration } from '@/components/ide/fullscreen/useWorkbenchRealtimeCollaboration';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { useWorkbenchRuntimeSyncScheduler } from '@/components/ide/fullscreen/useWorkbenchRuntimeSyncScheduler';
import {
  LAST_PROJECT_ID_STORAGE_KEY,
  PANEL_STATE_STORAGE_KEY,
  PREVIEW_ENABLED_STORAGE_KEY,
  useWorkbenchShellState,
} from '@/components/ide/fullscreen/useWorkbenchShellState';
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';

// NOTE: Workbench helpers + banner components live in components/ide/fullscreen/*
// so this file stays focused on route bootstrap + service orchestration.

function IDEContent() {
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const fileParam = searchParams.get('file');
  const projectIdParam = searchParams.get('projectId');
  const entryParam = searchParams.get('entry');
  const previewUrlParam = searchParams.get('previewUrl');
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const primaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const secondaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

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
    hasToken,
    setHasToken,
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
  });

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
  });

  const { scheduleRuntimeSync } = useWorkbenchRuntimeSyncScheduler({
    previewSandboxId,
    isSyncingRuntime,
    syncRuntime,
  });

  const {
    activeFile,
    fileError,
    isReadingFile,
    isSavingFile,
    previewRefreshTick,
    readFile,
    secondaryFile,
    setActiveFile,
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
  });

  const {
    bridgeActiveFile,
    activeDiagnostics,
    outlineSymbols,
    splitEditorGroups,
    handleToggleSplitEditor,
  } = useWorkbenchEditorModel({
    activeFile,
    secondaryFile,
    splitEditorOpen,
    splitActivePane,
    editorDiagnostics,
    secondaryEditorDiagnostics,
    setSplitEditorOpen,
    setSplitActivePane,
    setSecondaryFile,
    setNextOpenTarget,
    setEditorDiagnostics,
  });

  const {
    fullAccessActiveGrant,
    toggleFullAccess: handleToggleFullAccess,
  } = useWorkbenchFullAccess({
    hasToken,
    projectId,
  });

  const { headerCollaborators } = useWorkbenchPresence({
    hasToken,
    projectId,
  });

  const {
    collaborationConnected,
    editorPeers,
    broadcastCursor,
    broadcastSelection,
  } = useWorkbenchRealtimeCollaboration({
    hasToken,
    projectId,
  });

  const { onResizePanel, onToggleSidebar, onTogglePanel } = useWorkbenchPanelCallbacks({
    setModernPanelState,
    setPreviewEnabled,
    handleAIPanel,
  });

  const { runRecommendedAction: handleRunRecommendedPreviewAction } = useWorkbenchRuntimeActions({
    runtimePrimaryAction,
    refreshRuntimeReadiness,
    discoverRuntime,
    provisionRuntime,
    handleUseInlineFallback,
  });

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
  });

  useWorkbenchEntryConvergence({
    entryParam,
    clearEntryNotice,
    openCommandPalette,
    showEntryNotice,
    setPreviewEnabled,
    handleSelectPreviewMode,
  });

  useWorkbenchIDEEffects({
    editorRef,
    entryParam,
    fileParam,
    previewRuntimeUrl,
    projectId,
    readFile,
  });

  const handleSaveActiveFile = useCallback(() => {
    if (!activeFile) return;
    void writeFile(activeFile.path, activeFile.content);
  }, [activeFile, writeFile]);

  const handleFileSelect = useCallback(
    (file: { path: string; type: 'file' | 'folder' }) => {
      if (file.type !== 'file') return;
      void readFile(file.path, nextOpenTarget);
    },
    [nextOpenTarget, readFile]
  );

  const handlePaletteOpenFile = useCallback(
    (path: string) => {
      void readFile(path, nextOpenTarget);
    },
    [nextOpenTarget, readFile]
  );

  const handleInlineApplyResult = useCallback(
    (result: InlineApplyResult) => {
      setLastAiApply({
        runId: result.runId,
        rollbackToken: result.rollbackToken,
        message: result.message,
        filePath: result.filePath,
        appliedAt: new Date().toISOString(),
      });
    },
    [setLastAiApply]
  );

  return (
    <FullscreenIDEWorkspace
      projectId={projectId}
      activeFile={activeFile}
      bridgeActiveFile={bridgeActiveFile}
      editorRef={editorRef}
      headerExtras={
        headerCollaborators.length > 0 ? (
          <CollaboratorsBar
            peers={headerCollaborators}
            maxVisible={4}
            showStatusDot
            className="max-w-full"
          />
        ) : null
      }
      banner={
        entryNotice ? <WorkbenchEntryNotice notice={entryNotice} onDismiss={clearEntryNotice} /> : null
      }
      workspaceFilesLoaded={workspaceFilesLoaded}
      workspaceFiles={workspaceFiles}
      sidebarTab={sidebarTab}
      panelState={modernPanelState}
      previewMode={previewMode}
      onResizePanel={onResizePanel}
      onToggleSidebar={onToggleSidebar}
      onTogglePanel={onTogglePanel}
      onRunPrimaryAction={handleRunRecommendedPreviewAction}
      onOpenSettings={handleOpenSettings}
      onOpenCommandPalette={openCommandPalette}
      onSelectSidebarTab={handleSelectSidebarTab}
      onSelectPreviewMode={handleSelectPreviewMode}
      onToggleDiagnostics={handleToggleDiagnosticsPanel}
      onSidebarTabChange={setSidebarTab}
      onFileSelect={handleFileSelect}
      onPaletteOpenFile={handlePaletteOpenFile}
      onSaveActiveFile={handleSaveActiveFile}
      onEditorUndo={handleEditorUndo}
      onEditorRedo={handleEditorRedo}
      onEditorFind={handleEditorFind}
      onEditorReplace={handleEditorReplace}
      onAIChat={handleAIPanel}
      emitLayoutEvent={emitLayoutEvent}
      writeFile={(path, content) => Promise.resolve(writeFile(path, content))}
      readFile={(path) => Promise.resolve(readFile(path))}
      editorPaneProps={{
        activeFile,
        secondaryFile,
        bridgeActiveFile,
        activeDiagnostics,
        splitEditorGroups,
        outlineSymbols,
        splitEditorOpen,
        splitActivePane,
        splitDirection,
        nextOpenTarget,
        isCompactViewport,
        isReadingFile,
        fileError,
        showIntelliSense,
        showOutline,
        showDiagnostics,
        fullAccessActive: Boolean(fullAccessActiveGrant),
        collaborationConnected,
        collaborationPeers: editorPeers,
        primaryEditorRef,
        secondaryEditorRef,
        editorRef,
        setSplitActivePane,
        setSecondaryFile,
        setActiveFile,
        setShowIntelliSense,
        setShowOutline,
        setShowDiagnostics,
        setSplitDirection,
        setNextOpenTarget,
        setSplitEditorOpen,
        setEditorDiagnostics,
        setSecondaryEditorDiagnostics,
        onFind: handleEditorFind,
        onReplace: handleEditorReplace,
        onToggleSplitEditor: handleToggleSplitEditor,
        onJumpToOutlineSymbol: handleJumpToOutlineSymbol,
        onInlineApplyResult: handleInlineApplyResult,
        onRequestFullAccess: handleToggleFullAccess,
        onSaveFile: writeFile,
        onCursorPresenceChange: broadcastCursor,
        onSelectionPresenceChange: broadcastSelection,
      }}
      previewPaneProps={{
        activeFile,
        previewMode,
        previewRefreshTick,
        previewRuntimeUrl,
        previewRuntimeInput,
        showRuntimeSettings,
        runtimeHealth,
        runtimeHealthCheckedAt,
        runtimeHealthHint,
        runtimeReadiness,
        runtimePrimaryAction,
        runtimePrimaryActionLabel,
        runtimeStrategyLabel,
        runtimeStrategyHint,
        runtimeDiscoveryMessage,
        runtimeDiscoveryTone,
        isDiscoveringRuntime,
        isProvisioningRuntime,
        isSyncingRuntime,
        previewSandboxId,
        forceInlinePreviewFallback,
        isSavingFile,
        projectId,
        setPreviewMode,
        setPreviewRuntimeInput,
        setShowRuntimeSettings,
        setPreviewRefreshTick,
        applyRuntimeUrl,
        handleUseInlineFallback,
        refreshRuntimeReadiness,
        discoverRuntime,
        provisionRuntime,
        syncRuntime,
        checkRuntimeHealth,
      }}
    />
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
