'use client';

import React from 'react';
import { gradients, tokens } from '@/lib/design-tokens';
import {
  HeaderIdentity,
  HeaderPrimaryActions,
  HeaderWorkspaceControls,
} from './chromeHeaderParts';
import { BORDER_SECONDARY } from './chromeStyles';
import type { PanelState } from './types';

export interface IDEHeaderProps {
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
