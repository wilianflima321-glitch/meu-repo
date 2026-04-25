'use client';

import React from 'react';
import { ResizeHandle } from './ModernIDEShellChrome';
import { ModernIDEShellCenterStack } from './ModernIDEShellCenterStack';
import {
  ModernIDEShellPreviewColumn,
  ModernIDEShellPreviewReveal,
  ModernIDEShellSidebarColumn,
} from './ModernIDEShellSideColumns';
import type { BottomPanelMode, PanelState, PreviewMode } from './types';

interface ModernIDEShellPanelsProps {
  slots: {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
    chat: React.ReactNode;
    terminal: React.ReactNode;
  };
  panelState: PanelState;
  isCompact: boolean;
  activePreviewMode: PreviewMode;
  activeBottomPanel: BottomPanelMode;
  sidebarOpen: boolean;
  mainAreaRef: React.RefObject<HTMLDivElement>;
  contentRowRef: React.RefObject<HTMLDivElement>;
  editorColumnRef: React.RefObject<HTMLDivElement>;
  setPanelSize: (panel: keyof PanelState, size: number) => void;
  togglePanel: (panel: keyof PanelState) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  startHorizontalResize: (panel: 'sidebar' | 'preview', event: React.MouseEvent<HTMLDivElement>) => void;
  startVerticalResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function getPreviewPanelLabel(activePreviewMode: PreviewMode) {
  switch (activePreviewMode) {
    case 'viewport3d':
      return 'Visual (3D)';
    case 'canvas':
      return 'Visual (UI)';
    case 'console':
      return 'Console';
    case 'device':
      return 'Devices';
    default:
      return 'App Preview';
  }
}

export function ModernIDEShellPanels({
  slots,
  panelState,
  isCompact,
  activePreviewMode,
  activeBottomPanel,
  sidebarOpen,
  mainAreaRef,
  contentRowRef,
  editorColumnRef,
  setPanelSize,
  togglePanel,
  onSelectBottomPanel,
  startHorizontalResize,
  startVerticalResize,
}: ModernIDEShellPanelsProps) {
  const previewPanelLabel = getPreviewPanelLabel(activePreviewMode);
  const sidebarVisible = panelState.sidebar.open && sidebarOpen;
  const previewVisible = panelState.preview.open && !isCompact;

  return (
    <div ref={mainAreaRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
      {sidebarVisible && <ModernIDEShellSidebarColumn sidebar={slots.sidebar} size={panelState.sidebar.size} />}

      {sidebarVisible && !isCompact && (
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
        <ModernIDEShellCenterStack
          editor={slots.editor}
          chat={slots.chat}
          terminal={slots.terminal}
          chatOpen={panelState.chat.open}
          chatSize={panelState.chat.size}
          activeBottomPanel={activeBottomPanel}
          isCompact={isCompact}
          editorColumnRef={editorColumnRef}
          setChatSize={(size) => setPanelSize('chat', size)}
          toggleChat={() => togglePanel('chat')}
          onSelectBottomPanel={onSelectBottomPanel}
          startVerticalResize={startVerticalResize}
        />

        {previewVisible && (
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

        {previewVisible && (
          <ModernIDEShellPreviewColumn
            preview={slots.preview}
            size={panelState.preview.size}
            previewPanelLabel={previewPanelLabel}
            onClose={() => togglePanel('preview')}
          />
        )}
      </div>

      {!previewVisible && !isCompact && (
        <ModernIDEShellPreviewReveal
          previewPanelLabel={previewPanelLabel}
          onOpen={() => togglePanel('preview')}
        />
      )}
    </div>
  );
}

export default ModernIDEShellPanels;
