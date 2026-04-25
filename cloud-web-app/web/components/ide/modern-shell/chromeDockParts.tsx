import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Code2,
  FolderTree,
  GitBranch,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { PanelState, PreviewMode, SidebarTab } from './types';
import {
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_WARNING,
  getDockButtonStyle,
  getMobileBottomButtonStyle,
} from './chromeStyles';

export type BottomDockItemId =
  | 'explorer'
  | 'search'
  | 'git'
  | 'viewport'
  | 'canvas'
  | 'console'
  | 'diagnostics'
  | 'chat';

interface BottomDockItemDescriptor {
  id: BottomDockItemId;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

export const BOTTOM_DOCK_ITEMS: ReadonlyArray<BottomDockItemDescriptor> = [
  { id: 'explorer', icon: <FolderTree size={16} />, label: 'Arquivos', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: <Search size={16} />, label: 'Buscar', shortcut: 'Ctrl+Shift+F' },
  { id: 'git', icon: <GitBranch size={16} />, label: 'Git', shortcut: 'Ctrl+Shift+G' },
  { id: 'viewport', icon: <Play size={16} />, label: 'Visual 3D', shortcut: 'Ctrl+Shift+V' },
  { id: 'canvas', icon: <Code2 size={16} />, label: 'Visual UI', shortcut: 'Ctrl+Shift+U' },
  { id: 'console', icon: <Terminal size={16} />, label: 'Console', shortcut: 'Ctrl+J' },
  { id: 'diagnostics', icon: <AlertCircle size={16} />, label: 'Erros', shortcut: 'Ctrl+Shift+M' },
  { id: 'chat', icon: <Sparkles size={16} />, label: 'AI Console', shortcut: 'Ctrl+I' },
];

interface BottomDockHandlers {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onToggleDiagnostics?: () => void;
}

export function isBottomDockItemActive(
  itemId: BottomDockItemId,
  panelState: PanelState,
  activeSidebarTab: SidebarTab,
  activePreviewMode: PreviewMode,
) {
  return (
    (itemId === 'explorer' && panelState.sidebar.open && activeSidebarTab === 'explorer') ||
    (itemId === 'git' && panelState.sidebar.open && activeSidebarTab === 'git') ||
    (itemId === 'viewport' && panelState.preview.open && activePreviewMode === 'viewport3d') ||
    (itemId === 'canvas' && panelState.preview.open && activePreviewMode === 'canvas') ||
    (itemId === 'console' && panelState.preview.open && activePreviewMode === 'console') ||
    (itemId === 'chat' && panelState.chat.open)
  );
}

export function handleBottomDockItemClick(
  itemId: BottomDockItemId,
  {
    panelState,
    onTogglePanel,
    onOpenCommandPalette,
    onSelectSidebarTab,
    onSelectPreviewMode,
    onToggleDiagnostics,
  }: BottomDockHandlers,
) {
  if (itemId === 'explorer') {
    if (!panelState.sidebar.open) onTogglePanel('sidebar');
    onSelectSidebarTab?.('explorer');
    return;
  }

  if (itemId === 'git') {
    if (!panelState.sidebar.open) onTogglePanel('sidebar');
    onSelectSidebarTab?.('git');
    return;
  }

  if (itemId === 'search') {
    onOpenCommandPalette?.('files');
    return;
  }

  if (itemId === 'viewport') {
    if (!panelState.preview.open) onTogglePanel('preview');
    onSelectPreviewMode?.('viewport3d');
    return;
  }

  if (itemId === 'canvas') {
    if (!panelState.preview.open) onTogglePanel('preview');
    onSelectPreviewMode?.('canvas');
    return;
  }

  if (itemId === 'console') {
    if (!panelState.preview.open) onTogglePanel('preview');
    onSelectPreviewMode?.('console');
    return;
  }

  if (itemId === 'diagnostics') {
    onToggleDiagnostics?.();
    return;
  }

  if (itemId === 'chat') {
    onTogglePanel('chat');
  }
}

interface BottomDockItemButtonProps {
  item: BottomDockItemDescriptor;
  active: boolean;
  onClick: () => void;
}

export function BottomDockItemButton({
  item,
  active,
  onClick,
}: BottomDockItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={getDockButtonStyle(active)}
      title={`${item.label} (${item.shortcut})`}
    >
      {item.icon}
      <span>{item.label}</span>
    </button>
  );
}

interface StatusMetricDescriptor {
  icon: React.ReactNode;
  label: string;
}

export const STATUS_BAR_LEADING_ITEMS: ReadonlyArray<StatusMetricDescriptor> = [
  { icon: <GitBranch size={12} />, label: 'main' },
  { icon: <AlertCircle size={12} style={{ color: STATUS_WARNING }} />, label: '0' },
  { icon: <AlertCircle size={12} style={{ color: STATUS_ERROR }} />, label: '0' },
];

export const STATUS_BAR_TRAILING_ITEMS: ReadonlyArray<StatusMetricDescriptor> = [
  { icon: <CheckCircle size={12} style={{ color: STATUS_SUCCESS }} />, label: 'Prettier' },
  { icon: <Terminal size={12} />, label: 'UTF-8' },
  { icon: <Clock size={12} />, label: 'Ln 1, Col 1' },
  { icon: <Sparkles size={12} />, label: 'AI Ready' },
];

interface StatusMetricProps {
  icon: React.ReactNode;
  label: string;
}

export function StatusMetric({ icon, label }: StatusMetricProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

interface ActiveFileStatusProps {
  activeFileName: string;
}

export function ActiveFileStatus({ activeFileName }: ActiveFileStatusProps) {
  return (
    <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacing['1'] }}>
      <Code2 size={12} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {activeFileName}
      </span>
    </div>
  );
}

type MobileBottomBarItemId = keyof PanelState;

interface MobileBottomBarItemDescriptor {
  id: MobileBottomBarItemId;
  icon: React.ReactNode;
  label: string;
}

export const MOBILE_BOTTOM_BAR_ITEMS: ReadonlyArray<MobileBottomBarItemDescriptor> = [
  { id: 'sidebar', icon: <FolderTree size={20} />, label: 'Arquivos' },
  { id: 'editor', icon: <Code2 size={20} />, label: 'Editor' },
  { id: 'chat', icon: <MessageSquare size={20} />, label: 'AI Console' },
  { id: 'preview', icon: <Play size={20} />, label: 'Visual' },
];

interface MobileBottomBarItemButtonProps {
  item: MobileBottomBarItemDescriptor;
  active: boolean;
  onClick: () => void;
}

export function MobileBottomBarItemButton({
  item,
  active,
  onClick,
}: MobileBottomBarItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={getMobileBottomButtonStyle(active)}
    >
      {item.icon}
      <span>{item.label}</span>
    </button>
  );
}
