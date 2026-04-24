'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';
import {
  BOTTOM_DOCK_ITEMS,
  BottomDockItemButton,
  handleBottomDockItemClick,
  isBottomDockItemActive,
} from './chromeDockParts';
import { BORDER_SECONDARY } from './chromeStyles';
import type { PanelState, PreviewMode, SidebarTab } from './types';

export interface BottomDockProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
}

export function BottomDock({
  panelState,
  onTogglePanel,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
}: BottomDockProps) {
  const dockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '52px',
    overflowX: 'auto',
  };

  return (
    <div style={dockStyle}>
      {BOTTOM_DOCK_ITEMS.map((item) => (
        <BottomDockItemButton
          key={item.id}
          item={item}
          active={isBottomDockItemActive(item.id, panelState, activeSidebarTab, activePreviewMode)}
          onClick={() =>
            handleBottomDockItemClick(item.id, {
              panelState,
              onTogglePanel,
              onOpenCommandPalette,
              onSelectSidebarTab,
              onSelectPreviewMode,
              onToggleDiagnostics,
            })
          }
        />
      ))}
    </div>
  );
}
