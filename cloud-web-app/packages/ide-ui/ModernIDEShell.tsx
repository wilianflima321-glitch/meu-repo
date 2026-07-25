'use client';

import React from 'react';
import type { Diagnostic as MonacoDiagnostic } from '../../web/components/editor/MonacoEditorPro';
import type {
  EditorCursorStatus,
  EditorPane,
  EditorSelectionStatus,
} from './fullscreen/types';
import { tokens } from '../../web/lib/design-tokens';
import type { PreviewRuntimeHealthState } from '../../web/lib/preview/runtime-manager';
import {
  BottomDock,
  BORDER_SECONDARY,
  IDEHeader,
  MobileBottomBar,
  ModernIDELoading,
  StatusBar,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
  type AgentRunStatus,
} from './modern-shell/ModernIDEShellChrome';
import { ModernIDEShellPanels } from './modern-shell/ModernIDEShellPanels';
import type {
  BottomPanelMode,
  PanelState,
  PreviewMode,
  SidebarTab,
} from './modern-shell/types';
import { useShellSourceControlTruth } from './modern-shell/useShellSourceControlTruth';
import { useModernIDEPanels } from './modern-shell/useModernIDEPanels';
// CW4 — spine adapter registration lives in `docking/WorkspaceProvider.tsx`
// (the sole `createWorkspaceStore` call site) so every dock consumer, not
// just this shell, is covered structurally. See its module doc comment.
import { WorkspaceProvider } from './docking';

interface ModernIDEShellProps {
  projectId?: string;
  banner?: React.ReactNode;
  headerExtras?: React.ReactNode;
  children: {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
    chat: React.ReactNode;
    terminal: React.ReactNode;
  };
  projectName?: string;
  activeFileName?: string;
  statusBarProps?: {
    activeFilePath?: string | null;
    activeFileLanguage?: string | null;
    activeDiagnostics?: MonacoDiagnostic[];
    panelState?: PanelState;
    activeSidebarTab?: SidebarTab;
    activePreviewMode?: PreviewMode;
    activeBottomPanel?: BottomPanelMode;
    splitEditorOpen?: boolean;
    splitActivePane?: EditorPane;
    collaborationConnected?: boolean;
    collaboratorCount?: number;
    runtimeHealth?: PreviewRuntimeHealthState | null;
    runtimeReadinessStatus?: string | null;
    cursorStatus?: EditorCursorStatus | null;
    selectionStatus?: EditorSelectionStatus | null;
  };
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  panelState?: PanelState;
  onTogglePanel?: (panel: keyof PanelState) => void;
  onResizePanel?: (panel: keyof PanelState, size: number) => void;
  onRunPrimaryAction?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  onToggleDiagnostics?: () => void;
  agentStatus?: AgentRunStatus;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
  activeBottomPanel?: BottomPanelMode;
}

export type { PanelState } from './modern-shell/types';

export function ModernIDEShell({
  projectId,
  banner,
  headerExtras,
  children,
  projectName = 'Untitled project',
  activeFileName,
  statusBarProps,
  onToggleSidebar,
  sidebarOpen = true,
  panelState: controlledPanelState,
  onTogglePanel: controlledTogglePanel,
  onResizePanel: controlledResizePanel,
  onRunPrimaryAction,
  onOpenSettings,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onSelectBottomPanel,
  onToggleDiagnostics,
  agentStatus = 'idle',
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
  activeBottomPanel = 'chat',
}: ModernIDEShellProps) {
  const {
    panelState,
    isCompact,
    containerRef,
    mainAreaRef,
    contentRowRef,
    editorColumnRef,
    setPanelSize,
    togglePanel,
    startHorizontalResize,
    startVerticalResize,
  } = useModernIDEPanels({
    sidebarOpen,
    controlledPanelState,
    controlledTogglePanel,
    controlledResizePanel,
  });
  const sourceControl = useShellSourceControlTruth({
    projectId,
    activeFilePath: statusBarProps?.activeFilePath ?? null,
  });

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    background: SURFACE_PRIMARY,
    color: TEXT_PRIMARY,
    fontFamily: tokens.typography.fontFamily.sans,
    overflow: 'hidden',
  };

  return (
    <WorkspaceProvider storageKey="aethel.ide.dock.v1">
    <div ref={containerRef} style={containerStyle} data-modern-ide-shell="true">
      <IDEHeader
        projectName={projectName}
        activeFileName={activeFileName}
        panelState={panelState}
        activeBottomPanel={activeBottomPanel}
        headerExtras={headerExtras}
        onTogglePanel={togglePanel}
        onSelectBottomPanel={onSelectBottomPanel}
        onToggleSidebar={onToggleSidebar}
        isCompact={isCompact}
        onRunPrimaryAction={onRunPrimaryAction}
        onOpenSettings={onOpenSettings}
        onOpenCommandPalette={onOpenCommandPalette}
        agentStatus={agentStatus}
      />

      {banner ? (
        <div
          style={{
            borderBottom: `1px solid ${BORDER_SECONDARY}`,
            background: 'color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)',
            flexShrink: 0,
          }}
        >
          {banner}
        </div>
      ) : null}

      <ModernIDEShellPanels
        slots={children}
        panelState={panelState}
        isCompact={isCompact}
        activePreviewMode={activePreviewMode}
        activeBottomPanel={activeBottomPanel}
        sidebarOpen={sidebarOpen}
        mainAreaRef={mainAreaRef}
        contentRowRef={contentRowRef}
        editorColumnRef={editorColumnRef}
        setPanelSize={setPanelSize}
        togglePanel={togglePanel}
        onSelectBottomPanel={onSelectBottomPanel}
        startHorizontalResize={startHorizontalResize}
        startVerticalResize={startVerticalResize}
      />

      {isCompact ? <MobileBottomBar panelState={panelState} onTogglePanel={togglePanel} /> : null}

      {!isCompact && (
        <>
          <BottomDock
            panelState={panelState}
            onTogglePanel={togglePanel}
            onOpenCommandPalette={onOpenCommandPalette}
            onSelectSidebarTab={onSelectSidebarTab}
            onSelectPreviewMode={onSelectPreviewMode}
            onSelectBottomPanel={onSelectBottomPanel}
            onToggleDiagnostics={onToggleDiagnostics}
            activeSidebarTab={activeSidebarTab}
            activePreviewMode={activePreviewMode}
            activeBottomPanel={activeBottomPanel}
          />
          <StatusBar
            activeFileName={activeFileName}
            sourceControl={sourceControl}
            {...statusBarProps}
          />
        </>
      )}
    </div>
    </WorkspaceProvider>
  );
}

export { ModernIDELoading };

export default ModernIDEShell;
