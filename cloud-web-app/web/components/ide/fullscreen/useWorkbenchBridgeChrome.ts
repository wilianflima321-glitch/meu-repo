'use client';

import type { FullscreenIDEWorkspaceBridgeChromeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import type { UseFullscreenIDEBridgePropsArgs } from '@/components/ide/fullscreen/useFullscreenIDEBridgeProps.types';

export function buildFullscreenIDEBridgeChromeProps(
  args: UseFullscreenIDEBridgePropsArgs,
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
    statusBar: {
      activeFilePath: args.bridgeActiveFile?.path ?? args.activeFile?.path ?? null,
      activeFileLanguage: args.bridgeActiveFile?.language ?? args.activeFile?.language ?? null,
      activeDiagnostics: args.activeDiagnostics,
      panelState: args.modernPanelState,
      activeSidebarTab: args.sidebarTab,
      activePreviewMode: args.previewMode,
      activeBottomPanel: args.activeBottomPanel,
      splitEditorOpen: args.splitEditorOpen,
      splitActivePane: args.splitActivePane,
      collaborationConnected: args.collaborationStatus.state === 'live',
      collaboratorCount: args.collaborationStatus.state === 'live' ? args.editorPeers.length : 0,
      runtimeHealth: args.runtimeHealth,
      runtimeReadinessStatus: args.runtimeReadiness?.status ?? null,
      cursorStatus: args.editorCursorStatus,
      selectionStatus: args.editorSelectionStatus,
    },
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
