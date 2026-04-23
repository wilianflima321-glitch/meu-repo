'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';

import {
  ActiveFileStatus,
  BOTTOM_DOCK_ITEMS,
  BottomDockItemButton,
  MOBILE_BOTTOM_BAR_ITEMS,
  MobileBottomBarItemButton,
  STATUS_BAR_LEADING_ITEMS,
  STATUS_BAR_TRAILING_ITEMS,
  StatusMetric,
  handleBottomDockItemClick,
  isBottomDockItemActive,
} from './chromeDockParts';
import {
  ACCENT_CYAN,
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  TEXT_SECONDARY,
} from './chromeStyles';
import type { PanelState, PreviewMode, SidebarTab } from './types';

const statusMetricGroupStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['4'],
};

interface BottomDockProps {
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

interface StatusBarProps {
  activeFileName?: string;
}

export function StatusBar({ activeFileName }: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['4']}`,
    background: SURFACE_SECONDARY,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '28px',
    fontSize: tokens.typography.fontSize.xs,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  return (
    <div style={statusBarStyle}>
      <div style={{ ...statusMetricGroupStyle, minWidth: 0 }}>
        {STATUS_BAR_LEADING_ITEMS.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>

      {activeFileName && <ActiveFileStatus activeFileName={activeFileName} />}

      <div style={{ ...statusMetricGroupStyle, flexShrink: 0 }}>
        {STATUS_BAR_TRAILING_ITEMS.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}

interface MobileBottomBarProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

export function MobileBottomBar({
  panelState,
  onTogglePanel,
}: MobileBottomBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `${tokens.spacing['2']} ${tokens.spacing['2']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '60px',
    gap: tokens.spacing['1'],
  };

  return (
    <nav style={barStyle} aria-label="Mobile IDE controls">
      {MOBILE_BOTTOM_BAR_ITEMS.map((item) => (
        <MobileBottomBarItemButton
          key={item.id}
          item={item}
          active={panelState[item.id].open}
          onClick={() => onTogglePanel(item.id)}
        />
      ))}
    </nav>
  );
}

export function ModernIDELoading() {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: SURFACE_PRIMARY,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: `3px solid ${BORDER_SECONDARY}`,
    borderTopColor: ACCENT_CYAN,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <span style={{ fontSize: tokens.typography.fontSize.sm }}>
        Carregando IDE...
      </span>
    </div>
  );
}
