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

export type AgentRunStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'paused'
  | 'awaiting-approval'
  | 'done-pending-review'
  | 'error';

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
  /** Ambient agent status: shows a pulse dot in the header when agents are active */
  agentStatus?: AgentRunStatus;
}

/** Small ambient indicator shown next to the Deploy/Run cluster */
function AgentStatusPill({ status }: { status: AgentRunStatus }) {
  if (status === 'idle') return null;

  const styles: Record<Exclude<AgentRunStatus, 'idle'>, React.CSSProperties> = {
    queued: {
      background: 'color-mix(in srgb, var(--aethel-info) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-info) 32%, transparent)',
      color: 'var(--aethel-info-light)',
    },
    running: {
      background: 'color-mix(in srgb, var(--aethel-success) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-success) 32%, transparent)',
      color: 'var(--aethel-success-light)',
    },
    paused: {
      background: 'color-mix(in srgb, var(--aethel-warning) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-warning) 32%, transparent)',
      color: 'var(--aethel-warning-light)',
    },
    'awaiting-approval': {
      background: 'color-mix(in srgb, var(--aethel-warning) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-warning) 36%, transparent)',
      color: 'var(--aethel-warning-light)',
    },
    'done-pending-review': {
      background: 'color-mix(in srgb, var(--aethel-info) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-info) 32%, transparent)',
      color: 'var(--aethel-info-light)',
    },
    error: {
      background: 'color-mix(in srgb, var(--aethel-error) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--aethel-error) 32%, transparent)',
      color: 'var(--aethel-error-light)',
    },
  };

  const labels: Record<Exclude<AgentRunStatus, 'idle'>, string> = {
    queued: 'Queued',
    running: 'Agent',
    paused: 'Paused',
    'awaiting-approval': 'Approval',
    'done-pending-review': 'Review',
    error: 'Error',
  };

  const ariaLabels: Record<Exclude<AgentRunStatus, 'idle'>, string> = {
    queued: 'Agent queued',
    running: 'Agent running',
    paused: 'Agent paused',
    'awaiting-approval': 'Agent awaiting approval',
    'done-pending-review': 'Agent done pending review',
    error: 'Agent error',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...styles[status],
      }}
      aria-live="polite"
      aria-label={ariaLabels[status]}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          flexShrink: 0,
          background: 'currentColor',
          animation: status === 'running' || status === 'queued' ? 'agentPulse 1.4s ease-in-out infinite' : 'none',
        }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      {labels[status]}
    </div>
  );
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
  agentStatus = 'idle',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'], flexShrink: 0 }}>
        {/* Ambient agent status: minimal, non-intrusive */}
        <AgentStatusPill status={agentStatus} />
        <HeaderPrimaryActions
          projectName={projectName}
          onRunPrimaryAction={onRunPrimaryAction}
          onOpenSettings={onOpenSettings}
        />
      </div>
    </header>
  );
}
