'use client';

import type * as monacoEditor from 'monaco-editor';
import type { ReactNode, RefObject } from 'react';
import useSWR from 'swr';

import { AgentsWorkspaceContainer } from '../../../web/components/agents';
import { fetchAgentFleet } from '../../../web/components/agents/window/agent-window-api';
import CommandPaletteProvider, { type FileItem } from '../CommandPalette';
import { AiUsageStatusChip } from '../../../web/components/billing/AiUsageStatusChip';
import CostMeter from '../../../web/components/cost/CostMeter';
import { EditorApplyBridgeProvider } from '../EditorApplyBridgeContext';
import { IdeWorkbenchCommandExtras } from '../IdeWorkbenchCommandExtras';
import { ModernIDEShell } from '../ModernIDEShell';
import type { AgentRunStatus } from '../modern-shell/ModernIDEShellChrome';
import type { StatusBarProps } from '../modern-shell/chromeStatusBar';
import { WorkbenchEditorPane, type WorkbenchEditorPaneProps } from './WorkbenchEditorPane';
import { WorkbenchPreviewPane, type WorkbenchPreviewPaneProps } from './WorkbenchPreviewPane';
import { WorkbenchSidebar } from './WorkbenchSidebar';
import { normalizePath } from './workbench-helpers';
import type { BottomPanelMode, PanelState } from '../modern-shell/types';
import { MultiTerminalPanel } from '../../../web/components/terminal/XTerminal';
import { TabProvider } from '../../../web/components/editor/TabBar';
import type { RemotePeer } from '../../../web/hooks/useCollaborationAwareness';

import type { ActiveFileState, PreviewMode, SidebarTab } from './types';

type SidebarFileEntry = {
  path: string;
  type: 'file' | 'folder';
};

function resolveAgentStatus(input: {
  fleet?: Awaited<ReturnType<typeof fetchAgentFleet>>;
  error?: unknown;
}): AgentRunStatus {
  if (input.error) return 'error';
  const fleet = input.fleet;
  if (!fleet) return 'idle';
  if (fleet.paused) return 'paused';
  if (fleet.members.some((member) => member.status === 'blocked')) return 'awaiting-approval';
  if (fleet.members.some((member) => member.status === 'attention')) return 'queued';
  if (fleet.members.some((member) => member.status === 'paused')) return 'paused';
  if (fleet.members.some((member) => member.status === 'ready')) return 'running';
  return 'done-pending-review';
}

export type FullscreenIDEWorkspaceProps = {
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
  const { data: agentFleet, error: agentFleetError } = useSWR(
    ['agent-fleet', projectId],
    () => fetchAgentFleet(projectId),
    { refreshInterval: 30000, revalidateOnFocus: false },
  );
  const agentStatus = resolveAgentStatus({ fleet: agentFleet, error: agentFleetError });

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
                <AiUsageStatusChip />
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
            agentStatus={agentStatus}
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
              chat: <AgentsWorkspaceContainer projectId={projectId} />,
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
