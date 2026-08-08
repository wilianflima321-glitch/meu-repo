'use client';

/**
 * Aethel Engine - Advanced Tab Bar System
 *
 * VS Code-style tabs with: drag reordering, pinning, split editors,
 * dirty indicators, context actions, and overflow handling.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';

import { Tab, TabContextMenu } from './TabBar.components'
import { TabContext, useTabBar } from './TabBar.context'
import { getFileIcon } from './TabBar.file-icons'
import type { EditorTab, TabGroup } from './TabBar.types'

export { useTabBar } from './TabBar.context'
export type { EditorTab, TabContextMenuAction, TabGroup } from './TabBar.types'

export function TabProvider({
  children,
  initialTabs,
  onTabChange,
  onTabClose,
}: {
  children: ReactNode;
  initialTabs?: EditorTab[];
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tab: EditorTab) => boolean | void;
}) {
  const [tabs, setTabs] = useState<EditorTab[]>(initialTabs || []);
  const [groups, setGroups] = useState<TabGroup[]>([
    { id: 'main', tabs: initialTabs || [], activeTabId: initialTabs?.[0]?.id, isActive: true },
  ]);
  const [activeTabId, setActiveTabIdState] = useState<string | null>(initialTabs?.[0]?.id || null);
  const [activeGroupId, setActiveGroupId] = useState('main');

  const generateId = () => Math.random().toString(36).slice(2);

  const openTab = useCallback((
    tabData: Omit<EditorTab, 'id'>,
    options: { preview?: boolean; focus?: boolean } = {}
  ) => {
    const { preview = false, focus = true } = options;

    // Check if tab already exists
    const existingTab = tabs.find(t => t.path === tabData.path);
    if (existingTab) {
      if (focus) {
        setActiveTabIdState(existingTab.id);
        onTabChange?.(existingTab.id);
      }
      // Convert preview to normal if opening again
      if (existingTab.isPreview && !preview) {
        setTabs(prev => prev.map(t =>
          t.id === existingTab.id ? { ...t, isPreview: false } : t
        ));
      }
      return;
    }

    // Close existing preview tab
    if (preview) {
      setTabs(prev => prev.filter(t => !t.isPreview || t.isPinned));
    }

    const newTab: EditorTab = {
      ...tabData,
      id: generateId(),
      isPreview: preview,
      groupId: activeGroupId,
    };

    setTabs(prev => {
      // Insert after pinned tabs
      const pinnedCount = prev.filter(t => t.isPinned).length;
      const before = prev.slice(0, pinnedCount);
      const after = prev.slice(pinnedCount);
      return [...before, newTab, ...after];
    });

    if (focus) {
      setActiveTabIdState(newTab.id);
      onTabChange?.(newTab.id);
    }
  }, [tabs, activeGroupId, onTabChange]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Check if we can close (dirty check, etc.)
    if (onTabClose && onTabClose(tab) === false) {
      return;
    }

    setTabs(prev => {
      const index = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);

      // Update active tab if we closed the active one
      if (activeTabId === tabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(index, newTabs.length - 1);
        const newActiveTab = newTabs[newActiveIndex];
        setActiveTabIdState(newActiveTab.id);
        onTabChange?.(newActiveTab.id);
      } else if (newTabs.length === 0) {
        setActiveTabIdState(null);
      }

      return newTabs;
    });
  }, [tabs, activeTabId, onTabClose, onTabChange]);

  const closeOtherTabs = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    setTabs(prev => prev.filter(t => t.id === tabId || t.isPinned));
    setActiveTabIdState(tabId);
    onTabChange?.(tabId);
  }, [tabs, onTabChange]);

  const closeTabsToRight = useCallback((tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    setTabs(prev => prev.slice(0, index + 1).concat(prev.slice(index + 1).filter(t => t.isPinned)));
  }, [tabs]);

  const closeAllTabs = useCallback(() => {
    setTabs(prev => prev.filter(t => t.isPinned));
    if (tabs.every(t => !t.isPinned)) {
      setActiveTabIdState(null);
    }
  }, [tabs]);

  const setActiveTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabIdState(tabId);
      onTabChange?.(tabId);

      // Convert preview to normal on double click
      if (tab.isPreview) {
        setTabs(prev => prev.map(t =>
          t.id === tabId ? { ...t, isPreview: false } : t
        ));
      }
    }
  }, [tabs, onTabChange]);

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [movedTab] = newTabs.splice(fromIndex, 1);

      // Don't allow moving unpinned tabs before pinned tabs
      const pinnedCount = newTabs.filter(t => t.isPinned).length;
      if (!movedTab.isPinned && toIndex < pinnedCount) {
        toIndex = pinnedCount;
      }

      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  const togglePin = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab) return prev;

      const wasPinned = tab.isPinned;
      const updatedTab = { ...tab, isPinned: !wasPinned, isPreview: false };

      // Reorder: pinned tabs go to the left
      const otherTabs = prev.filter(t => t.id !== tabId);

      if (!wasPinned) {
        // Pin: move to end of pinned tabs
        const pinnedTabs = otherTabs.filter(t => t.isPinned);
        const unpinnedTabs = otherTabs.filter(t => !t.isPinned);
        return [...pinnedTabs, updatedTab, ...unpinnedTabs];
      } else {
        // Unpin: move to start of unpinned tabs
        const pinnedTabs = otherTabs.filter(t => t.isPinned);
        const unpinnedTabs = otherTabs.filter(t => !t.isPinned);
        return [...pinnedTabs, updatedTab, ...unpinnedTabs];
      }
    });
  }, []);

  const duplicateTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    openTab({
      ...tab,
      title: `${tab.title} (copy)`,
      path: tab.path,
      isPreview: false,
    });
  }, [tabs, openTab]);

  const splitTab = useCallback((tabId: string, direction: 'horizontal' | 'vertical') => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const newGroupId = generateId();

    setGroups(prev => [...prev, {
      id: newGroupId,
      tabs: [{ ...tab, id: generateId(), groupId: newGroupId }],
      activeTabId: undefined,
      isActive: false,
      orientation: direction,
    }]);
  }, [tabs]);

  const moveTabToGroup = useCallback((tabId: string, groupId: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, groupId } : t
    ));
  }, []);

  const markTabDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, isDirty: dirty } : t
    ));
  }, []);

  const convertPreviewToNormal = useCallback((tabId: string) => {
    setTabs(prev => prev.map(t =>
      t.id === tabId ? { ...t, isPreview: false } : t
    ));
  }, []);

  return (
    <TabContext.Provider
      value={{
        tabs,
        groups,
        activeTabId,
        activeGroupId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeTabsToRight,
        closeAllTabs,
        setActiveTab,
        reorderTabs,
        togglePin,
        duplicateTab,
        splitTab,
        moveTabToGroup,
        markTabDirty,
        convertPreviewToNormal,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

// ============================================================================
// Tab Bar Component
// ============================================================================

export function TabBar({ className }: { className?: string }) {
  const { tabs, activeTabId, setActiveTab, closeTab, reorderTabs } = useTabBar();
  const [contextMenu, setContextMenu] = useState<{
    tab: EditorTab;
    position: { x: number; y: number };
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const [visibleTabCount, setVisibleTabCount] = useState(tabs.length);

  // Calculate visible tabs based on container width
  useEffect(() => {
    const calculateVisibleTabs = () => {
      if (!tabBarRef.current) return;
      const containerWidth = tabBarRef.current.offsetWidth - 40; // Reserve space for overflow button
      const avgTabWidth = 150;
      setVisibleTabCount(Math.max(1, Math.floor(containerWidth / avgTabWidth)));
    };

    calculateVisibleTabs();
    window.addEventListener('resize', calculateVisibleTabs);
    return () => window.removeEventListener('resize', calculateVisibleTabs);
  }, []);

  const visibleTabs = tabs.slice(0, visibleTabCount);
  const overflowTabs = tabs.slice(visibleTabCount);

  const handleDragStart = (e: DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderTabs(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleContextMenu = (e: MouseEvent, tab: EditorTab) => {
    e.preventDefault();
    setContextMenu({
      tab,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  return (
    <div
      ref={tabBarRef}
      className={`flex items-center border-b border-[var(--aethel-border-subtle)] bg-[image:var(--aethel-editor-tabbar-bg)] ${className || ''}`}
      onDragEnd={handleDragEnd}
    >
      {/* Tabs */}
      <div className="flex-1 flex items-center overflow-hidden">
        {visibleTabs.map((tab, index) => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => setActiveTab(tab.id)}
            onClose={() => closeTab(tab.id)}
            onContextMenu={e => handleContextMenu(e, tab)}
            onDragStart={e => handleDragStart(e, index)}
            onDragOver={e => handleDragOver(e, index)}
            onDrop={e => handleDrop(e, index)}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
          />
        ))}
      </div>

      {/* Overflow menu */}
      {overflowTabs.length > 0 && (
        <div className="relative">
          <button type="button" aria-label={showOverflowMenu ? 'Close hidden tabs menu' : 'Open hidden tabs menu'}
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-xs">{overflowTabs.length}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_98%,transparent)] py-1 shadow-[0_24px_60px_rgba(var(--aethel-brand-pure-black-rgb),0.5)]">
              {overflowTabs.map(tab => {
                const Icon = typeof tab.icon !== 'string' ? tab.icon || getFileIcon(tab.path).icon : getFileIcon(tab.path).icon;
                return (
                  <button type="button" aria-label={`Activate ${tab.title}`}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowOverflowMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                      tab.id === activeTabId
                        ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]'
                        : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{tab.title}</span>
                    {tab.isDirty && <span className="text-[var(--aethel-warning-light)]">*</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <TabContextMenu
          tab={contextMenu.tab}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Tab Group Splitter
// ============================================================================

export function TabGroupContainer({
  children,
  groups,
  onResize,
}: {
  children: ReactNode;
  groups: TabGroup[];
  onResize?: (groupId: string, size: number) => void;
}) {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = (groupId: string) => {
    setResizing(groupId);
  };

  const handleResizeMove = useCallback((e: Event) => {
    if (!resizing || !containerRef.current) return;

    const mouseEvent = e as unknown as globalThis.MouseEvent;
    const rect = containerRef.current.getBoundingClientRect();
    const percentage = ((mouseEvent.clientX - rect.left) / rect.width) * 100;

    setSizes(prev => ({
      ...prev,
      [resizing]: Math.max(20, Math.min(80, percentage)),
    }));

    onResize?.(resizing, percentage);
  }, [resizing, onResize]);

  const handleResizeEnd = useCallback(() => {
    setResizing(null);
  }, []);

  useEffect(() => {
    if (resizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizing, handleResizeMove, handleResizeEnd]);

  if (groups.length <= 1) {
    return <div className="flex-1 flex flex-col">{children}</div>;
  }

  return (
    <div ref={containerRef} className="flex-1 flex">
      {groups.map((group, index) => (
        <div
          key={group.id}
          className="flex flex-col relative"
          style={{
            width: sizes[group.id] ? `${sizes[group.id]}%` : `${100 / groups.length}%`,
          }}
        >
          {children}

          {/* Resize handle */}
          {index < groups.length - 1 && (
            <div
              onMouseDown={() => handleResizeStart(group.id)}
              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 ${
                resizing === group.id ? 'bg-[var(--aethel-info)]' : 'hover:bg-[color-mix(in_srgb,var(--aethel-info)_50%,transparent)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default TabBar;
