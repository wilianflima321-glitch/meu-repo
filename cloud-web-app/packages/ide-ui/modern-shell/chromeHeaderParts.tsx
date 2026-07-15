import { tokens } from '../../../web/lib/design-tokens';
import {
  Code2,
  Layout,
  Play,
  Search,
  Settings,
  Sparkles,
  Layers,
  Gamepad2,
  Video
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import {
  WORKSPACE_PROFILE_EVENT,
  WORKSPACE_PROFILES,
  readWorkspaceProfile,
  writeWorkspaceProfile,
  type WorkspaceProfileId,
} from '../../../web/lib/workspace/workspace-profile';
import type { BottomPanelMode, PanelState } from './types';
import {
  BORDER_SECONDARY,
  HEADER_ACTION_BUTTON,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  getPrimaryActionButtonStyle,
  iconButtonStyle,
} from './chromeStyles';
import { DeployTopbarAction } from './deployTopbarAction';

type CommandPaletteMode = 'commands' | 'files';

const floatingClusterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['1.5'],
  padding: tokens.spacing['1'],
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.full,
  background: 'color-mix(in srgb, var(--aethel-surface-secondary) 76%, transparent)',
  boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 4%, transparent)',
  flexShrink: 0,
};

const commandCenterButtonStyle: React.CSSProperties = {
  display: 'flex',
  minWidth: '220px',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: tokens.spacing['3'],
  minHeight: '38px',
  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.full,
  background: 'color-mix(in srgb, var(--aethel-surface-secondary) 64%, transparent)',
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 color-mix(in srgb, white 4%, transparent)',
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

const commandCenterMetaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['2'],
  minWidth: 0,
  flex: '1 1 auto',
};

const commandCenterHintStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '24px',
  padding: `0 ${tokens.spacing['2']}`,
  borderRadius: tokens.radius.full,
  border: `1px solid ${BORDER_SECONDARY}`,
  background: 'color-mix(in srgb, var(--aethel-surface-primary) 48%, transparent)',
  color: TEXT_TERTIARY,
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.medium,
  whiteSpace: 'nowrap',
};

interface HeaderIdentityProps {
  projectName: string;
  activeFileName?: string;
  onToggleSidebar?: () => void;
}

export function HeaderIdentity({
  projectName,
  activeFileName,
  onToggleSidebar,
}: HeaderIdentityProps) {
  return (
    <div
      style={{
        display: 'flex',
        minWidth: 0,
        flex: '1 1 0',
        alignItems: 'center',
        gap: tokens.spacing['3'],
      }}
    >
      <button
        type="button"
        onClick={onToggleSidebar}
        className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px]"
        style={{
          ...iconButtonStyle,
          color: TEXT_SECONDARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${BORDER_SECONDARY}`,
          background:
            'color-mix(in srgb, var(--aethel-surface-secondary) 58%, transparent)',
        }}
        aria-label="Toggle sidebar"
      >
        <Layout size={18} />
      </button>

      <div
        style={{
          display: 'flex',
          minWidth: 0,
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <span
          style={{
            fontSize: tokens.typography.fontSize.sm,
            fontWeight: tokens.typography.fontWeight.semibold,
            color: TEXT_PRIMARY,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {projectName}
        </span>
        {activeFileName ? (
          <span
            style={{
              fontSize: tokens.typography.fontSize.xs,
              color: TEXT_TERTIARY,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['1'],
              minWidth: 0,
            }}
          >
            <Code2 size={12} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeFileName}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface HeaderWorkspaceControlsProps {
  headerExtras?: React.ReactNode;
  panelState: PanelState;
  activeBottomPanel: BottomPanelMode;
  onTogglePanel: (panel: keyof PanelState) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  onOpenCommandPalette?: (mode: CommandPaletteMode) => void;
}

export function HeaderWorkspaceControls({
  headerExtras,
  onOpenCommandPalette,
}: HeaderWorkspaceControlsProps) {
  // Block 7A.4 — real Code / Research / Game profiles (viewport pause via frameloop bridge).
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

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        minWidth: 0,
        flex: '0 1 auto',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* Contextual Workspaces (Zen Bar) — Code pauses 3D frameloop */}
      <div
        role="radiogroup"
        aria-label="Workspace profile"
        style={{
        display: 'flex',
        background: 'color-mix(in srgb, black 40%, transparent)',
        borderRadius: tokens.radius.full,
        border: `1px solid ${BORDER_SECONDARY}`,
        padding: '2px',
        gap: '2px'
      }}>
        {WORKSPACE_PROFILES.map((profile) => {
          const active = activeWorkspace === profile.id
          const Icon = profile.id === 'code' ? Code2 : profile.id === 'research' ? Layers : Gamepad2
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={profile.description}
              onClick={() => {
                writeWorkspaceProfile(profile.id)
                setActiveWorkspace(profile.id)
              }}
              style={{
                ...iconButtonStyle,
                borderRadius: tokens.radius.full,
                background: active ? 'var(--aethel-interactive-active)' : 'transparent',
                color: active ? 'var(--aethel-primary-light)' : TEXT_TERTIARY,
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: active ? 700 : 500,
                display: 'flex',
                gap: '5px',
                letterSpacing: '0.04em',
                transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
                boxShadow: active ? 'inset 0 1px 0 color-mix(in srgb, white 8%, transparent)' : 'none',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.background = 'var(--aethel-interactive-hover)'
                if (!active) e.currentTarget.style.color = TEXT_SECONDARY
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.background = 'transparent'
                if (!active) e.currentTarget.style.color = TEXT_TERTIARY
              }}
            >
              <Icon size={13} /> {profile.label.toUpperCase()}
            </button>
          )
        })}

      </div>

      {headerExtras ? <div style={floatingClusterStyle}>{headerExtras}</div> : null}

      {onOpenCommandPalette ? (
        <CommandCenterButton onOpenCommandPalette={onOpenCommandPalette} />
      ) : null}
    </div>
  );
}

interface HeaderPrimaryActionsProps {
  projectName: string;
  onRunPrimaryAction?: () => void;
  onOpenSettings?: () => void;
}

export function HeaderPrimaryActions({
  projectName,
  onRunPrimaryAction,
  onOpenSettings,
}: HeaderPrimaryActionsProps) {
  return (
    <div
      style={{
        ...floatingClusterStyle,
        gap: tokens.spacing['2'],
      }}
    >
      <DeployTopbarAction projectName={projectName} />
      <button
        type="button"
        onClick={onRunPrimaryAction}
        disabled={!onRunPrimaryAction}
        style={getPrimaryActionButtonStyle(Boolean(onRunPrimaryAction))}
        aria-label="Run primary preview action"
      >
        <Play size={14} />
        Run
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        disabled={!onOpenSettings}
        className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px]"
        style={{
          ...iconButtonStyle,
          color: TEXT_SECONDARY,
          opacity: onOpenSettings ? 1 : 0.65,
          border: `1px solid ${BORDER_SECONDARY}`,
          background:
            'color-mix(in srgb, var(--aethel-surface-secondary) 58%, transparent)',
        }}
        aria-label="Open settings"
      >
        <Settings size={18} />
      </button>
    </div>
  );
}

function CommandCenterButton({
  onOpenCommandPalette,
}: {
  onOpenCommandPalette: (mode: CommandPaletteMode) => void;
}) {
  return (
    <div style={floatingClusterStyle}>
      <button
        type="button"
        onClick={() => onOpenCommandPalette('commands')}
        aria-label="Open command center"
        title="Ctrl+K — search everything"
        style={commandCenterButtonStyle}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--aethel-primary)'
          e.currentTarget.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--aethel-primary) 28%, transparent)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = BORDER_SECONDARY
          e.currentTarget.style.boxShadow = 'inset 0 1px 0 color-mix(in srgb, white 4%, transparent)'
        }}
      >
        <span style={commandCenterMetaStyle}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: tokens.radius.full,
              border: `1px solid ${BORDER_SECONDARY}`,
              background:
                'color-mix(in srgb, var(--aethel-primary) 12%, transparent)',
              color: 'var(--aethel-primary-light)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={13} />
          </span>
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: tokens.typography.fontSize.xs,
              fontWeight: tokens.typography.fontWeight.medium,
              color: TEXT_SECONDARY,
            }}
          >
            Search…
          </span>
        </span>
        <span style={commandCenterHintStyle}>Ctrl+K</span>
      </button>

      {/* Divider */}
      <div style={{ width: '1px', height: '20px', background: BORDER_SECONDARY, flexShrink: 0 }} aria-hidden="true" />

      <button
        type="button"
        onClick={() => onOpenCommandPalette('files')}
        style={{
          ...HEADER_ACTION_BUTTON,
          minHeight: '36px',
          padding: `${tokens.spacing['1.5']} ${tokens.spacing['2.5']}`,
          borderRadius: tokens.radius.full,
          whiteSpace: 'nowrap',
          border: 'none',
          background: 'transparent',
        }}
        aria-label="Open file quick open"
        title="Ctrl+P — go to file"
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--aethel-interactive-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Search size={13} />
        <span style={{ fontSize: tokens.typography.fontSize.xs, color: TEXT_TERTIARY }}>Files</span>
      </button>
    </div>
  );
}


