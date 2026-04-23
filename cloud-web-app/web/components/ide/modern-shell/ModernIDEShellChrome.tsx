'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';
import { GripVertical } from 'lucide-react';
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
  HeaderIdentity,
  HeaderPrimaryActions,
  HeaderWorkspaceControls,
} from './chromeHeaderParts';
import {
  ACCENT_CYAN,
  BORDER_PRIMARY,
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
} from './chromeStyles';
import type { PanelState, PreviewMode, SidebarTab } from './types';

export {
  ACCENT_CYAN,
  BORDER_PRIMARY,
  BORDER_SECONDARY,
  HEADER_ACTION_BUTTON,
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_WARNING,
  SURFACE_PRIMARY,
  SURFACE_SECONDARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  chromeBarHeight,
  chromeBarPadding,
  iconButtonStyle,
} from './chromeStyles';

interface ResizeHandleProps {
  ariaLabel: string;
  orientation: 'vertical' | 'horizontal';
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAdjust: (delta: number) => void;
  valueNow: number;
  valueMin: number;
  valueMax: number;
}

export function ResizeHandle({
  ariaLabel,
  orientation,
  onMouseDown,
  onAdjust,
  valueNow,
  valueMin,
  valueMax,
}: ResizeHandleProps) {
  const isVertical = orientation === 'vertical';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 2;

    if (isVertical) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onAdjust(-step);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onAdjust(step);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onAdjust(-step);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onAdjust(step);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      tabIndex={0}
      style={{
        width: isVertical ? '10px' : '100%',
        height: isVertical ? '100%' : '10px',
        cursor: isVertical ? 'col-resize' : 'row-resize',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        outline: 'none',
        transition: `background ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
      }}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        e.currentTarget.style.background = BORDER_PRIMARY;
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = BORDER_PRIMARY;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      title={`${ariaLabel} - use setas${isVertical ? ' esquerda/direita' : ' cima/baixo'} para ajustar`}
    >
      <div
        style={{
          width: isVertical ? '2px' : '28px',
          height: isVertical ? '28px' : '2px',
          borderRadius: tokens.radius.full,
          background: BORDER_PRIMARY,
          opacity: 0.9,
        }}
      />
      <GripVertical
        size={12}
        color={TEXT_TERTIARY}
        style={{
          position: 'absolute',
          transform: isVertical ? undefined : 'rotate(90deg)',
        }}
      />
    </div>
  );
}

interface IDEHeaderProps {
  projectName: string;
  activeFileName?: string;
  panelState: PanelState;
  headerExtras?: React.ReactNode;
  onTogglePanel: (panel: keyof PanelState) => void;
  onToggleSidebar?: () => void;
  isCompact: boolean;
  onRunPrimaryAction?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
}

export function IDEHeader({
  projectName,
  activeFileName,
  panelState,
  headerExtras,
  onTogglePanel,
  onToggleSidebar,
  isCompact,
  onRunPrimaryAction,
  onOpenSettings,
  onOpenCommandPalette,
}: IDEHeaderProps) {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['3']} ${tokens.spacing['5']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '60px',
    gap: tokens.spacing['4'],
  };

  return (
    <header style={headerStyle}>
      <HeaderIdentity
        projectName={projectName}
        activeFileName={activeFileName}
        onToggleSidebar={onToggleSidebar}
      />

      {!isCompact && (
        <HeaderWorkspaceControls
          headerExtras={headerExtras}
          panelState={panelState}
          onTogglePanel={onTogglePanel}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      )}

      <HeaderPrimaryActions
        projectName={projectName}
        onRunPrimaryAction={onRunPrimaryAction}
        onOpenSettings={onOpenSettings}
      />
    </header>
  );
}

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
  projectName: string;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], minWidth: 0 }}>
        {STATUS_BAR_LEADING_ITEMS.map((item, index) => (
          <StatusMetric key={`${item.label}-${index}`} icon={item.icon} label={item.label} />
        ))}
      </div>

      {activeFileName && <ActiveFileStatus activeFileName={activeFileName} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], flexShrink: 0 }}>
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
    <nav style={barStyle}>
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
