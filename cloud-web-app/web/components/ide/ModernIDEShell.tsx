'use client';

import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  BottomDock,
  BORDER_SECONDARY,
  IDEHeader,
  MobileBottomBar,
  ModernIDELoading,
  StatusBar,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
} from './modern-shell/ModernIDEShellChrome';
import { ModernIDEShellPanels } from './modern-shell/ModernIDEShellPanels';
import type { PanelState, PreviewMode, SidebarTab } from './modern-shell/types';
import { useModernIDEPanels } from './modern-shell/useModernIDEPanels';

interface ModernIDEShellProps {
  banner?: React.ReactNode;
  headerExtras?: React.ReactNode;
  children: {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
    chat: React.ReactNode;
  };
  projectName?: string;
  activeFileName?: string;
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
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
}

export type { PanelState } from './modern-shell/types';

export function ModernIDEShell({
  banner,
  headerExtras,
  children,
  projectName = 'Projeto sem nome',
  activeFileName,
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
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
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
    <div ref={containerRef} style={containerStyle}>
      <IDEHeader
        projectName={projectName}
        activeFileName={activeFileName}
        panelState={panelState}
        headerExtras={headerExtras}
        onTogglePanel={togglePanel}
        onToggleSidebar={onToggleSidebar}
        isCompact={isCompact}
        onRunPrimaryAction={onRunPrimaryAction}
        onOpenSettings={onOpenSettings}
        onOpenCommandPalette={onOpenCommandPalette}
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
        sidebarOpen={sidebarOpen}
        mainAreaRef={mainAreaRef}
        contentRowRef={contentRowRef}
        editorColumnRef={editorColumnRef}
        setPanelSize={setPanelSize}
        togglePanel={togglePanel}
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
            onToggleDiagnostics={onToggleDiagnostics}
            activeSidebarTab={activeSidebarTab}
            activePreviewMode={activePreviewMode}
          />
          <StatusBar projectName={projectName} activeFileName={activeFileName} />
        </>
      )}
    </div>
  );
}

export { ModernIDELoading };

export default ModernIDEShell;
