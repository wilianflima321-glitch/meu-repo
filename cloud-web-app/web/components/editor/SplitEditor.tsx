/**
 * Aethel IDE - Split Editor Component
 * 
 * Componente profissional para split editor como VS Code.
 * Suporta múltiplos grupos de editores, drag & drop de tabs,
 * e redimensionamento de painéis.
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
      ts: 'text-blue-400',
      tsx: 'text-blue-400',
      js: 'text-yellow-400',
      jsx: 'text-yellow-400',
      py: 'text-green-400',
      rs: 'text-orange-400',
      go: 'text-cyan-400',
      java: 'text-red-400',
      css: 'text-purple-400',
      html: 'text-orange-500',
      json: 'text-yellow-500',
      md: 'text-gray-400',
    };
    
    return <FileCode size={14} className={iconColors[ext || ''] || 'text-gray-400'} />;
  };
  
  return (
    <div
      className={`
        group relative flex items-center gap-1.5 h-9 px-3 cursor-pointer
        border-r border-[#252526] select-none
        ${isActive 
          ? 'bg-[#1e1e1e] text-white border-t-2 border-t-blue-500' 
          : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#323232]'
        }
        ${tab.preview ? 'italic' : ''}
        ${tab.pinned ? 'bg-[#2a2a2a]' : ''}
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
        <Pin size={10} className="text-gray-500 flex-shrink-0" />
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
        <Circle size={8} className="flex-shrink-0 fill-current text-white" />
      )}
      
      {/* Close button */}
      <button
        className={`
          flex-shrink-0 p-0.5 rounded hover:bg-white/10
          ${isActive || tab.dirty ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          transition-opacity
        `}
        onClick={(e) => {
          e.stopPropagation();
          onTabClose();
        }}
        aria-label={`Close ${tab.title}`}
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
          className="absolute top-full left-0 mt-1 w-48 bg-[#252526] border border-[#3c3c3c]
                     rounded-md shadow-xl z-50 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => { onTabClose(); setShowMenu(false); }}
          >
            Close
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => setShowMenu(false)}
          >
            Close Others
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => setShowMenu(false)}
          >
            Close All
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => setShowMenu(false)}
          >
            Close to the Right
          </button>
          <div className="border-t border-[#3c3c3c] my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5 flex items-center gap-2"
            onClick={() => { onTabPin(); setShowMenu(false); }}
          >
            {tab.pinned ? <PinOff size={14} /> : <Pin size={14} />}
            {tab.pinned ? 'Unpin' : 'Pin'}
          </button>
          <div className="border-t border-[#3c3c3c] my-1" />
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => setShowMenu(false)}
          >
            Copy Path
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
            onClick={() => setShowMenu(false)}
          >
            Copy Relative Path
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-white/5"
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
        flex items-center h-9 bg-[#252526] border-b 
        ${isActiveGroup ? 'border-b-[#1e1e1e]' : 'border-b-[#3c3c3c]'}
      `}
      onClick={onGroupFocus}
      role="tablist"
    >
      {/* Tabs */}
      <div 
        ref={tabsContainerRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-hidden
                   scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent"
        onDragLeave={handleDragLeave}
      >
        {sortedTabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            {/* Drop indicator */}
            {dragOverIndex === index && (
              <div className="w-0.5 h-full bg-blue-500" />
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
            <div className="w-0.5 h-full bg-blue-500" />
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-0.5 px-1 border-l border-[#3c3c3c]">
        <button
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          onClick={() => onSplit('horizontal')}
          title="Split Editor Right"
          aria-label="Split editor right"
        >
          <SplitSquareHorizontal size={14} className="text-gray-400" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          onClick={() => onSplit('vertical')}
          title="Split Editor Down"
          aria-label="Split editor down"
        >
          <SplitSquareVertical size={14} className="text-gray-400" />
        </button>
        {canClose && (
          <button
            className="p-1.5 rounded hover:bg-white/10 transition-colors"
            onClick={onGroupClose}
            title="Close Editor Group"
            aria-label="Close editor group"
          >
            <X size={14} className="text-gray-400" />
          </button>
        )}
        <button
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          title="More Actions"
          aria-label="More actions"
        >
          <MoreHorizontal size={14} className="text-gray-400" />
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
        ${isActiveGroup ? 'ring-1 ring-blue-500/30' : ''}
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
        <div className="flex items-center gap-1 h-6 px-3 bg-[#1e1e1e] border-b border-[#3c3c3c] text-xs text-gray-400">
          {activeTab.path.split(/[/\\]/).map((part, i, arr) => (
            <React.Fragment key={i}>
              <span className="hover:text-gray-200 cursor-pointer">{part}</span>
              {i < arr.length - 1 && <ChevronRight size={12} />}
            </React.Fragment>
          ))}
        </div>
      )}
      
      {/* Editor Content */}
      <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
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
          ? 'w-1 cursor-col-resize hover:bg-blue-500/50' 
          : 'h-1 cursor-row-resize hover:bg-blue-500/50'
        }
        ${isDragging ? 'bg-blue-500' : 'bg-[#3c3c3c]'}
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
    if (groups.length !== groupSizes.length) {
      setGroupSizes(groups.map(() => 100 / groups.length));
    }
  }, [groups.length, groupSizes.length]);
  
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
      <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-500">
        <div className="text-center">
          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No editors open</p>
          <p className="text-sm">Open a file to start editing</p>
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
