'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { FileItem } from '@/components/ide/CommandPalette';
import type { WorkbenchEditorPaneProps } from '@/components/ide/fullscreen/WorkbenchEditorPane';
import type { WorkbenchEntryNoticeProps } from '@/components/ide/fullscreen/WorkbenchEntryNotice';
import type { WorkbenchPreviewPaneProps } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import type {
  ActiveFileState,
  InlineApplyResult,
  PreviewMode,
  SidebarTab,
} from '@/components/ide/fullscreen/types';
import type { PanelState } from '@/components/ide/modern-shell/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

export type EditorRef = RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

export type FullscreenIDEWorkspaceBridgeChromeProps = {
  projectId: string;
  headerCollaborators: RemotePeer[];
  entryNotice: WorkbenchEntryNoticeProps['notice'] | null;
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
};

export type FullscreenIDEWorkspaceBridgeFileProps = {
  activeFile: ActiveFileState | null;
  bridgeActiveFile: ActiveFileState | null;
  editorRef: EditorRef;
  nextOpenTarget: 'primary' | 'secondary';
  readFile: (path: string, target?: 'primary' | 'secondary') => Promise<void> | void;
  writeFile: (path: string, content: string) => Promise<void> | void;
  setLastAiApply: Dispatch<SetStateAction<(InlineApplyResult & {
    appliedAt: string;
  }) | null>>;
  emitLayoutEvent: (eventName: string) => void;
};

export type FullscreenIDEWorkspaceBridgeProps = {
  chrome: FullscreenIDEWorkspaceBridgeChromeProps;
  files: FullscreenIDEWorkspaceBridgeFileProps;
  editor: Omit<
    WorkbenchEditorPaneProps,
    'onInlineApplyResult' | 'onSaveFile'
  > & {
    primaryEditorRef: EditorRef;
    secondaryEditorRef: EditorRef;
    editorRef: EditorRef;
    onUndo: () => void;
    onRedo: () => void;
    onFind: () => void;
    onReplace: () => void;
    onAIChat: () => void;
  };
  preview: WorkbenchPreviewPaneProps;
};
