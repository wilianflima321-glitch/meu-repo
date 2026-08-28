'use client'

import React, { useEffect, useState } from 'react'
import { Code2, Gamepad2, Layers, Play, Search, Settings, Sparkles, Video, Download } from 'lucide-react'

import {
  WORKSPACE_PROFILE_EVENT,
  WORKSPACE_PROFILES,
  readWorkspaceProfile,
  writeWorkspaceProfile,
  type WorkspaceProfileId,
} from '../../../web/lib/workspace/workspace-profile'
import type { BottomPanelMode, PanelState } from './types'
import { DeployTopbarAction } from './deployTopbarAction'

// ─── Types ────────────────────────────────────────────────────────────────────

type CommandPaletteMode = 'commands' | 'files'

interface HeaderIdentityProps {
  projectName: string
  activeFileName?: string
  onToggleSidebar?: () => void
}

interface HeaderWorkspaceControlsProps {
  headerExtras?: React.ReactNode
  panelState: PanelState
  activeBottomPanel: BottomPanelMode
  onTogglePanel: (panel: keyof PanelState) => void
  onSelectBottomPanel?: (panel: BottomPanelMode) => void
  onOpenCommandPalette?: (mode: CommandPaletteMode) => void
}

interface HeaderPrimaryActionsProps {
  projectName: string
  onRunPrimaryAction?: () => void
  onOpenSettings?: () => void
  onOpenExport?: () => void
}

// ─── HeaderIdentity ───────────────────────────────────────────────────────────

export function HeaderIdentity({
  projectName,
  activeFileName,
  onToggleSidebar,
}: HeaderIdentityProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] sm:min-h-[34px] sm:min-w-[34px]"
        aria-label="Toggle sidebar"
      >
        <Layers size={18} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-[var(--aethel-text-primary)]">
          {projectName}
        </span>
        {activeFileName && (
          <span className="flex min-w-0 items-center gap-1 text-xs text-[var(--aethel-text-tertiary)]">
            <Code2 size={12} aria-hidden="true" />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {activeFileName}
            </span>
          </span>
        )}
      </div>
    </div>
  )
}

// ─── WorkspaceProfileRadio ────────────────────────────────────────────────────

const PROFILE_ICONS: Record<string, any> = {
  code:     Code2,
  research: Layers,
  game:     Gamepad2,
  video:    Video,
}

function WorkspaceProfileRadio({
  activeWorkspace,
  onSwitch,
}: {
  activeWorkspace: WorkspaceProfileId
  onSwitch: (id: WorkspaceProfileId) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Workspace profile"
      className="flex items-center gap-0.5 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,black_40%,transparent)] p-0.5"
    >
      {WORKSPACE_PROFILES.map((profile) => {
        const active = activeWorkspace === profile.id
        const Icon = PROFILE_ICONS[profile.id] ?? Code2
        return (
          <button
            key={profile.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={profile.description}
            onClick={() => onSwitch(profile.id)}
            className={[
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide transition-all',
              active
                ? 'bg-[var(--aethel-interactive-active)] text-[var(--aethel-primary-light)] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'bg-transparent text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-interactive-hover)] hover:text-[var(--aethel-text-secondary)]',
            ].join(' ')}
          >
            <Icon size={13} aria-hidden="true" />
            {profile.label.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ─── CommandCenterButton ──────────────────────────────────────────────────────

function CommandCenterButton({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette: (mode: CommandPaletteMode) => void
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {/* Main search button */}
      <button
        type="button"
        onClick={() => onOpenCommandPalette('commands')}
        aria-label="Open command palette (Ctrl+K)"
        title="Ctrl+K — search everything"
        className="group flex min-w-[200px] items-center justify-between gap-3 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent)] px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[var(--aethel-primary)] hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]">
            <Sparkles size={13} aria-hidden="true" />
          </span>
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-[var(--aethel-text-secondary)]">
            Search&hellip;
          </span>
        </span>
        <kbd className="inline-flex min-h-6 items-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-2 text-xs font-medium text-[var(--aethel-text-tertiary)]">
          Ctrl+K
        </kbd>
      </button>

      {/* Separator */}
      <div className="h-5 w-px shrink-0 bg-[var(--aethel-border-secondary)]" aria-hidden="true" />

      {/* Files quick-open */}
      <button
        type="button"
        onClick={() => onOpenCommandPalette('files')}
        aria-label="Open file quick-open (Ctrl+P)"
        title="Ctrl+P — go to file"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-[var(--aethel-text-tertiary)] transition hover:bg-[var(--aethel-interactive-hover)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] whitespace-nowrap"
      >
        <Search size={13} aria-hidden="true" />
        Files
      </button>
    </div>
  )
}

// ─── HeaderWorkspaceControls ──────────────────────────────────────────────────

export function HeaderWorkspaceControls({
  headerExtras,
  onOpenCommandPalette,
}: HeaderWorkspaceControlsProps) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceProfileId>('game')

  useEffect(() => {
    setActiveWorkspace(readWorkspaceProfile())
    const sync = () => setActiveWorkspace(readWorkspaceProfile())
    window.addEventListener('storage', sync)
    window.addEventListener(WORKSPACE_PROFILE_EVENT, sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(WORKSPACE_PROFILE_EVENT, sync as EventListener)
    }
  }, [])

  const handleSwitch = (id: WorkspaceProfileId) => {
    writeWorkspaceProfile(id)
    setActiveWorkspace(id)
  }

  return (
    <div className="flex min-w-0 flex-auto items-center gap-2 overflow-x-auto [scrollbar-width:none]">
      <WorkspaceProfileRadio activeWorkspace={activeWorkspace} onSwitch={handleSwitch} />

      {headerExtras && (
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {headerExtras}
        </div>
      )}

      {onOpenCommandPalette && (
        <CommandCenterButton onOpenCommandPalette={onOpenCommandPalette} />
      )}
    </div>
  )
}

// ─── HeaderPrimaryActions ─────────────────────────────────────────────────────

export function HeaderPrimaryActions({
  projectName,
  onRunPrimaryAction,
  onOpenSettings,
  onOpenExport,
}: HeaderPrimaryActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_76%,transparent)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <DeployTopbarAction projectName={projectName} />

      <button
        type="button"
        onClick={onRunPrimaryAction}
        disabled={!onRunPrimaryAction}
        aria-label="Run primary preview action"
        className="flex min-h-[34px] items-center gap-1.5 rounded-full bg-[var(--aethel-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_2px_8px_color-mix(in_srgb,var(--aethel-primary)_45%,transparent)] transition [background-image:linear-gradient(135deg,var(--aethel-primary-light)_0%,var(--aethel-primary)_60%)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2"
      >
        <Play size={14} aria-hidden="true" />
        Run
      </button>

      <button
        type="button"
        onClick={onOpenExport}
        disabled={!onOpenExport}
        aria-label="Export geometry"
        title="Export GLB / USDZ"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] hover:text-[var(--aethel-primary)] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] sm:min-h-[34px] sm:min-w-[34px]"
      >
        <Download size={16} aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        disabled={!onOpenSettings}
        aria-label="Open settings"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] sm:min-h-[34px] sm:min-w-[34px]"
      >
        <Settings size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
