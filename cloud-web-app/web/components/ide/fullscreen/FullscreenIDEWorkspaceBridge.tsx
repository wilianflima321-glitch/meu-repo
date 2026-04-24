'use client';

import { useCallback } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import CollaboratorsBar from '@/components/collaboration/CollaboratorsBar';
import { FullscreenIDEWorkspace } from '@/components/ide/fullscreen/FullscreenIDEWorkspace';
import { WorkbenchEntryNotice, type EntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type {
  ActiveFileState,
  InlineApplyResult,
  PreviewMode,
  SidebarTab,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import type { PanelState } from '@/components/ide/modern-shell/types';
import type {
  WorkbenchEditorPaneProps,
} from '@/components/ide/fullscreen/WorkbenchEditorPane';
import type {
  WorkbenchPreviewPaneProps,
} from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import type { FileItem } from '@/components/ide/CommandPalette';

type EditorRef = RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

type FullscreenIDEWorkspaceBridgeProps = {
  projectId: string;
  activeFile: ActiveFileState | null;
  bridgeActiveFile: ActiveFileState | null;
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
  setLastAiApply: Dispatch<SetStateAction<(InlineApplyResult & {
    appliedAt: string;
  }) | null>>;
  emitLayoutEvent: (eventName: string) => void;
  handleEditorUndo: () => void;
  handleEditorRedo: () => void;
  handleEditorFind: () => void;
  handleEditorReplace: () => void;
  handleAIPanel: () => void;
  secondaryFile: ActiveFileState | null;
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

export default function FullscreenIDEWorkspaceBridge({
  projectId,
  activeFile,
  bridgeActiveFile,
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
  previewMode,
  onResizePanel,
  onToggleSidebar,
  onTogglePanel,
  onRunPrimaryAction,
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
  handleEditorUndo,
  handleEditorRedo,
  handleEditorFind,
  handleEditorReplace,
  handleAIPanel,
  secondaryFile,
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
  handleToggleSplitEditor,
  handleJumpToOutlineSymbol,
  handleToggleFullAccess,
  broadcastCursor,
  broadcastSelection,
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
}: FullscreenIDEWorkspaceBridgeProps) {
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
        runId: result.runId ?? 'unknown',
        rollbackToken: result.rollbackToken,
        message: result.message,
        filePath: result.filePath ?? activeFile?.path ?? '',
        appliedAt: new Date().toISOString(),
      });
    },
    [activeFile?.path, setLastAiApply]
  );

  return (
    <FullscreenIDEWorkspace
      projectId={projectId}
      activeFile={activeFile}
      bridgeActiveFile={bridgeActiveFile}
      editorRef={editorRef}
      headerExtras={
        headerCollaborators.length > 0 ? (
          <CollaboratorsBar peers={headerCollaborators} maxVisible={4} showStatusDot className="max-w-full" />
        ) : null
      }
      banner={entryNotice ? <WorkbenchEntryNotice notice={entryNotice} onDismiss={clearEntryNotice} /> : null}
      workspaceFilesLoaded={workspaceFilesLoaded}
      workspaceFiles={workspaceFiles}
      sidebarTab={sidebarTab}
      panelState={modernPanelState}
      previewMode={previewMode}
      onResizePanel={onResizePanel}
      onToggleSidebar={onToggleSidebar}
      onTogglePanel={onTogglePanel}
      onRunPrimaryAction={onRunPrimaryAction}
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
