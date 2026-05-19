'use client';

import type * as monacoEditor from 'monaco-editor';
import type { ReactNode, RefObject } from 'react';

import AIChatPanelContainer from '@/components/ide/AIChatPanelContainer';
import CommandPaletteProvider, { type FileItem } from '@/components/ide/CommandPalette';
import CostMeter from '@/components/cost/CostMeter';
import { EditorApplyBridgeProvider } from '@/components/ide/EditorApplyBridgeContext';
import { IdeWorkbenchCommandExtras } from '@/components/ide/IdeWorkbenchCommandExtras';
import { ModernIDEShell } from '@/components/ide/ModernIDEShell';
import type { StatusBarProps } from '@/components/ide/modern-shell/chromeStatusBar';
import { WorkbenchEditorPane, type WorkbenchEditorPaneProps } from '@/components/ide/fullscreen/WorkbenchEditorPane';
import { WorkbenchPreviewPane, type WorkbenchPreviewPaneProps } from '@/components/ide/fullscreen/WorkbenchPreviewPane';
import { WorkbenchSidebar } from '@/components/ide/fullscreen/WorkbenchSidebar';
import { normalizePath } from '@/components/ide/fullscreen/workbench-helpers';
import type { BottomPanelMode, PanelState } from '@/components/ide/modern-shell/types';
import { MultiTerminalPanel } from '@/components/terminal/XTerminal';
import { TabProvider } from '@/components/editor/TabBar';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

import type { ActiveFileState, PreviewMode, SidebarTab } from '@/components/ide/fullscreen/types';

type SidebarFileEntry = {
  path: string;
  type: 'file' | 'folder';
};

type FullscreenIDEWorkspaceProps = {
  projectId: string;
  activeFile: ActiveFileState | null;
  bridgeActiveFile: ActiveFileState | null;
  editorRef: RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  headerExtras?: ReactNode;
  banner?: ReactNode;
  workspaceFilesLoaded: boolean;
  workspaceFiles: FileItem[];
  sidebarCollaborationPeers: RemotePeer[];
  sidebarTab: SidebarTab;
  panelState: PanelState;
  activeBottomPanel: BottomPanelMode;
  previewMode: PreviewMode;
  statusBarProps: StatusBarProps;
  onResizePanel: (panel: keyof PanelState, size: number) => void;
  onToggleSidebar: () => void;
  onTogglePanel: (panel: keyof PanelState) => void;
  onSelectBottomPanel: (panel: BottomPanelMode) => void;
  onRunPrimaryAction: () => void;
  onOpenSettings: () => void;
  onOpenCommandPalette: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab: (tab: SidebarTab) => void;
  onSelectPreviewMode: (mode: PreviewMode) => void;
  onToggleDiagnostics: () => void;
  onSidebarTabChange: (tab: SidebarTab) => void;
  onFileSelect: (file: SidebarFileEntry) => void;
  onPaletteOpenFile: (path: string) => void;
  onSaveActiveFile: () => void;
  onEditorUndo: () => void;
  onEditorRedo: () => void;
  onEditorFind: () => void;
  onEditorReplace: () => void;
  onAIChat: () => void;
  emitLayoutEvent: (eventName: string) => void;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<void>;
  editorPaneProps: WorkbenchEditorPaneProps;
  previewPaneProps: WorkbenchPreviewPaneProps;
};

export function FullscreenIDEWorkspace({
  projectId,
  activeFile,
  bridgeActiveFile,
  editorRef,
  headerExtras,
  banner,
  workspaceFilesLoaded,
  workspaceFiles,
  sidebarCollaborationPeers,
  sidebarTab,
  panelState,
  activeBottomPanel,
  previewMode,
  statusBarProps,
  onResizePanel,
  onToggleSidebar,
  onTogglePanel,
  onSelectBottomPanel,
  onRunPrimaryAction,
  onOpenSettings,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onToggleDiagnostics,
  onSidebarTabChange,
  onFileSelect,
  onPaletteOpenFile,
  onSaveActiveFile,
  onEditorUndo,
  onEditorRedo,
  onEditorFind,
  onEditorReplace,
  onAIChat,
  emitLayoutEvent,
  writeFile,
  readFile,
  editorPaneProps,
  previewPaneProps,
}: FullscreenIDEWorkspaceProps) {
  return (
    <CommandPaletteProvider
      onOpenFile={onPaletteOpenFile}
      onOpenFileDialog={() => onOpenCommandPalette('files')}
      onSaveFile={onSaveActiveFile}
      onUndo={onEditorUndo}
      onRedo={onEditorRedo}
      onFind={onEditorFind}
      onReplace={onEditorReplace}
      onOpenSettings={onOpenSettings}
      onToggleSidebar={() => emitLayoutEvent('aethel.layout.toggleSidebar')}
      onToggleTerminal={() => emitLayoutEvent('aethel.layout.toggleTerminal')}
      onAIChat={onAIChat}
      files={workspaceFilesLoaded ? workspaceFiles : []}
    >
      <IdeWorkbenchCommandExtras />
      <TabProvider>
        <EditorApplyBridgeProvider
          editorRef={editorRef}
          activeFilePath={bridgeActiveFile?.path ?? null}
          activeFileContent={bridgeActiveFile?.content ?? ''}
          normalizePath={normalizePath}
          writeFile={writeFile}
          readFile={readFile}
        >
          <ModernIDEShell
            projectId={projectId}
            projectName={`Project ${projectId}`}
            activeFileName={activeFile?.path}
            statusBarProps={statusBarProps}
            headerExtras={(
              <>
                <CostMeter projectId={projectId} />
                {headerExtras}
              </>
            )}
            banner={banner}
            panelState={panelState}
            activeBottomPanel={activeBottomPanel}
            onResizePanel={onResizePanel}
            onToggleSidebar={onToggleSidebar}
            onTogglePanel={onTogglePanel}
            onRunPrimaryAction={onRunPrimaryAction}
            onOpenSettings={onOpenSettings}
            onOpenCommandPalette={onOpenCommandPalette}
            onSelectSidebarTab={onSelectSidebarTab}
            onSelectPreviewMode={onSelectPreviewMode}
            onSelectBottomPanel={onSelectBottomPanel}
            onToggleDiagnostics={onToggleDiagnostics}
            activeSidebarTab={sidebarTab}
            activePreviewMode={previewMode}
          >
            {{
              sidebar: (
                <WorkbenchSidebar
                  sidebarTab={sidebarTab}
                  collaborationPeers={sidebarCollaborationPeers}
                  onSidebarTabChange={onSidebarTabChange}
                  onFileSelect={onFileSelect}
                />
              ),
              chat: <AIChatPanelContainer />,
              terminal: <MultiTerminalPanel className="h-full" />,
              editor: <WorkbenchEditorPane {...editorPaneProps} />,
              preview: <WorkbenchPreviewPane {...previewPaneProps} />,
            }}
          </ModernIDEShell>
        </EditorApplyBridgeProvider>
      </TabProvider>
    </CommandPaletteProvider>
  );
}
