'use client';

import { useCallback, useMemo } from 'react';

import CollaboratorsBar from '@/components/collaboration/CollaboratorsBar';
import { WorkbenchEntryNotice } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { FullscreenIDEWorkspaceBridgeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import type { FullscreenIDEWorkspaceProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspace';
import type { InlineApplyResult } from '@/components/ide/fullscreen/types';

export function useFullscreenIDEWorkspaceProps({
  chrome,
  files,
  editor,
  preview,
}: FullscreenIDEWorkspaceBridgeProps): FullscreenIDEWorkspaceProps {
  const handleSaveActiveFile = useCallback(() => {
    if (!files.activeFile) return;
    void files.writeFile(files.activeFile.path, files.activeFile.content);
  }, [files]);

  const handleFileSelect = useCallback(
    (file: { path: string; type: 'file' | 'folder' }) => {
      if (file.type !== 'file') return;
      void files.readFile(file.path, files.nextOpenTarget);
    },
    [files],
  );

  const handlePaletteOpenFile = useCallback(
    (path: string) => {
      void files.readFile(path, files.nextOpenTarget);
    },
    [files],
  );

  const handleInlineApplyResult = useCallback(
    (result: InlineApplyResult) => {
      files.setLastAiApply({
        runId: result.runId ?? 'unknown',
        rollbackToken: result.rollbackToken,
        message: result.message,
        filePath: result.filePath ?? files.activeFile?.path ?? '',
        appliedAt: new Date().toISOString(),
      });
    },
    [files],
  );

  const headerExtras = useMemo(
    () =>
      chrome.headerCollaborators.length > 0 ? (
        <CollaboratorsBar
          peers={chrome.headerCollaborators}
          maxVisible={4}
          showStatusDot
          className="max-w-full"
        />
      ) : null,
    [chrome.headerCollaborators],
  );

  return {
    projectId: chrome.projectId,
    activeFile: files.activeFile,
    bridgeActiveFile: files.bridgeActiveFile,
    editorRef: files.editorRef,
    headerExtras,
    banner: chrome.entryNotice ? (
      <WorkbenchEntryNotice notice={chrome.entryNotice} onDismiss={chrome.clearEntryNotice} />
    ) : null,
    workspaceFilesLoaded: chrome.workspaceFilesLoaded,
    workspaceFiles: chrome.workspaceFiles,
    sidebarCollaborationPeers: editor.collaborationPeers,
    sidebarTab: chrome.sidebarTab,
    panelState: chrome.modernPanelState,
    activeBottomPanel: chrome.activeBottomPanel,
    previewMode: chrome.previewMode,
    statusBarProps: chrome.statusBar,
    onResizePanel: chrome.onResizePanel,
    onToggleSidebar: chrome.onToggleSidebar,
    onTogglePanel: chrome.onTogglePanel,
    onSelectBottomPanel: chrome.onSelectBottomPanel,
    onRunPrimaryAction: chrome.onRunPrimaryAction,
    onOpenSettings: chrome.handleOpenSettings,
    onOpenCommandPalette: chrome.openCommandPalette,
    onSelectSidebarTab: chrome.handleSelectSidebarTab,
    onSelectPreviewMode: chrome.handleSelectPreviewMode,
    onToggleDiagnostics: chrome.handleToggleDiagnosticsPanel,
    onSidebarTabChange: chrome.setSidebarTab,
    onFileSelect: handleFileSelect,
    onPaletteOpenFile: handlePaletteOpenFile,
    onSaveActiveFile: handleSaveActiveFile,
    onEditorUndo: editor.onUndo,
    onEditorRedo: editor.onRedo,
    onEditorFind: editor.onFind,
    onEditorReplace: editor.onReplace,
    onAIChat: editor.onAIChat,
    emitLayoutEvent: files.emitLayoutEvent,
    writeFile: (path, content) => Promise.resolve(files.writeFile(path, content)),
    readFile: (path) => Promise.resolve(files.readFile(path)),
    editorPaneProps: {
      ...editor,
      onInlineApplyResult: handleInlineApplyResult,
      onSaveFile: files.writeFile,
    },
    previewPaneProps: preview,
  };
}
