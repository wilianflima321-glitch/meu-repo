import React from 'react';
import { tokens } from '@/lib/design-tokens';
import {
  AlertCircle,
  Code2,
  FolderTree,
  GitBranch,
  MessageSquare,
  Play,
  Search,
  Sparkles,
  Terminal,
  TerminalSquare,
} from 'lucide-react';
import type { BottomPanelMode, PanelState, PreviewMode, SidebarTab } from './types';
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
  | 'terminal'
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
  { id: 'terminal', icon: <TerminalSquare size={16} />, label: 'Terminal', shortcut: 'Ctrl+`' },
  { id: 'console', icon: <Terminal size={16} />, label: 'Console', shortcut: 'Ctrl+J' },
  { id: 'diagnostics', icon: <AlertCircle size={16} />, label: 'Erros', shortcut: 'Ctrl+Shift+M' },
  { id: 'chat', icon: <Sparkles size={16} />, label: 'AI Console', shortcut: 'Ctrl+I' },
];

interface BottomDockHandlers {
  panelState: PanelState;
  activeBottomPanel?: BottomPanelMode;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: SidebarTab) => void;
  onSelectPreviewMode?: (mode: PreviewMode) => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  onToggleDiagnostics?: () => void;
}

export function isBottomDockItemActive(
  itemId: BottomDockItemId,
  panelState: PanelState,
  activeSidebarTab: SidebarTab,
  activePreviewMode: PreviewMode,
  activeBottomPanel: BottomPanelMode,
) {
  return (
    (itemId === 'explorer' && panelState.sidebar.open && activeSidebarTab === 'explorer') ||
    (itemId === 'git' && panelState.sidebar.open && activeSidebarTab === 'git') ||
    (itemId === 'viewport' && panelState.preview.open && activePreviewMode === 'viewport3d') ||
    (itemId === 'canvas' && panelState.preview.open && activePreviewMode === 'canvas') ||
    (itemId === 'console' && panelState.preview.open && activePreviewMode === 'console') ||
    (itemId === 'terminal' && panelState.chat.open && activeBottomPanel === 'terminal') ||
    (itemId === 'chat' && panelState.chat.open && activeBottomPanel === 'chat')
  );
}

export function handleBottomDockItemClick(
  itemId: BottomDockItemId,
  {
    panelState,
    activeBottomPanel,
    onTogglePanel,
    onOpenCommandPalette,
    onSelectSidebarTab,
    onSelectPreviewMode,
    onSelectBottomPanel,
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

  if (itemId === 'terminal') {
    onSelectBottomPanel?.('terminal');
    if (panelState.chat.open && activeBottomPanel === 'terminal') {
      onTogglePanel('chat');
      return;
    }
    if (!panelState.chat.open) {
      onTogglePanel('chat');
    }
    return;
  }

  if (itemId === 'diagnostics') {
    onToggleDiagnostics?.();
    return;
  }

  if (itemId === 'chat') {
    onSelectBottomPanel?.('chat');
    if (panelState.chat.open && activeBottomPanel === 'chat') {
      onTogglePanel('chat');
      return;
    }
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
