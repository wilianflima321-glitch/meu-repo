'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';
import {
  HeaderIdentity,
  HeaderPrimaryActions,
  HeaderWorkspaceControls,
} from './chromeHeaderParts';
import { BORDER_SECONDARY } from './chromeStyles';
import type { BottomPanelMode, PanelState } from './types';

export interface IDEHeaderProps {
  projectName: string;
  activeFileName?: string;
  panelState: PanelState;
  activeBottomPanel: BottomPanelMode;
  headerExtras?: React.ReactNode;
  onTogglePanel: (panel: keyof PanelState) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
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
  activeBottomPanel,
  headerExtras,
  onTogglePanel,
  onSelectBottomPanel,
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
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['3.5']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '48px',
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
          activeBottomPanel={activeBottomPanel}
          onTogglePanel={onTogglePanel}
          onSelectBottomPanel={onSelectBottomPanel}
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
