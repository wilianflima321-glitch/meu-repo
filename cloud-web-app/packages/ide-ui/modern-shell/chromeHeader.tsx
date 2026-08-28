'use client'

import React, { useEffect } from 'react'
import {
  HeaderIdentity,
  HeaderPrimaryActions,
  HeaderWorkspaceControls,
} from './chromeHeaderParts'
import type { BottomPanelMode, PanelState } from './types'

// ─── AgentRunStatus ───────────────────────────────────────────────────────────

export type AgentRunStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'paused'
  | 'awaiting-approval'
  | 'done-pending-review'
  | 'error'

// ─── IDEHeaderProps ───────────────────────────────────────────────────────────

export interface IDEHeaderProps {
  projectName: string
  activeFileName?: string
  panelState: PanelState
  activeBottomPanel: BottomPanelMode
  headerExtras?: React.ReactNode
  onTogglePanel: (panel: keyof PanelState) => void
  onSelectBottomPanel?: (panel: BottomPanelMode) => void
  onToggleSidebar?: () => void
  isCompact: boolean
  onRunPrimaryAction?: () => void
  onOpenSettings?: () => void
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void
  onOpenExport?: () => void
  /** Ambient agent status — shows a labelled pill in the header when agents are active */
  agentStatus?: AgentRunStatus
}

// ─── AgentStatusPill ─────────────────────────────────────────────────────────

/**
 * Compact ambient status indicator for the active agent run.
 *
 * Fully migrated to Tailwind `var(--aethel-*)` tokens — no inline `style={{ }}`.
 * The animated pulse dot follows the same convention used across the codebase:
 * `animate-pulse` for queued/running, static for terminal states.
 */
function AgentStatusPill({ status }: { status: AgentRunStatus }) {
  if (status === 'idle') return null

  type StatusConfig = {
    containerClass: string
    dotClass: string
    pulse: boolean
    label: string
    ariaLabel: string
  }

  const STATUS_CONFIG: Record<Exclude<AgentRunStatus, 'idle'>, StatusConfig> = {
    queued: {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
      dotClass: 'bg-[var(--aethel-info-light)]',
      pulse: true,
      label: 'Queued',
      ariaLabel: 'Agent queued',
    },
    running: {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
      dotClass: 'bg-[var(--aethel-success-light)]',
      pulse: true,
      label: 'Agent',
      ariaLabel: 'Agent running',
    },
    paused: {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
      dotClass: 'bg-[var(--aethel-warning-light)]',
      pulse: false,
      label: 'Paused',
      ariaLabel: 'Agent paused',
    },
    'awaiting-approval': {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-warning)_36%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
      dotClass: 'bg-[var(--aethel-warning-light)]',
      pulse: false,
      label: 'Approval',
      ariaLabel: 'Agent awaiting approval',
    },
    'done-pending-review': {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
      dotClass: 'bg-[var(--aethel-info-light)]',
      pulse: false,
      label: 'Review',
      ariaLabel: 'Agent done, pending review',
    },
    error: {
      containerClass: 'border-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]',
      dotClass: 'bg-[var(--aethel-error-light)]',
      pulse: false,
      label: 'Error',
      ariaLabel: 'Agent error',
    },
  }

  const cfg = STATUS_CONFIG[status]

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap ${cfg.containerClass}`}
      aria-live="polite"
      aria-label={cfg.ariaLabel}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {cfg.label}
    </div>
  )
}

// ─── IDEHeader ────────────────────────────────────────────────────────────────

/**
 * Root IDE header chrome.
 *
 * Layout: [Identity | WorkspaceControls (center) | AgentPill + PrimaryActions]
 * Fully migrated to Tailwind `var(--aethel-*)` — no inline `style={{ }}`.
 */
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
  onOpenExport,
  agentStatus = 'idle',
}: IDEHeaderProps) {
  return (
    <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-3.5 py-1.5 backdrop-blur-sm">
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

      <div className="flex shrink-0 items-center gap-2">
        {/* Ambient agent status — minimal, non-intrusive */}
        <AgentStatusPill status={agentStatus} />
        <HeaderPrimaryActions
          projectName={projectName}
          onRunPrimaryAction={onRunPrimaryAction}
          onOpenSettings={onOpenSettings}
          onOpenExport={onOpenExport}
        />
      </div>
    </header>
  )
}
