"use client";

import { Suspense, useRef } from "react";
import type * as monacoEditor from 'monaco-editor';

import FullscreenIDEWorkspaceBridge from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge';
import type { FullscreenIDEWorkspaceBridgeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import { useWorkbenchChrome } from '@/components/ide/fullscreen/useWorkbenchChrome';
import { useWorkbenchRouteParams } from '@/components/ide/fullscreen/useWorkbenchRouteParams';
import { useWorkbenchEditorModel } from '@/components/ide/fullscreen/useWorkbenchEditorModel';
import { useWorkbenchEntryConvergence } from '@/components/ide/fullscreen/useWorkbenchEntryConvergence';
import { useWorkbenchFiles } from '@/components/ide/fullscreen/useWorkbenchFiles';
import { useWorkbenchFullAccess } from '@/components/ide/fullscreen/useWorkbenchFullAccess';
import { useWorkbenchIDEEffects } from '@/components/ide/fullscreen/useWorkbenchIDEEffects';
import { useWorkbenchPanelCallbacks } from '@/components/ide/fullscreen/useWorkbenchPanelCallbacks';
import { useWorkbenchPresence } from '@/components/ide/fullscreen/useWorkbenchPresence';
import { useWorkbenchRealtimeCollaboration } from '@/components/ide/fullscreen/useWorkbenchRealtimeCollaboration';
import { useWorkbenchRuntimeActions } from '@/components/ide/fullscreen/useWorkbenchRuntimeActions';
import { useFullscreenIDEBridgeProps } from '@/components/ide/fullscreen/useFullscreenIDEBridgeProps';
import { useWorkbenchRuntimeSyncScheduler } from '@/components/ide/fullscreen/useWorkbenchRuntimeSyncScheduler';
import {
  BOTTOM_PANEL_MODE_STORAGE_KEY,
  LAST_PROJECT_ID_STORAGE_KEY,
  PANEL_STATE_STORAGE_KEY,
  PREVIEW_ENABLED_STORAGE_KEY,
  useWorkbenchShellState,
} from '@/components/ide/fullscreen/useWorkbenchShellState';
import { usePreviewRuntimeManager } from '@/hooks/usePreviewRuntimeManager';

// NOTE: Workbench helpers + banner components live in components/ide/fullscreen/*
// so this file stays focused on route bootstrap + service orchestration.

function IDEContent() {
  const { fileParam, projectIdParam, entryParam, previewUrlParam } = useWorkbenchRouteParams();
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
    activeBottomPanel,
    setActiveBottomPanel,
    previewMode,
    setPreviewMode,
    sidebarTab,
    setSidebarTab,
    editorCursorStatus,
    editorSelectionStatus,
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
    handleAIPanel,
    handleSelectSidebarTab,
    handleSelectPreviewMode,
    clearEntryNotice,
    showEntryNotice,
    handleToggleDiagnosticsPanel,
    handleJumpToOutlineSymbol,
    handleEditorCursorStatus,
    handleEditorSelectionStatus,
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
    setActiveBottomPanel,
    setPreviewEnabled,
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
    bottomPanelModeStorageKey: BOTTOM_PANEL_MODE_STORAGE_KEY,
    projectId,
    previewEnabled,
    modernPanelState,
    setModernPanelState,
    activeBottomPanel,
    setActiveBottomPanel,
    setShowDiagnostics,
    setHasToken,
    setIsCompactViewport,
    handleSelectSidebarTab,
    openCommandPalette,
    emitLayoutEvent,
    handleEditorUndo,
    handleEditorRedo,
    handleEditorFind,
    handleEditorReplace,
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

  const bridgeProps: FullscreenIDEWorkspaceBridgeProps = useFullscreenIDEBridgeProps({
    projectId,
    activeFile,
    bridgeActiveFile,
    secondaryFile,
    editorRef,
    primaryEditorRef,
    secondaryEditorRef,
    headerCollaborators,
    entryNotice,
    clearEntryNotice,
    workspaceFilesLoaded,
    workspaceFiles,
    sidebarTab,
    modernPanelState,
    activeBottomPanel,
    previewMode,
    editorCursorStatus,
    editorSelectionStatus,
    onResizePanel,
    onToggleSidebar,
    onTogglePanel,
    setActiveBottomPanel,
    onRunPrimaryAction: handleRunRecommendedPreviewAction,
    handleOpenSettings,
    openCommandPalette,
    handleSelectSidebarTab,
    handleSelectPreviewMode,
    handleToggleDiagnosticsPanel,
    setSidebarTab,
    nextOpenTarget,
    readFile,
    writeFile,
    setLastAiApply,
    emitLayoutEvent,
    activeDiagnostics,
    splitEditorGroups,
    outlineSymbols,
    splitEditorOpen,
    splitActivePane,
    splitDirection,
    isCompactViewport,
    isReadingFile,
    fileError,
    showIntelliSense,
    showOutline,
    showDiagnostics,
    fullAccessActiveGrant,
    collaborationConnected,
    editorPeers,
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
    handleEditorUndo,
    handleEditorRedo,
    handleEditorFind,
    handleEditorReplace,
    handleAIPanel,
    handleToggleSplitEditor,
    handleJumpToOutlineSymbol,
    handleToggleFullAccess,
    broadcastCursor,
    broadcastSelection,
    handleEditorCursorStatus,
    handleEditorSelectionStatus,
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
  });

  return <FullscreenIDEWorkspaceBridge {...bridgeProps} />;
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
