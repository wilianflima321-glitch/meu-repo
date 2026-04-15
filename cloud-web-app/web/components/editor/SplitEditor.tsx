/**
 * Aethel IDE - Split Editor Component
 *
 * Componente profissional para split editor como VS Code.
 * Suporta multiplos grupos de editores, drag & drop de tabs,
 * e redimensionamento de paineis.
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  MoreHorizontal,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Maximize2,
  Pin,
  PinOff,
  ChevronRight,
  FileCode,
  Circle
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface EditorTab {
  id: string;
  title: string;
  path?: string;
  language?: string;
  dirty: boolean;
  pinned: boolean;
  preview: boolean;
  icon?: React.ReactNode;
}

export interface EditorGroup {
  id: string;
  tabs: EditorTab[];
  activeTabId: string | null;
}

export type SplitDirection = 'horizontal' | 'vertical';

interface SplitEditorProps {
  groups: EditorGroup[];
  activeGroupId: string;
  onTabClick: (tabId: string, groupId: string) => void;
  onTabClose: (tabId: string, groupId: string) => void;
  onTabPin: (tabId: string, groupId: string) => void;
  onTabMove: (tabId: string, fromGroupId: string, toGroupId: string, index: number) => void;
  onGroupFocus: (groupId: string) => void;
  onGroupClose: (groupId: string) => void;
  onSplit: (groupId: string, direction: SplitDirection) => void;
  renderEditor: (groupId: string, tab: EditorTab | null) => React.ReactNode;
  splitDirection?: SplitDirection;
}

// ============================================================================
// TAB COMPONENT
// ============================================================================

interface TabProps {
  tab: EditorTab;
  isActive: boolean;
  groupId: string;
  onTabClick: () => void;
  onTabClose: () => void;
  onTabPin: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const Tab: React.FC<TabProps> = ({
  tab,
  isActive,
  groupId,
  onTabClick,
  onTabClose,
  onTabPin,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const getFileIcon = () => {
    if (tab.icon) return tab.icon;

    const ext = tab.path?.split('.').pop()?.toLowerCase();
    const iconColors: Record<string, string> = {
      ts: 'text-[var(--aethel-primary-light)]',
      tsx: 'text-[var(--aethel-primary-light)]',
      js: 'text-[var(--aethel-warning-light)]',
      jsx: 'text-[var(--aethel-warning-light)]',
      py: 'text-[var(--aethel-success-light)]',
      rs: 'text-[var(--aethel-warning-light)]',
      go: 'text-[var(--aethel-info-light)]',
      java: 'text-[var(--aethel-error-light)]',
      css: 'text-[var(--aethel-primary-light)]',
      html: 'text-[var(--aethel-warning)]',
      json: 'text-[var(--aethel-warning)]',
      md: 'text-[var(--aethel-text-tertiary)]',
    };

    return <FileCode size={14} className={iconColors[ext || ''] || 'text-[var(--aethel-text-tertiary)]'} />;
  };

  return (
    <div
      className={`
        group relative flex items-center gap-1.5 h-9 px-3 cursor-pointer
        border-r border-[var(--aethel-border-primary)] select-none
        ${isActive
          ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] border-t-2 border-t-[var(--aethel-primary)]'
          : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)] hover:bg-[var(--aethel-surface-quaternary)]'
        }
        ${tab.preview ? 'italic' : ''}
        ${tab.pinned ? 'bg-[var(--aethel-surface-tertiary)]' : ''}
      `}
      onClick={onTabClick}
      onDoubleClick={() => {
        if (tab.preview) onTabClick(); // Makes permanent
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => {
        e.preventDefault();
        setShowMenu(true);
      }}
      role="tab"
      aria-selected={isActive}
      aria-label={`${tab.title}${tab.dirty ? ' (unsaved)' : ''}`}
    >
      {/* Pinned indicator */}
      {tab.pinned && (
        <Pin size={10} className="text-[var(--aethel-text-quaternary)] flex-shrink-0" />
      )}

      {/* File icon */}
      <span className="flex-shrink-0">
        {getFileIcon()}
      </span>

      {/* Tab title */}
      <span className="truncate max-w-[120px] text-sm">
        {tab.title}
      </span>

      {/* Dirty indicator */}
      {tab.dirty && (
        <Circle size={8} className="flex-shrink-0 fill-current text-[var(--aethel-text-primary)]" />
      )}

      {/* Close button */}
      <button type="button" aria-label={`Close ${tab.title}`}
        className={`
          flex-shrink-0 p-0.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)]
          ${isActive || tab.dirty ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          transition-opacity
        `}
        onClick={(e) => {
          e.stopPropagation();
          onTabClose();
        }}
      >
        {tab.dirty ? (
          <Circle size={12} className="fill-current" />
        ) : (
          <X size={14} />
        )}
      </button>

      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 w-48 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)]
                     rounded-md shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" aria-label={`Close ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => { onTabClose(); setShowMenu(false); }}
          >
            Close
          </button>
          <button type="button" aria-label={`Close other tabs than ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Close Others
          </button>
          <button type="button" aria-label="Close all tabs"
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Close All
          </button>
          <button type="button" aria-label={`Close tabs to the right of ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Close to the Right
          </button>
          <div className="border-t border-[var(--aethel-border-secondary)] my-1" />
          <button type="button" aria-label={tab.pinned ? `Unpin ${tab.title}` : `Pin ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] flex items-center gap-2"
            onClick={() => { onTabPin(); setShowMenu(false); }}
          >
            {tab.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {tab.pinned ? 'Unpin' : 'Pin'}
          </button>
          <div className="border-t border-[var(--aethel-border-secondary)] my-1" />
          <button type="button" aria-label={`Copy path of ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Copy Path
          </button>
          <button type="button" aria-label={`Copy relative path of ${tab.title}`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Copy Relative Path
          </button>
          <button type="button" aria-label={`Reveal ${tab.title} in explorer`}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)]"
            onClick={() => setShowMenu(false)}
          >
            Reveal in Explorer
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// TAB BAR COMPONENT
// ============================================================================

interface TabBarProps {
  group: EditorGroup;
  isActiveGroup: boolean;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabPin: (tabId: string) => void;
  onTabMove: (tabId: string, fromGroupId: string, index: number) => void;
  onGroupFocus: () => void;
  onSplit: (direction: SplitDirection) => void;
  onGroupClose: () => void;
  canClose: boolean;
}

const TabBar: React.FC<TabBarProps> = ({
  group,
  isActiveGroup,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabMove,
  onGroupFocus,
  onSplit,
  onGroupClose,
  canClose,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Sort tabs: pinned first
  const sortedTabs = [...group.tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const handleDragStart = (e: React.DragEvent, tab: EditorTab) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      tabId: tab.id,
      groupId: group.id,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onTabMove(data.tabId, data.groupId, index);
    } catch {
      // Invalid drop
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  return (
    <div
      className={`
        flex items-center h-9 bg-[var(--aethel-surface-tertiary)] border-b
        ${isActiveGroup ? 'border-b-[var(--aethel-surface-secondary)]' : 'border-b-[var(--aethel-border-secondary)]'}
      `}
      onClick={onGroupFocus}
      role="tablist"
    >
      {/* Tabs */}
      <div
        ref={tabsContainerRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-hidden
                   scrollbar-thin scrollbar-thumb-[var(--aethel-border-secondary)] scrollbar-track-transparent"
        onDragLeave={handleDragLeave}
      >
        {sortedTabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            {/* Drop indicator */}
            {dragOverIndex === index && (
              <div className="w-0.5 h-full bg-[var(--aethel-primary)]" />
            )}
            <Tab
              tab={tab}
              isActive={tab.id === group.activeTabId}
              groupId={group.id}
              onTabClick={() => onTabClick(tab.id)}
              onTabClose={() => onTabClose(tab.id)}
              onTabPin={() => onTabPin(tab.id)}
              onDragStart={(e) => handleDragStart(e, tab)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            />
          </React.Fragment>
        ))}

        {/* End drop zone */}
        <div
          className="flex-1 min-w-[20px] h-full"
          onDragOver={(e) => handleDragOver(e, sortedTabs.length)}
          onDrop={(e) => handleDrop(e, sortedTabs.length)}
        >
          {dragOverIndex === sortedTabs.length && (
            <div className="w-0.5 h-full bg-[var(--aethel-primary)]" />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 px-1 border-l border-[var(--aethel-border-secondary)]">
        <button type="button" aria-label="Split editor right"
          className="p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] transition-colors"
          onClick={() => onSplit('horizontal')}
          title="Split Editor Right"
        >
          <SplitSquareHorizontal size={14} className="text-[var(--aethel-text-tertiary)]" />
        </button>
        <button type="button" aria-label="Split editor down"
          className="p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] transition-colors"
          onClick={() => onSplit('vertical')}
          title="Split Editor Down"
        >
          <SplitSquareVertical size={14} className="text-[var(--aethel-text-tertiary)]" />
        </button>
        {canClose && (
          <button type="button" aria-label="Close editor group"
            className="p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] transition-colors"
            onClick={onGroupClose}
            title="Close Editor Group"
          >
            <X size={14} className="text-[var(--aethel-text-tertiary)]" />
          </button>
        )}
        <button
          type="button"
          className="p-1.5 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] transition-colors"
          title="More Actions"
          aria-label="More actions"
        >
          <MoreHorizontal size={14} className="text-[var(--aethel-text-tertiary)]" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EDITOR GROUP COMPONENT
// ============================================================================

interface EditorGroupViewProps {
  group: EditorGroup;
  isActiveGroup: boolean;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabPin: (tabId: string) => void;
  onTabMove: (tabId: string, fromGroupId: string, index: number) => void;
  onGroupFocus: () => void;
  onSplit: (direction: SplitDirection) => void;
  onGroupClose: () => void;
  canClose: boolean;
  renderEditor: (tab: EditorTab | null) => React.ReactNode;
}

const EditorGroupView: React.FC<EditorGroupViewProps> = ({
  group,
  isActiveGroup,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabMove,
  onGroupFocus,
  onSplit,
  onGroupClose,
  canClose,
  renderEditor,
}) => {
  const activeTab = group.tabs.find(t => t.id === group.activeTabId) || null;

  return (
    <div
      className={`
        flex flex-col h-full
        ${isActiveGroup ? 'ring-1 ring-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]' : ''}
      `}
      onClick={onGroupFocus}
    >
      {/* Tab Bar */}
      <TabBar
        group={group}
        isActiveGroup={isActiveGroup}
        onTabClick={onTabClick}
        onTabClose={onTabClose}
        onTabPin={onTabPin}
        onTabMove={onTabMove}
        onGroupFocus={onGroupFocus}
        onSplit={onSplit}
        onGroupClose={onGroupClose}
        canClose={canClose}
      />

      {/* Breadcrumbs */}
      {activeTab && activeTab.path && (
        <div className="flex items-center gap-1 h-6 px-3 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-secondary)] text-xs text-[var(--aethel-text-tertiary)]">
          {activeTab.path.split(/[/\\]/).map((part, i, arr) => (
            <React.Fragment key={i}>
              <span className="hover:text-[var(--aethel-text-secondary)] cursor-pointer">{part}</span>
              {i < arr.length - 1 && <ChevronRight size={12} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Editor Content */}
      <div className="flex-1 overflow-hidden bg-[var(--aethel-surface-secondary)]">
        {renderEditor(activeTab)}
      </div>
    </div>
  );
};

// ============================================================================
// RESIZABLE DIVIDER COMPONENT
// ============================================================================

interface ResizableDividerProps {
  direction: SplitDirection;
  onResize: (delta: number) => void;
}

const ResizableDivider: React.FC<ResizableDividerProps> = ({
  direction,
  onResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      startPosRef.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize]);

  return (
    <div
      className={`
        ${direction === 'horizontal'
          ? 'w-1 cursor-col-resize hover:bg-[var(--aethel-primary)]/50'
          : 'h-1 cursor-row-resize hover:bg-[var(--aethel-primary)]/50'
        }
        ${isDragging ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-border-secondary)]'}
        transition-colors
      `}
      onMouseDown={handleMouseDown}
    />
  );
};

// ============================================================================
// MAIN SPLIT EDITOR COMPONENT
// ============================================================================

export const SplitEditor: React.FC<SplitEditorProps> = ({
  groups,
  activeGroupId,
  onTabClick,
  onTabClose,
  onTabPin,
  onTabMove,
  onGroupFocus,
  onGroupClose,
  onSplit,
  renderEditor,
  splitDirection = 'horizontal',
}) => {
  const [groupSizes, setGroupSizes] = useState<number[]>(() =>
    groups.map(() => 100 / groups.length)
  );

  // Update sizes when groups change
  useEffect(() => {
    setGroupSizes((prev) => {
      if (groups.length === prev.length) return prev;
      return groups.map(() => 100 / groups.length);
    });
  }, [groups]);

  const handleResize = useCallback((index: number, delta: number) => {
    setGroupSizes(prev => {
      const containerSize = splitDirection === 'horizontal'
        ? window.innerWidth
        : window.innerHeight;
      const deltaPercent = (delta / containerSize) * 100;

      const newSizes = [...prev];
      const minSize = 10; // 10% minimum

      // Adjust current and next group
      const newSize1 = newSizes[index] + deltaPercent;
      const newSize2 = newSizes[index + 1] - deltaPercent;

      if (newSize1 >= minSize && newSize2 >= minSize) {
        newSizes[index] = newSize1;
        newSizes[index + 1] = newSize2;
      }

      return newSizes;
    });
  }, [splitDirection]);

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-quaternary)]">
        <div className="text-center">
          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No editors open</p>
          <p className="text-sm">Abra um arquivo para comecar a editar</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        flex h-full w-full
        ${splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'}
      `}
    >
      {groups.map((group, index) => (
        <React.Fragment key={group.id}>
          <div
            style={{
              [splitDirection === 'horizontal' ? 'width' : 'height']: `${groupSizes[index]}%`,
            }}
            className="min-w-0 min-h-0 overflow-hidden"
          >
            <EditorGroupView
              group={group}
              isActiveGroup={group.id === activeGroupId}
              onTabClick={(tabId) => onTabClick(tabId, group.id)}
              onTabClose={(tabId) => onTabClose(tabId, group.id)}
              onTabPin={(tabId) => onTabPin(tabId, group.id)}
              onTabMove={(tabId, fromGroupId, targetIndex) =>
                onTabMove(tabId, fromGroupId, group.id, targetIndex)
              }
              onGroupFocus={() => onGroupFocus(group.id)}
              onSplit={(dir) => onSplit(group.id, dir)}
              onGroupClose={() => onGroupClose(group.id)}
              canClose={groups.length > 1}
              renderEditor={(tab) => renderEditor(group.id, tab)}
            />
          </div>

          {/* Divider between groups */}
          {index < groups.length - 1 && (
            <ResizableDivider
              direction={splitDirection}
              onResize={(delta) => handleResize(index, delta)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default SplitEditor;
