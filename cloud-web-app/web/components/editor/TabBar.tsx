'use client';

/**
 * Aethel Engine - Advanced Tab Bar System
 * 
 * VS Code-style tabs with:
 * - Drag & drop reordering
 * - Pin tabs (sticky left)
 * - Tab groups / Split editors
 * - Dirty indicator (*)
 * - Close others / Close to the right
 * - Tab context menu
 * - Tab overflow menu
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
  type DragEvent,
  type MouseEvent,
} from 'react';
import {
  X,
  MoreHorizontal,
  ChevronDown,
  Pin,
  PinOff,
  Copy,
  Split,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Trash2,
  FileCode,
  FileJson,
  FileText,
  Settings,
  Terminal,
  GitBranch,
  Bug,
  Search,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

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

interface TabContextValue {
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

const TabContext = createContext<TabContextValue | null>(null);

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

const FILE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  '.ts': { icon: FileCode, color: '#3178c6' },
  '.tsx': { icon: FileCode, color: '#3178c6' },
  '.js': { icon: FileCode, color: '#f7df1e' },
  '.jsx': { icon: FileCode, color: '#61dafb' },
  '.json': { icon: FileJson, color: '#cbcb41' },
  '.md': { icon: FileText, color: '#519aba' },
  '.css': { icon: FileCode, color: '#563d7c' },
  '.scss': { icon: FileCode, color: '#cc6699' },
  '.html': { icon: FileCode, color: '#e34c26' },
  '.py': { icon: FileCode, color: '#3572A5' },
  '.rs': { icon: FileCode, color: '#dea584' },
  '.go': { icon: FileCode, color: '#00ADD8' },
};

function getFileIcon(path: string): { icon: LucideIcon; color: string } {
  const ext = path.match(/\.[^.]+$/)?.[0] || '';
  return FILE_ICONS[ext] || { icon: FileText, color: '#6b7280' };
}

// ============================================================================
// Tab Provider
// ============================================================================

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
// Tab Context Menu
// ============================================================================

function TabContextMenu({
  tab,
  position,
  onClose,
}: {
  tab: EditorTab;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const {
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    togglePin,
    duplicateTab,
    splitTab,
  } = useTabBar();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const actions: TabContextMenuAction[] = [
    {
      id: 'close',
      label: 'Close',
      shortcut: 'Ctrl+W',
      action: () => closeTab(tab.id),
    },
    {
      id: 'close-others',
      label: 'Close Others',
      action: () => closeOtherTabs(tab.id),
    },
    {
      id: 'close-right',
      label: 'Close to the Right',
      action: () => closeTabsToRight(tab.id),
    },
    {
      id: 'close-all',
      label: 'Close All',
      danger: true,
      action: () => closeAllTabs(),
    },
    { id: 'divider-1', label: '-', action: () => {} },
    {
      id: 'pin',
      label: tab.isPinned ? 'Unpin' : 'Pin',
      icon: tab.isPinned ? PinOff : Pin,
      action: () => togglePin(tab.id),
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      action: () => duplicateTab(tab.id),
    },
    { id: 'divider-2', label: '-', action: () => {} },
    {
      id: 'split-right',
      label: 'Split Right',
      icon: Split,
      action: () => splitTab(tab.id, 'horizontal'),
    },
    {
      id: 'split-down',
      label: 'Split Down',
      icon: Split,
      action: () => splitTab(tab.id, 'vertical'),
    },
    { id: 'divider-3', label: '-', action: () => {} },
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: Copy,
      action: () => navigator.clipboard.writeText(tab.path),
    },
    {
      id: 'reveal',
      label: 'Reveal in Explorer',
      icon: ExternalLink,
      action: () => {
        // Trigger reveal in file explorer
        console.log('Reveal:', tab.path);
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {actions.map((action, index) => {
        if (action.label === '-') {
          return <div key={action.id} className="my-1 border-t border-slate-800" />;
        }

        return (
          <button
            key={action.id}
            onClick={() => {
              action.action(tab);
              onClose();
            }}
            disabled={action.disabled}
            className={`w-full flex items-center justify-between gap-4 px-3 py-1.5 text-sm ${
              action.danger
                ? 'text-red-400 hover:bg-red-600/10'
                : 'text-slate-300 hover:bg-slate-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2">
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </div>
            {action.shortcut && (
              <span className="text-xs text-slate-500">{action.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single Tab Component
// ============================================================================

function Tab({
  tab,
  isActive,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isDragOver,
}: {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  const { convertPreviewToNormal } = useTabBar();
  const fileIcon = typeof tab.icon === 'string' ? null : tab.icon || getFileIcon(tab.path).icon;
  const iconColor = tab.iconColor || (typeof tab.icon !== 'string' ? getFileIcon(tab.path).color : undefined);

  const handleDoubleClick = () => {
    if (tab.isPreview) {
      convertPreviewToNormal(tab.id);
    }
  };

  const handleMiddleClick = (e: MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      draggable
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onAuxClick={handleMiddleClick}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        group flex items-center gap-2 h-9 px-3 border-r border-slate-800 cursor-pointer
        transition-colors select-none
        ${isActive
          ? 'bg-slate-900 text-white border-t-2 border-t-indigo-500'
          : 'bg-slate-950 text-slate-400 hover:bg-slate-800/50 border-t-2 border-t-transparent'
        }
        ${tab.isPreview ? 'italic' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'border-l-2 border-l-indigo-500' : ''}
        ${tab.isPinned ? 'px-2' : ''}
      `}
    >
      {/* Pin indicator */}
      {tab.isPinned && (
        <Pin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
      )}

      {/* File icon */}
      {fileIcon && (
        <div className="flex-shrink-0" style={{ color: iconColor }}>
          {typeof fileIcon === 'function' ? (
            // LucideIcon
            React.createElement(fileIcon, { className: 'w-4 h-4' })
          ) : null}
        </div>
      )}

      {/* Tab title */}
      {!tab.isPinned && (
        <span className="truncate max-w-32 text-sm">
          {tab.title}
          {tab.isDirty && (
            <span className="text-white ml-0.5">*</span>
          )}
        </span>
      )}

      {/* Close button */}
      {!tab.isPinned && (
        <button
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
          className={`
            flex-shrink-0 p-0.5 rounded
            ${isActive || tab.isDirty
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
            }
            hover:bg-slate-700
          `}
        >
          {tab.isDirty ? (
            <div className="w-3 h-3 rounded-full bg-white" />
          ) : (
            <X className="w-3 h-3" />
          )}
        </button>
      )}
    </div>
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
      className={`flex items-center bg-slate-950 border-b border-slate-800 ${className || ''}`}
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
          <button
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-xs">{overflowTabs.length}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              {overflowTabs.map(tab => {
                const Icon = typeof tab.icon !== 'string' ? tab.icon || getFileIcon(tab.path).icon : FileText;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowOverflowMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${
                      tab.id === activeTabId
                        ? 'bg-indigo-600/20 text-indigo-400'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{tab.title}</span>
                    {tab.isDirty && <span className="text-amber-400">*</span>}
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
                resizing === group.id ? 'bg-indigo-500' : 'hover:bg-indigo-500/50'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default TabBar;
