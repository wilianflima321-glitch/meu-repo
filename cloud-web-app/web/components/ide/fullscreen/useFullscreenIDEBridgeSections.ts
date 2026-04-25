'use client';

import type {
  FullscreenIDEWorkspaceBridgeChromeProps,
  FullscreenIDEWorkspaceBridgeFileProps,
  FullscreenIDEWorkspaceBridgeProps,
} from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import type { WorkbenchPreviewPaneProps } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import type { UseFullscreenIDEBridgePropsArgs } from '@/components/ide/fullscreen/useFullscreenIDEBridgeProps.types';

export function buildFullscreenIDEBridgeChromeProps(
  args: UseFullscreenIDEBridgePropsArgs
): FullscreenIDEWorkspaceBridgeChromeProps {
  return {
    projectId: args.projectId,
    headerCollaborators: args.headerCollaborators,
    entryNotice: args.entryNotice,
    clearEntryNotice: args.clearEntryNotice,
    workspaceFilesLoaded: args.workspaceFilesLoaded,
    workspaceFiles: args.workspaceFiles,
    sidebarTab: args.sidebarTab,
    modernPanelState: args.modernPanelState,
    activeBottomPanel: args.activeBottomPanel,
    previewMode: args.previewMode,
    onResizePanel: args.onResizePanel,
    onToggleSidebar: args.onToggleSidebar,
    onTogglePanel: args.onTogglePanel,
    onSelectBottomPanel: args.setActiveBottomPanel,
    onRunPrimaryAction: args.onRunPrimaryAction,
    handleOpenSettings: args.handleOpenSettings,
    openCommandPalette: args.openCommandPalette,
    handleSelectSidebarTab: args.handleSelectSidebarTab,
    handleSelectPreviewMode: args.handleSelectPreviewMode,
    handleToggleDiagnosticsPanel: args.handleToggleDiagnosticsPanel,
    setSidebarTab: args.setSidebarTab,
  };
}

export function buildFullscreenIDEBridgeFileProps(
  args: UseFullscreenIDEBridgePropsArgs
): FullscreenIDEWorkspaceBridgeFileProps {
  return {
    activeFile: args.activeFile,
    bridgeActiveFile: args.bridgeActiveFile,
    editorRef: args.editorRef,
    nextOpenTarget: args.nextOpenTarget,
    readFile: args.readFile,
    writeFile: args.writeFile,
    setLastAiApply: args.setLastAiApply,
    emitLayoutEvent: args.emitLayoutEvent,
  };
}

export function buildFullscreenIDEBridgeEditorProps(
  args: UseFullscreenIDEBridgePropsArgs
): FullscreenIDEWorkspaceBridgeProps['editor'] {
  return {
    activeFile: args.activeFile,
    secondaryFile: args.secondaryFile,
    bridgeActiveFile: args.bridgeActiveFile,
    activeDiagnostics: args.activeDiagnostics,
    splitEditorGroups: args.splitEditorGroups,
    outlineSymbols: args.outlineSymbols,
    splitEditorOpen: args.splitEditorOpen,
    splitActivePane: args.splitActivePane,
    splitDirection: args.splitDirection,
    nextOpenTarget: args.nextOpenTarget,
    isCompactViewport: args.isCompactViewport,
    isReadingFile: args.isReadingFile,
    fileError: args.fileError,
    showIntelliSense: args.showIntelliSense,
    showOutline: args.showOutline,
    showDiagnostics: args.showDiagnostics,
    fullAccessActive: Boolean(args.fullAccessActiveGrant),
    collaborationConnected: args.collaborationConnected,
    collaborationPeers: args.editorPeers,
    primaryEditorRef: args.primaryEditorRef,
    secondaryEditorRef: args.secondaryEditorRef,
    editorRef: args.editorRef,
    setSplitActivePane: args.setSplitActivePane,
    setSecondaryFile: args.setSecondaryFile,
    setActiveFile: args.setActiveFile,
    setShowIntelliSense: args.setShowIntelliSense,
    setShowOutline: args.setShowOutline,
    setShowDiagnostics: args.setShowDiagnostics,
    setSplitDirection: args.setSplitDirection,
    setNextOpenTarget: args.setNextOpenTarget,
    setSplitEditorOpen: args.setSplitEditorOpen,
    setEditorDiagnostics: args.setEditorDiagnostics,
    setSecondaryEditorDiagnostics: args.setSecondaryEditorDiagnostics,
    onUndo: args.handleEditorUndo,
    onRedo: args.handleEditorRedo,
    onFind: args.handleEditorFind,
    onReplace: args.handleEditorReplace,
    onAIChat: args.handleAIPanel,
    onToggleSplitEditor: args.handleToggleSplitEditor,
    onJumpToOutlineSymbol: args.handleJumpToOutlineSymbol,
    onRequestFullAccess: args.handleToggleFullAccess,
    onCursorPresenceChange: args.broadcastCursor,
    onSelectionPresenceChange: args.broadcastSelection,
  };
}

export function buildFullscreenIDEBridgePreviewProps(
  args: UseFullscreenIDEBridgePropsArgs
): WorkbenchPreviewPaneProps {
  return {
    activeFile: args.activeFile,
    previewMode: args.previewMode,
    previewRefreshTick: args.previewRefreshTick,
    previewRuntimeUrl: args.previewRuntimeUrl,
    previewRuntimeInput: args.previewRuntimeInput,
    showRuntimeSettings: args.showRuntimeSettings,
    runtimeHealth: args.runtimeHealth,
    runtimeHealthCheckedAt: args.runtimeHealthCheckedAt,
    runtimeHealthHint: args.runtimeHealthHint,
    runtimeReadiness: args.runtimeReadiness,
    runtimePrimaryAction: args.runtimePrimaryAction,
    runtimePrimaryActionLabel: args.runtimePrimaryActionLabel,
    runtimeStrategyLabel: args.runtimeStrategyLabel,
    runtimeStrategyHint: args.runtimeStrategyHint,
    runtimeDiscoveryMessage: args.runtimeDiscoveryMessage,
    runtimeDiscoveryTone: args.runtimeDiscoveryTone,
    isDiscoveringRuntime: args.isDiscoveringRuntime,
    isProvisioningRuntime: args.isProvisioningRuntime,
    isSyncingRuntime: args.isSyncingRuntime,
    previewSandboxId: args.previewSandboxId,
    forceInlinePreviewFallback: args.forceInlinePreviewFallback,
    isSavingFile: args.isSavingFile,
    projectId: args.projectId,
    setPreviewMode: args.setPreviewMode,
    setPreviewRuntimeInput: args.setPreviewRuntimeInput,
    setShowRuntimeSettings: args.setShowRuntimeSettings,
    setPreviewRefreshTick: args.setPreviewRefreshTick,
    applyRuntimeUrl: args.applyRuntimeUrl,
    handleUseInlineFallback: args.handleUseInlineFallback,
    refreshRuntimeReadiness: args.refreshRuntimeReadiness,
    discoverRuntime: args.discoverRuntime,
    provisionRuntime: args.provisionRuntime,
    syncRuntime: args.syncRuntime,
    checkRuntimeHealth: args.checkRuntimeHealth,
  };
}
