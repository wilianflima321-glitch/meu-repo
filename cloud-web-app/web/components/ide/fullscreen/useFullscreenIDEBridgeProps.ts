'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { FileItem } from '@/components/ide/CommandPalette';
import type { FullscreenIDEWorkspaceBridgeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import type { EntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { WorkbenchEditorPaneProps } from '@/components/ide/fullscreen/WorkbenchEditorPane';
import type { WorkbenchPreviewPaneProps } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import type { ActiveFileState, InlineApplyResult, PreviewMode, SidebarTab } from '@/components/ide/fullscreen/types';
import type { PanelState } from '@/components/ide/modern-shell/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

type EditorRef = RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

type UseFullscreenIDEBridgePropsArgs = {
  projectId: string;
  activeFile: ActiveFileState | null;
  bridgeActiveFile: ActiveFileState | null;
  secondaryFile: ActiveFileState | null;
  editorRef: EditorRef;
  primaryEditorRef: EditorRef;
  secondaryEditorRef: EditorRef;
  headerCollaborators: RemotePeer[];
  entryNotice: EntryNotice | null;
  clearEntryNotice: () => void;
  workspaceFilesLoaded: boolean;
  workspaceFiles: FileItem[];
  sidebarTab: SidebarTab;
  modernPanelState: PanelState;
  previewMode: PreviewMode;
  onResizePanel: (panel: keyof PanelState, size: number) => void;
  onToggleSidebar: () => void;
  onTogglePanel: (panel: keyof PanelState) => void;
  onRunPrimaryAction: () => void;
  handleOpenSettings: () => void;
  openCommandPalette: (mode: 'commands' | 'files') => void;
  handleSelectSidebarTab: (tab: SidebarTab) => void;
  handleSelectPreviewMode: (mode: PreviewMode) => void;
  handleToggleDiagnosticsPanel: () => void;
  setSidebarTab: Dispatch<SetStateAction<SidebarTab>>;
  nextOpenTarget: 'primary' | 'secondary';
  readFile: (path: string, target?: 'primary' | 'secondary') => Promise<void> | void;
  writeFile: (path: string, content: string) => Promise<void> | void;
  setLastAiApply: Dispatch<SetStateAction<(InlineApplyResult & { appliedAt: string }) | null>>;
  emitLayoutEvent: (eventName: string) => void;
  activeDiagnostics: WorkbenchEditorPaneProps['activeDiagnostics'];
  splitEditorGroups: WorkbenchEditorPaneProps['splitEditorGroups'];
  outlineSymbols: WorkbenchEditorPaneProps['outlineSymbols'];
  splitEditorOpen: boolean;
  splitActivePane: WorkbenchEditorPaneProps['splitActivePane'];
  splitDirection: WorkbenchEditorPaneProps['splitDirection'];
  isCompactViewport: boolean;
  isReadingFile: boolean;
  fileError: string | null;
  showIntelliSense: boolean;
  showOutline: boolean;
  showDiagnostics: boolean;
  fullAccessActiveGrant: unknown;
  collaborationConnected: boolean;
  editorPeers: RemotePeer[];
  setSplitActivePane: WorkbenchEditorPaneProps['setSplitActivePane'];
  setSecondaryFile: WorkbenchEditorPaneProps['setSecondaryFile'];
  setActiveFile: WorkbenchEditorPaneProps['setActiveFile'];
  setShowIntelliSense: WorkbenchEditorPaneProps['setShowIntelliSense'];
  setShowOutline: WorkbenchEditorPaneProps['setShowOutline'];
  setShowDiagnostics: WorkbenchEditorPaneProps['setShowDiagnostics'];
  setSplitDirection: WorkbenchEditorPaneProps['setSplitDirection'];
  setNextOpenTarget: WorkbenchEditorPaneProps['setNextOpenTarget'];
  setSplitEditorOpen: WorkbenchEditorPaneProps['setSplitEditorOpen'];
  setEditorDiagnostics: WorkbenchEditorPaneProps['setEditorDiagnostics'];
  setSecondaryEditorDiagnostics: WorkbenchEditorPaneProps['setSecondaryEditorDiagnostics'];
  handleEditorUndo: () => void;
  handleEditorRedo: () => void;
  handleEditorFind: () => void;
  handleEditorReplace: () => void;
  handleAIPanel: () => void;
  handleToggleSplitEditor: WorkbenchEditorPaneProps['onToggleSplitEditor'];
  handleJumpToOutlineSymbol: WorkbenchEditorPaneProps['onJumpToOutlineSymbol'];
  handleToggleFullAccess: WorkbenchEditorPaneProps['onRequestFullAccess'];
  broadcastCursor: WorkbenchEditorPaneProps['onCursorPresenceChange'];
  broadcastSelection: WorkbenchEditorPaneProps['onSelectionPresenceChange'];
  previewRefreshTick: number;
  previewRuntimeUrl: WorkbenchPreviewPaneProps['previewRuntimeUrl'];
  previewRuntimeInput: WorkbenchPreviewPaneProps['previewRuntimeInput'];
  showRuntimeSettings: boolean;
  runtimeHealth: WorkbenchPreviewPaneProps['runtimeHealth'];
  runtimeHealthCheckedAt: WorkbenchPreviewPaneProps['runtimeHealthCheckedAt'];
  runtimeHealthHint: string;
  runtimeReadiness: WorkbenchPreviewPaneProps['runtimeReadiness'];
  runtimePrimaryAction: WorkbenchPreviewPaneProps['runtimePrimaryAction'];
  runtimePrimaryActionLabel: string;
  runtimeStrategyLabel: string;
  runtimeStrategyHint: string;
  runtimeDiscoveryMessage: string | null;
  runtimeDiscoveryTone: WorkbenchPreviewPaneProps['runtimeDiscoveryTone'];
  isDiscoveringRuntime: boolean;
  isProvisioningRuntime: boolean;
  isSyncingRuntime: boolean;
  previewSandboxId: string | null;
  forceInlinePreviewFallback: boolean;
  isSavingFile: boolean;
  setPreviewMode: WorkbenchPreviewPaneProps['setPreviewMode'];
  setPreviewRuntimeInput: WorkbenchPreviewPaneProps['setPreviewRuntimeInput'];
  setShowRuntimeSettings: WorkbenchPreviewPaneProps['setShowRuntimeSettings'];
  setPreviewRefreshTick: WorkbenchPreviewPaneProps['setPreviewRefreshTick'];
  applyRuntimeUrl: WorkbenchPreviewPaneProps['applyRuntimeUrl'];
  handleUseInlineFallback: WorkbenchPreviewPaneProps['handleUseInlineFallback'];
  refreshRuntimeReadiness: WorkbenchPreviewPaneProps['refreshRuntimeReadiness'];
  discoverRuntime: WorkbenchPreviewPaneProps['discoverRuntime'];
  provisionRuntime: WorkbenchPreviewPaneProps['provisionRuntime'];
  syncRuntime: WorkbenchPreviewPaneProps['syncRuntime'];
  checkRuntimeHealth: WorkbenchPreviewPaneProps['checkRuntimeHealth'];
};

export function useFullscreenIDEBridgeProps(args: UseFullscreenIDEBridgePropsArgs): FullscreenIDEWorkspaceBridgeProps {
  return {
    chrome: {
      projectId: args.projectId,
      headerCollaborators: args.headerCollaborators,
      entryNotice: args.entryNotice,
      clearEntryNotice: args.clearEntryNotice,
      workspaceFilesLoaded: args.workspaceFilesLoaded,
      workspaceFiles: args.workspaceFiles,
      sidebarTab: args.sidebarTab,
      modernPanelState: args.modernPanelState,
      previewMode: args.previewMode,
      onResizePanel: args.onResizePanel,
      onToggleSidebar: args.onToggleSidebar,
      onTogglePanel: args.onTogglePanel,
      onRunPrimaryAction: args.onRunPrimaryAction,
      handleOpenSettings: args.handleOpenSettings,
      openCommandPalette: args.openCommandPalette,
      handleSelectSidebarTab: args.handleSelectSidebarTab,
      handleSelectPreviewMode: args.handleSelectPreviewMode,
      handleToggleDiagnosticsPanel: args.handleToggleDiagnosticsPanel,
      setSidebarTab: args.setSidebarTab,
    },
    files: {
      activeFile: args.activeFile,
      bridgeActiveFile: args.bridgeActiveFile,
      editorRef: args.editorRef,
      nextOpenTarget: args.nextOpenTarget,
      readFile: args.readFile,
      writeFile: args.writeFile,
      setLastAiApply: args.setLastAiApply,
      emitLayoutEvent: args.emitLayoutEvent,
    },
    editor: {
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
    },
    preview: {
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
    },
  };
}
