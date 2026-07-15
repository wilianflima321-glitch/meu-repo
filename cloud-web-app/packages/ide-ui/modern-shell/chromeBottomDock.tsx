'use client';

import React from 'react';
import { gradients, tokens } from '../../../web/lib/design-tokens';
import {
  BOTTOM_DOCK_ITEMS,
  BottomDockItemButton,
  handleBottomDockItemClick,
  isBottomDockItemActive,
  type BottomDockItemId,
} from './chromeDockParts';
import { BORDER_SECONDARY } from './chromeStyles';
import type { BottomPanelMode, PanelState, PreviewMode, SidebarTab } from './types';

// Separator after these items — creates logical groups matching VS Code convention:
// [Explorer, Search, Git] | [Visual 3D, Visual UI] | [Terminal, Console, Errors] | [AI]
const DOCK_GROUP_BREAKS: Set<BottomDockItemId> = new Set(['git', 'canvas', 'console'])

export interface BottomDockProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
  activeBottomPanel?: BottomPanelMode;
}

export function BottomDock({
  panelState,
  onTogglePanel,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onSelectBottomPanel,
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
  activeBottomPanel = 'chat',
}: BottomDockProps) {
  const dockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['1'],
    padding: `${tokens.spacing['1']} ${tokens.spacing['3']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '40px',
    overflowX: 'auto',
    scrollbarWidth: 'none',
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '18px',
    background: BORDER_SECONDARY,
    flexShrink: 0,
    margin: `0 ${tokens.spacing['1']}`,
    opacity: 0.6,
  };

  return (
    <div style={dockStyle} role="tablist" aria-label="IDE panels">
      {BOTTOM_DOCK_ITEMS.map((item) => (
        <React.Fragment key={item.id}>
          <BottomDockItemButton
            item={item}
            active={isBottomDockItemActive(item.id, panelState, activeSidebarTab, activePreviewMode, activeBottomPanel)}
            onClick={() =>
              handleBottomDockItemClick(item.id, {
                panelState,
                activeBottomPanel,
                onTogglePanel,
                onOpenCommandPalette,
                onSelectSidebarTab,
                onSelectPreviewMode,
                onSelectBottomPanel,
                onToggleDiagnostics,
              })
            }
          />
          {DOCK_GROUP_BREAKS.has(item.id) && <div style={separatorStyle} aria-hidden="true" />}
        </React.Fragment>
      ))}
    </div>
  );
}
