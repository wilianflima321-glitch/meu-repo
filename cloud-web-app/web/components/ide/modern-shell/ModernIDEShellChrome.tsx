'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';
import { GripVertical } from 'lucide-react';
import {
  HeaderIdentity,
  HeaderPrimaryActions,
  HeaderWorkspaceControls,
} from './chromeHeaderParts';
import {
  BORDER_PRIMARY,
  BORDER_SECONDARY,
  TEXT_TERTIARY,
} from './chromeStyles';
import type { PanelState } from './types';

export {
  BottomDock,
  MobileBottomBar,
  ModernIDELoading,
  StatusBar,
} from './chromeSecondaryBars';

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
    padding: `${tokens.spacing['2.5']} ${tokens.spacing['4']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '56px',
    gap: tokens.spacing['3'],
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
