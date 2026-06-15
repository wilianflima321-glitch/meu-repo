'use client';

import React from 'react';
import { AgentsWindow } from '@/components/agents/AgentsWindow';
import { EditorErrorBoundary, PanelErrorBoundary } from '@/components/error/ErrorBoundary';
import { ResizeHandle } from './ModernIDEShellChrome';
import { ModernIDEShellCenterStack } from './ModernIDEShellCenterStack';
import {
  ModernIDEShellPreviewColumn,
  ModernIDEShellPreviewReveal,
  ModernIDEShellSidebarColumn,
} from './ModernIDEShellSideColumns';
import { getWorkbenchRegionDefinition } from './types';
import type { BottomPanelMode, PanelState, PreviewMode, WorkbenchRegionId } from './types';

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

function getRuntimeFailureSmokeScenario() {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('aethelRuntimeFailureSmoke');
}

function regionLabel(region: WorkbenchRegionId) {
  return getWorkbenchRegionDefinition(region).label;
}

function RuntimeFailureSmokeFault({
  scenarioId,
  target,
  children,
}: {
  scenarioId: string;
  target: string;
  children: React.ReactNode;
}) {
  if (getRuntimeFailureSmokeScenario() === scenarioId) {
    throw new Error(`AETHEL_RUNTIME_FAILURE_SMOKE:${scenarioId}:${target}`);
  }

  return <>{children}</>;
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
  const safeSlots = {
    sidebar: <PanelErrorBoundary panelName={regionLabel('sidebar')}>{slots.sidebar}</PanelErrorBoundary>,
    editor: (
      <EditorErrorBoundary>
        <RuntimeFailureSmokeFault scenarioId="ide-region-crash-isolated" target="editor">
          {slots.editor}
        </RuntimeFailureSmokeFault>
      </EditorErrorBoundary>
    ),
    preview: (
      <PanelErrorBoundary panelName={previewPanelLabel}>
        <RuntimeFailureSmokeFault scenarioId="preview-render-fallback" target="preview">
          {slots.preview}
        </RuntimeFailureSmokeFault>
      </PanelErrorBoundary>
    ),
    chat: <PanelErrorBoundary panelName={AgentsWindow.name}>{slots.chat}</PanelErrorBoundary>,
    terminal: <PanelErrorBoundary panelName={regionLabel('terminal')}>{slots.terminal}</PanelErrorBoundary>,
  };

  return (
    <div ref={mainAreaRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
      {sidebarVisible && <ModernIDEShellSidebarColumn sidebar={safeSlots.sidebar} size={panelState.sidebar.size} />}

      {sidebarVisible && !isCompact && (
        <ResizeHandle
          ariaLabel="Resize sidebar"
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
          editor={safeSlots.editor}
          chat={safeSlots.chat}
          terminal={safeSlots.terminal}
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
            ariaLabel="Resize preview"
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
            preview={safeSlots.preview}
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
