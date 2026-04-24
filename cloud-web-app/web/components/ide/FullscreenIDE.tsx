"use client";

import { Suspense, useMemo, useRef } from "react";
import type * as monacoEditor from 'monaco-editor';

import FullscreenIDEWorkspaceBridge from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge';
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

  return (
    <FullscreenIDEWorkspaceBridge
      projectId={projectId}
      activeFile={activeFile}
      bridgeActiveFile={bridgeActiveFile}
      editorRef={editorRef}
      primaryEditorRef={primaryEditorRef}
      secondaryEditorRef={secondaryEditorRef}
      headerCollaborators={headerCollaborators}
      entryNotice={entryNotice}
      clearEntryNotice={clearEntryNotice}
      workspaceFilesLoaded={workspaceFilesLoaded}
      workspaceFiles={workspaceFiles}
      sidebarTab={sidebarTab}
      modernPanelState={modernPanelState}
      previewMode={previewMode}
      onResizePanel={onResizePanel}
      onToggleSidebar={onToggleSidebar}
      onTogglePanel={onTogglePanel}
      onRunPrimaryAction={handleRunRecommendedPreviewAction}
      handleOpenSettings={handleOpenSettings}
      openCommandPalette={openCommandPalette}
      handleSelectSidebarTab={handleSelectSidebarTab}
      handleSelectPreviewMode={handleSelectPreviewMode}
      handleToggleDiagnosticsPanel={handleToggleDiagnosticsPanel}
      setSidebarTab={setSidebarTab}
      nextOpenTarget={nextOpenTarget}
      readFile={readFile}
      writeFile={writeFile}
      setLastAiApply={setLastAiApply}
      emitLayoutEvent={emitLayoutEvent}
      handleEditorUndo={handleEditorUndo}
      handleEditorRedo={handleEditorRedo}
      handleEditorFind={handleEditorFind}
      handleEditorReplace={handleEditorReplace}
      handleAIPanel={handleAIPanel}
      secondaryFile={secondaryFile}
      activeDiagnostics={activeDiagnostics}
      splitEditorGroups={splitEditorGroups}
      outlineSymbols={outlineSymbols}
      splitEditorOpen={splitEditorOpen}
      splitActivePane={splitActivePane}
      splitDirection={splitDirection}
      isCompactViewport={isCompactViewport}
      isReadingFile={isReadingFile}
      fileError={fileError}
      showIntelliSense={showIntelliSense}
      showOutline={showOutline}
      showDiagnostics={showDiagnostics}
      fullAccessActiveGrant={fullAccessActiveGrant}
      collaborationConnected={collaborationConnected}
      editorPeers={editorPeers}
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
      handleToggleSplitEditor={handleToggleSplitEditor}
      handleJumpToOutlineSymbol={handleJumpToOutlineSymbol}
      handleToggleFullAccess={handleToggleFullAccess}
      broadcastCursor={broadcastCursor}
      broadcastSelection={broadcastSelection}
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
