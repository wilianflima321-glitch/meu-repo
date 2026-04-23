'use client';

import React from 'react';
import { tokens, gradients } from '@/lib/design-tokens';
import {
  Layout,
  Code2,
  Play,
  MessageSquare,
  FolderTree,
  Settings,
  GripVertical,
  GitBranch,
  AlertCircle,
  CheckCircle,
  Clock,
  Terminal,
  Search,
  Sparkles,
} from 'lucide-react';
import type { PanelState, PreviewMode, SidebarTab } from './types';

export const chromeBarPadding = `${tokens.spacing['2']} ${tokens.spacing['4']}`;
export const chromeBarHeight = '48px';
export const SURFACE_PRIMARY = 'var(--aethel-surface-primary)';
export const SURFACE_SECONDARY = 'var(--aethel-surface-secondary)';
export const TEXT_PRIMARY = 'var(--aethel-text-primary)';
export const TEXT_SECONDARY = 'var(--aethel-text-secondary)';
export const TEXT_TERTIARY = 'var(--aethel-text-tertiary)';
export const BORDER_PRIMARY = 'var(--aethel-border-primary)';
export const BORDER_SECONDARY = 'var(--aethel-border-secondary)';
export const STATUS_SUCCESS = 'var(--aethel-success)';
export const STATUS_WARNING = 'var(--aethel-warning)';
export const STATUS_ERROR = 'var(--aethel-error)';
export const ACCENT_CYAN = 'var(--aethel-info)';

export const HEADER_ACTION_BUTTON: React.CSSProperties = {
  minHeight: '36px',
  padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
  background: 'color-mix(in srgb, var(--aethel-surface-secondary) 52%, transparent)',
  border: `1px solid ${BORDER_SECONDARY}`,
  borderRadius: tokens.radius.md,
  color: TEXT_SECONDARY,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: tokens.spacing['2'],
  fontSize: tokens.typography.fontSize.xs,
  fontWeight: tokens.typography.fontWeight.medium,
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

export const iconButtonStyle: React.CSSProperties = {
  minWidth: '36px',
  minHeight: '36px',
  padding: tokens.spacing['2'],
  background: 'transparent',
  border: 'none',
  borderRadius: tokens.radius.md,
  color: TEXT_TERTIARY,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

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
    padding: `${tokens.spacing['3']} ${tokens.spacing['5']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '60px',
    gap: tokens.spacing['4'],
  };

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', minWidth: 0, flex: '1 1 auto', alignItems: 'center', gap: tokens.spacing['4'] }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            ...iconButtonStyle,
            color: TEXT_SECONDARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Alternar barra lateral"
        >
          <Layout size={20} />
        </button>

        <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: tokens.spacing['0.5'] }}>
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
          {activeFileName && (
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
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeFileName}
              </span>
            </span>
          )}
        </div>
      </div>

      {!isCompact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'], flexWrap: 'wrap', justifyContent: 'center' }}>
          {headerExtras}
          <PanelToggle
            icon={<FolderTree size={16} />}
            label="Arquivos"
            active={panelState.sidebar.open}
            onClick={() => onTogglePanel('sidebar')}
          />
          <PanelToggle
            icon={<MessageSquare size={16} />}
            label="Copiloto"
            active={panelState.chat.open}
            onClick={() => onTogglePanel('chat')}
          />
          <PanelToggle
            icon={<Play size={16} />}
            label="Previa"
            active={panelState.preview.open}
            onClick={() => onTogglePanel('preview')}
          />
          {onOpenCommandPalette && (
            <>
              <button
                type="button"
                onClick={() => onOpenCommandPalette('commands')}
                style={HEADER_ACTION_BUTTON}
                aria-label="Abrir paleta de comandos"
                title="Cmd+K"
              >
                <Sparkles size={14} />
                Cmd+K
              </button>
              <button
                type="button"
                onClick={() => onOpenCommandPalette('files')}
                style={HEADER_ACTION_BUTTON}
                aria-label="Abrir paleta de arquivos"
                title="Cmd+P"
              >
                <Search size={14} />
                Cmd+P
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'], flexShrink: 0 }}>
        <button
          type="button"
          onClick={onRunPrimaryAction}
          disabled={!onRunPrimaryAction}
          style={{
            minHeight: '40px',
            padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
            background: gradients.brand,
            border: 'none',
            borderRadius: tokens.radius.md,
            color: TEXT_PRIMARY,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.semibold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing['2'],
            opacity: onRunPrimaryAction ? 1 : 0.65,
          }}
          aria-label="Executar ação principal da previa"
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
            color: TEXT_SECONDARY,
            opacity: onOpenSettings ? 1 : 0.65,
          }}
          aria-label="Abrir configuracoes"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
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
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        minHeight: '36px',
        padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
        background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        border: `1px solid ${active ? BORDER_PRIMARY : 'transparent'}`,
        borderRadius: tokens.radius.md,
        color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.medium,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface BottomDockProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: SidebarTab;
  activePreviewMode?: PreviewMode;
}

export function BottomDock({
  panelState,
  onTogglePanel,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
}: BottomDockProps) {
  const dockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '52px',
    overflowX: 'auto',
  };

  const dockItems = [
    { id: 'explorer', icon: <FolderTree size={16} />, label: 'Arquivos', shortcut: 'Ctrl+Shift+E' },
    { id: 'search', icon: <Search size={16} />, label: 'Buscar', shortcut: 'Ctrl+Shift+F' },
    { id: 'git', icon: <GitBranch size={16} />, label: 'Git', shortcut: 'Ctrl+Shift+G' },
    { id: 'viewport', icon: <Play size={16} />, label: 'Viewport', shortcut: 'Ctrl+Shift+V' },
    { id: 'console', icon: <Terminal size={16} />, label: 'Console', shortcut: 'Ctrl+J' },
    { id: 'diagnostics', icon: <AlertCircle size={16} />, label: 'Erros', shortcut: 'Ctrl+Shift+M' },
    { id: 'chat', icon: <Sparkles size={16} />, label: 'IA', shortcut: 'Ctrl+I' },
  ] as const;

  return (
    <div style={dockStyle}>
      {dockItems.map((item) => {
        const isActive =
          (item.id === 'explorer' && panelState.sidebar.open && activeSidebarTab === 'explorer') ||
          (item.id === 'git' && panelState.sidebar.open && activeSidebarTab === 'git') ||
          (item.id === 'viewport' && panelState.preview.open && activePreviewMode === 'viewport3d') ||
          (item.id === 'console' && panelState.preview.open && activePreviewMode === 'console') ||
          (item.id === 'chat' && panelState.chat.open);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'explorer') {
                if (!panelState.sidebar.open) onTogglePanel('sidebar');
                onSelectSidebarTab?.('explorer');
                return;
              }
              if (item.id === 'git') {
                if (!panelState.sidebar.open) onTogglePanel('sidebar');
                onSelectSidebarTab?.('git');
                return;
              }
              if (item.id === 'search') {
                onOpenCommandPalette?.('files');
                return;
              }
              if (item.id === 'viewport') {
                if (!panelState.preview.open) onTogglePanel('preview');
                onSelectPreviewMode?.('viewport3d');
                return;
              }
              if (item.id === 'console') {
                if (!panelState.preview.open) onTogglePanel('preview');
                onSelectPreviewMode?.('console');
                return;
              }
              if (item.id === 'diagnostics') {
                onToggleDiagnostics?.();
                return;
              }
              if (item.id === 'chat') {
                onTogglePanel('chat');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              minHeight: '36px',
              padding: `${tokens.spacing['1.5']} ${tokens.spacing['2.5']}`,
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: `1px solid ${isActive ? BORDER_PRIMARY : 'transparent'}`,
              borderRadius: tokens.radius.sm,
              color: isActive ? TEXT_PRIMARY : TEXT_TERTIARY,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
              flexShrink: 0,
              transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
              whiteSpace: 'nowrap',
            }}
            title={`${item.label} (${item.shortcut})`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StatusBarProps {
  projectName: string;
  activeFileName?: string;
}

export function StatusBar({ projectName, activeFileName }: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['4']}`,
    background: SURFACE_SECONDARY,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '28px',
    fontSize: tokens.typography.fontSize.xs,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  return (
    <div style={statusBarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: STATUS_WARNING }} />
          <span>0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: STATUS_ERROR }} />
          <span>0</span>
        </div>
      </div>

      {activeFileName && (
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Code2 size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFileName}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />
          <span>Prettier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Terminal size={12} />
          <span>UTF-8</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Clock size={12} />
          <span>Ln 1, Col 1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Sparkles size={12} />
          <span>AI Ready</span>
        </div>
      </div>
    </div>
  );
}

interface MobileBottomBarProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

export function MobileBottomBar({ panelState, onTogglePanel }: MobileBottomBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `${tokens.spacing['2']} ${tokens.spacing['2']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${BORDER_SECONDARY}`,
    minHeight: '60px',
    gap: tokens.spacing['1'],
  };

  const items = [
    { id: 'sidebar', icon: <FolderTree size={20} />, label: 'Arquivos' },
    { id: 'editor', icon: <Code2 size={20} />, label: 'Editor' },
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Copiloto' },
    { id: 'preview', icon: <Play size={20} />, label: 'Previa' },
  ] as const;

  return (
    <nav style={barStyle}>
      {items.map((item) => {
        const isActive = panelState[item.id as keyof PanelState].open;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onTogglePanel(item.id as keyof PanelState)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing['1'],
              minWidth: '64px',
              minHeight: '44px',
              padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
              background: 'transparent',
              border: 'none',
              color: isActive ? ACCENT_CYAN : TEXT_TERTIARY,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ModernIDELoading() {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: SURFACE_PRIMARY,
    color: TEXT_SECONDARY,
    gap: tokens.spacing['4'],
  };

  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: `3px solid ${BORDER_SECONDARY}`,
    borderTopColor: ACCENT_CYAN,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <span style={{ fontSize: tokens.typography.fontSize.sm }}>
        Carregando IDE...
      </span>
    </div>
  );
}
