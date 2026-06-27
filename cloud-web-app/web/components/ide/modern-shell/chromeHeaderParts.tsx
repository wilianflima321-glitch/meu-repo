import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  Code2,
  Layout,
  Play,
  Search,
  Settings,
  Sparkles,
  Layers,
  Music,
  Video
} from 'lucide-react';
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
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
  // Mock state for previewing Wave 12.0 contexts
  const activeWorkspace: string = 'CODE';

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
      {/* Contextual Workspaces (Zen Bar) */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: tokens.radius.full,
        border: `1px solid ${BORDER_SECONDARY}`,
        padding: '2px',
        gap: '2px'
      }}>
        <button style={{
          ...iconButtonStyle,
          borderRadius: tokens.radius.full,
          background: activeWorkspace === 'CODE' ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: activeWorkspace === 'CODE' ? TEXT_PRIMARY : TEXT_TERTIARY,
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          gap: '6px'
        }}>
          <Code2 size={14} /> CODE
        </button>
        <button style={{
          ...iconButtonStyle,
          borderRadius: tokens.radius.full,
          background: activeWorkspace === 'SCENE' ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: activeWorkspace === 'SCENE' ? TEXT_PRIMARY : TEXT_TERTIARY,
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          gap: '6px'
        }}>
          <Layers size={14} /> SCENE
        </button>
        <button style={{
          ...iconButtonStyle,
          borderRadius: tokens.radius.full,
          background: activeWorkspace === 'AUDIO' ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: activeWorkspace === 'AUDIO' ? TEXT_PRIMARY : TEXT_TERTIARY,
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          gap: '6px'
        }}>
          <Music size={14} /> AUDIO
        </button>
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
        title="Cmd+K"
        style={commandCenterButtonStyle}
      >
        <span style={commandCenterMetaStyle}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: tokens.radius.full,
              border: `1px solid ${BORDER_SECONDARY}`,
              background:
                'color-mix(in srgb, var(--aethel-primary) 14%, transparent)',
              color: 'var(--aethel-primary-light)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={14} />
          </span>
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: TEXT_PRIMARY,
            }}
          >
            Command Center
          </span>
        </span>
        <span style={commandCenterHintStyle}>Cmd+K</span>
      </button>

      <button
        type="button"
        onClick={() => onOpenCommandPalette('files')}
        style={{
          ...HEADER_ACTION_BUTTON,
          minHeight: '38px',
          padding: `${tokens.spacing['2']} ${tokens.spacing['2.5']}`,
          borderRadius: tokens.radius.full,
          whiteSpace: 'nowrap',
        }}
        aria-label="Open file quick open"
        title="Cmd+P"
      >
        <Search size={14} />
        Files
        <span style={commandCenterHintStyle}>Cmd+P</span>
      </button>
    </div>
  );
}
