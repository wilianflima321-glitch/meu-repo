import { createContext, useContext } from 'react'

import type { EditorTab, TabGroup } from './TabBar.types'

export interface TabContextValue {
  tabs: EditorTab[];
  groups: TabGroup[];
  activeTabId: string | null;
  activeGroupId: string;
  openTab: (tab: Omit<EditorTab, 'id'>, options?: { preview?: boolean; focus?: boolean }) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  togglePin: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
  splitTab: (tabId: string, direction: 'horizontal' | 'vertical') => void;
  moveTabToGroup: (tabId: string, groupId: string) => void;
  markTabDirty: (tabId: string, dirty: boolean) => void;
  convertPreviewToNormal: (tabId: string) => void;
}

export const TabContext = createContext<TabContextValue | null>(null);

export function useTabBar() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabBar must be used within TabProvider');
  }
  return context;
}

// ============================================================================
// File Icons
// ============================================================================
