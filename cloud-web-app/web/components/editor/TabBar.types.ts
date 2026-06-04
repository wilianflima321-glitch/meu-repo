import type { LucideIcon } from 'lucide-react'

export interface EditorTab {
  id: string;
  title: string;
  path: string;
  icon?: LucideIcon | string;
  iconColor?: string;
  isDirty?: boolean;
  isPinned?: boolean;
  isPreview?: boolean;
  groupId?: string;
  language?: string;
}

export interface TabGroup {
  id: string;
  tabs: EditorTab[];
  activeTabId?: string;
  isActive?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export interface TabContextMenuAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  action: (tab: EditorTab) => void;
}

// ============================================================================
// Tab Context
// ============================================================================
