import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  Code2,
  FolderTree,
  Layout,
  MessageSquare,
  Play,
  Search,
  Settings,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import type { BottomPanelMode, PanelState } from './types';
import {
  BORDER_SECONDARY,
  HEADER_ACTION_BUTTON,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  getPanelToggleStyle,
  getPrimaryActionButtonStyle,
  iconButtonStyle,
} from './chromeStyles';
import { DeployTopbarAction } from './deployTopbarAction';

type HeaderPanelKey = 'sidebar' | 'chat' | 'terminal' | 'preview';
type CommandPaletteMode = 'commands' | 'files';

const headerPanelItems: ReadonlyArray<{
  panel: HeaderPanelKey;
  icon: React.ReactNode;
  label: string;
}> = [
  { panel: 'sidebar', icon: <FolderTree size={16} />, label: 'Files' },
  { panel: 'chat', icon: <MessageSquare size={16} />, label: 'AI Console' },
  { panel: 'terminal', icon: <TerminalSquare size={16} />, label: 'Terminal' },
  { panel: 'preview', icon: <Play size={16} />, label: 'Visual' },
];

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
  minWidth: '280px',
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
        style={{
          ...iconButtonStyle,
          minWidth: '34px',
          minHeight: '34px',
          color: TEXT_SECONDARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${BORDER_SECONDARY}`,
          background:
            'color-mix(in srgb, var(--aethel-surface-secondary) 58%, transparent)',
        }}
        aria-label="Alternar barra lateral"
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
  panelState,
  activeBottomPanel,
  onTogglePanel,
  onSelectBottomPanel,
  onOpenCommandPalette,
}: HeaderWorkspaceControlsProps) {
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
      {headerExtras ? <div style={floatingClusterStyle}>{headerExtras}</div> : null}

      <div style={floatingClusterStyle}>
        {headerPanelItems.map((item) => (
          <PanelToggle
            key={item.panel}
            icon={item.icon}
            label={item.label}
            active={
              item.panel === 'terminal'
                ? panelState.chat.open && activeBottomPanel === 'terminal'
                : item.panel === 'chat'
                  ? panelState.chat.open && activeBottomPanel === 'chat'
                  : panelState[item.panel].open
            }
            onClick={() => {
              if (item.panel === 'terminal') {
                onSelectBottomPanel?.('terminal');
                if (!(panelState.chat.open && activeBottomPanel !== 'terminal')) {
                  onTogglePanel('chat');
                }
                return;
              }

              if (item.panel === 'chat') {
                onSelectBottomPanel?.('chat');
                if (!(panelState.chat.open && activeBottomPanel !== 'chat')) {
                  onTogglePanel('chat');
                }
                return;
              }

              onTogglePanel(item.panel);
            }}
          />
        ))}
      </div>

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
        Executar
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        disabled={!onOpenSettings}
        style={{
          ...iconButtonStyle,
          minWidth: '34px',
          minHeight: '34px',
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

interface PanelToggleProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function PanelToggle({ icon, label, active, onClick }: PanelToggleProps) {
  return (
    <button type="button" onClick={onClick} style={getPanelToggleStyle(active)}>
      {icon}
      {label}
    </button>
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
              display: 'flex',
              minWidth: 0,
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}
          >
            <span
              style={{
                fontSize: tokens.typography.fontSize.sm,
                fontWeight: tokens.typography.fontWeight.semibold,
                color: TEXT_PRIMARY,
              }}
            >
              Command Center
            </span>
            <span
              style={{
                fontSize: tokens.typography.fontSize.xs,
                color: TEXT_TERTIARY,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              Pergunte, navegue e execute sem sair do cockpit.
            </span>
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
