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
} from 'lucide-react';
import type { PanelState } from './types';
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

type HeaderPanelKey = 'sidebar' | 'chat' | 'preview';
type CommandPaletteMode = 'commands' | 'files';

const headerPanelItems: ReadonlyArray<{
  panel: HeaderPanelKey;
  icon: React.ReactNode;
  label: string;
}> = [
  { panel: 'sidebar', icon: <FolderTree size={16} />, label: 'Arquivos' },
  { panel: 'chat', icon: <MessageSquare size={16} />, label: 'AI Console' },
  { panel: 'preview', icon: <Play size={16} />, label: 'Visual' },
];

const commandPaletteItems: ReadonlyArray<{
  mode: CommandPaletteMode;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  title: string;
}> = [
  {
    mode: 'commands',
    icon: <Sparkles size={14} />,
    label: 'Cmd+K',
    ariaLabel: 'Abrir paleta de comandos',
    title: 'Cmd+K',
  },
  {
    mode: 'files',
    icon: <Search size={14} />,
    label: 'Cmd+P',
    ariaLabel: 'Abrir paleta de arquivos',
    title: 'Cmd+P',
  },
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
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: CommandPaletteMode) => void;
}

export function HeaderWorkspaceControls({
  headerExtras,
  panelState,
  onTogglePanel,
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
            active={panelState[item.panel].open}
            onClick={() => onTogglePanel(item.panel)}
          />
        ))}
      </div>

      {onOpenCommandPalette ? (
        <div style={floatingClusterStyle}>
          {commandPaletteItems.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onOpenCommandPalette(item.mode)}
              style={{
                ...HEADER_ACTION_BUTTON,
                minHeight: '34px',
                padding: `${tokens.spacing['1.5']} ${tokens.spacing['2.5']}`,
                borderRadius: tokens.radius.full,
              }}
              aria-label={item.ariaLabel}
              title={item.title}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
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
        aria-label="Executar acao principal da previa"
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
        aria-label="Abrir configuracoes"
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
