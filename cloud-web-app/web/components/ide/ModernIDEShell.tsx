'use client';

import React from 'react';
import { tokens, gradients } from '@/lib/design-tokens';
import { ChevronLeft, ChevronRight, MessageSquare, Play } from 'lucide-react';
import {
  BottomDock,
  BORDER_SECONDARY,
  chromeBarHeight,
  chromeBarPadding,
  IDEHeader,
  iconButtonStyle,
  MobileBottomBar,
  ModernIDELoading,
  ResizeHandle,
  StatusBar,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './modern-shell/ModernIDEShellChrome';
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

  const previewPanelLabel =
    activePreviewMode === 'viewport3d'
      ? 'Viewport'
      : activePreviewMode === 'console'
        ? 'Console'
        : activePreviewMode === 'device'
          ? 'Device Preview'
          : 'Preview';

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

      <div ref={mainAreaRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        {panelState.sidebar.open && (
          <div
            style={{
              width: `${panelState.sidebar.size}%`,
              minWidth: '200px',
              maxWidth: '400px',
              background: gradients.glassSubtle,
              borderRight: `1px solid ${BORDER_SECONDARY}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {children.sidebar}
          </div>
        )}

        {panelState.sidebar.open && !isCompact && (
          <ResizeHandle
            ariaLabel="Redimensionar barra lateral"
            orientation="vertical"
            onMouseDown={(event) => startHorizontalResize('sidebar', event)}
            onAdjust={(delta) => setPanelSize('sidebar', panelState.sidebar.size + delta)}
            valueNow={panelState.sidebar.size}
            valueMin={16}
            valueMax={32}
          />
        )}

        <div ref={contentRowRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div
            ref={editorColumnRef}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              minWidth: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                background: SURFACE_PRIMARY,
                minHeight: 0,
              }}
            >
              {children.editor}
            </div>

            {panelState.chat.open && !isCompact && (
              <>
                <ResizeHandle
                  ariaLabel="Redimensionar copiloto"
                  orientation="horizontal"
                  onMouseDown={startVerticalResize}
                  onAdjust={(delta) => setPanelSize('chat', panelState.chat.size + delta)}
                  valueNow={panelState.chat.size}
                  valueMin={18}
                  valueMax={45}
                />
                <div
                  style={{
                    height: `${panelState.chat.size}%`,
                    minHeight: '160px',
                    maxHeight: '55%',
                    borderTop: `1px solid ${BORDER_SECONDARY}`,
                    background: gradients.glassMedium,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: chromeBarPadding,
                      minHeight: chromeBarHeight,
                      borderBottom: `1px solid ${BORDER_SECONDARY}`,
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: tokens.typography.fontSize.xs,
                        fontWeight: tokens.typography.fontWeight.semibold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: TEXT_SECONDARY,
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing['2'],
                      }}
                    >
                      <MessageSquare size={14} />
                      Copiloto
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePanel('chat')}
                      style={iconButtonStyle}
                      aria-label="Fechar copiloto"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {children.chat}
                  </div>
                </div>
              </>
            )}
          </div>

          {panelState.preview.open && !isCompact && (
            <ResizeHandle
              ariaLabel="Redimensionar previa"
              orientation="vertical"
              onMouseDown={(event) => startHorizontalResize('preview', event)}
              onAdjust={(delta) => setPanelSize('preview', panelState.preview.size + delta)}
              valueNow={panelState.preview.size}
              valueMin={25}
              valueMax={55}
            />
          )}

          {panelState.preview.open && !isCompact && (
            <div
              style={{
                width: `${panelState.preview.size}%`,
                minWidth: '250px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: SURFACE_SECONDARY,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: chromeBarPadding,
                  minHeight: chromeBarHeight,
                  borderBottom: `1px solid ${BORDER_SECONDARY}`,
                  background: gradients.glassSubtle,
                }}
              >
                <span
                  style={{
                    fontSize: tokens.typography.fontSize.xs,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: TEXT_SECONDARY,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing['2'],
                  }}
                >
                  <Play size={14} />
                  {previewPanelLabel}
                </span>
                <button
                  type="button"
                  onClick={() => togglePanel('preview')}
                  style={iconButtonStyle}
                  aria-label={`Fechar ${previewPanelLabel.toLowerCase()}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {children.preview}
              </div>
            </div>
          )}
        </div>

        {!panelState.preview.open && !isCompact && (
          <button
            type="button"
            onClick={() => togglePanel('preview')}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: `${tokens.spacing['2']} ${tokens.spacing['1.5']}`,
              background: gradients.glassMedium,
              border: `1px solid ${BORDER_SECONDARY}`,
              borderRight: 'none',
              borderRadius: `${tokens.radius.lg} 0 0 ${tokens.radius.lg}`,
              color: TEXT_SECONDARY,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              zIndex: 10,
            }}
            aria-label={`Abrir ${previewPanelLabel.toLowerCase()}`}
          >
            <ChevronLeft size={16} />
            <Play size={14} />
            {previewPanelLabel}
          </button>
        )}
      </div>

      {isCompact && <MobileBottomBar panelState={panelState} onTogglePanel={togglePanel} />}

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
