'use client';

import React from 'react';
import { tokens, gradients } from '@/lib/design-tokens';
import { ChevronLeft, ChevronRight, MessageSquare, Play } from 'lucide-react';
import { ResizeHandle } from './ModernIDEShellChrome';
import {
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  TEXT_SECONDARY,
  chromeBarHeight,
  chromeBarPadding,
  iconButtonStyle,
} from './chromeStyles';
import type { PanelState, PreviewMode } from './types';

interface ModernIDEShellPanelsProps {
  slots: {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
    chat: React.ReactNode;
  };
  panelState: PanelState;
  isCompact: boolean;
  activePreviewMode: PreviewMode;
  sidebarOpen: boolean;
  mainAreaRef: React.RefObject<HTMLDivElement>;
  contentRowRef: React.RefObject<HTMLDivElement>;
  editorColumnRef: React.RefObject<HTMLDivElement>;
  setPanelSize: (panel: keyof PanelState, size: number) => void;
  togglePanel: (panel: keyof PanelState) => void;
  startHorizontalResize: (panel: 'sidebar' | 'preview', event: React.MouseEvent<HTMLDivElement>) => void;
  startVerticalResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function getPreviewPanelLabel(activePreviewMode: PreviewMode) {
  switch (activePreviewMode) {
    case 'viewport3d':
      return 'Viewport';
    case 'console':
      return 'Console';
    case 'device':
      return 'Device Preview';
    default:
      return 'Preview';
  }
}

function PanelTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
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
      {icon}
      {label}
    </span>
  );
}

export function ModernIDEShellPanels({
  slots,
  panelState,
  isCompact,
  activePreviewMode,
  sidebarOpen,
  mainAreaRef,
  contentRowRef,
  editorColumnRef,
  setPanelSize,
  togglePanel,
  startHorizontalResize,
  startVerticalResize,
}: ModernIDEShellPanelsProps) {
  const previewPanelLabel = getPreviewPanelLabel(activePreviewMode);

  return (
    <div ref={mainAreaRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
      {panelState.sidebar.open && sidebarOpen && (
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
          {slots.sidebar}
        </div>
      )}

      {panelState.sidebar.open && sidebarOpen && !isCompact && (
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
            {slots.editor}
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
                  <PanelTitle icon={<MessageSquare size={14} />} label="Copiloto" />
                  <button
                    type="button"
                    onClick={() => togglePanel('chat')}
                    style={iconButtonStyle}
                    aria-label="Fechar copiloto"
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>{slots.chat}</div>
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
              <PanelTitle icon={<Play size={14} />} label={previewPanelLabel} />
              <button
                type="button"
                onClick={() => togglePanel('preview')}
                style={iconButtonStyle}
                aria-label={`Fechar ${previewPanelLabel.toLowerCase()}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>{slots.preview}</div>
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
  );
}

export default ModernIDEShellPanels;
