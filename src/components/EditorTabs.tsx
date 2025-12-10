import React, { useState, useRef, useEffect } from 'react';
import { EditorService } from '../services/EditorService';
import { EventBus } from '../services/EventBus';

interface Tab {
  id: string;
  path: string;
  name: string;
  isDirty: boolean;
  isPinned: boolean;
  isActive: boolean;
}

export const EditorTabs: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTabs = () => {
      const editorService = EditorService.getInstance();
      const editors = editorService.getOpenEditors();
      const activeEditor = editorService.getActiveEditor();

      const newTabs: Tab[] = editors.map(editor => ({
        id: editor.id,
        path: editor.filePath,
        name: editor.filePath.split('/').pop() || 'untitled',
        isDirty: editor.isDirty,
        isPinned: editor.isPinned || false,
        isActive: editor.id === activeEditor?.id
      }));

      setTabs(newTabs);
    };

    updateTabs();

    const unsubscribe = EventBus.getInstance().subscribe('editor:opened', updateTabs);
    const unsubscribe2 = EventBus.getInstance().subscribe('editor:closed', updateTabs);
    const unsubscribe3 = EventBus.getInstance().subscribe('editor:changed', updateTabs);
    const unsubscribe4 = EventBus.getInstance().subscribe('editor:saved', updateTabs);

    return () => {
      unsubscribe();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, []);

  const handleTabClick = (tabId: string) => {
    const editorService = EditorService.getInstance();
    editorService.setActiveEditor(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    const editorService = EditorService.getInstance();
    editorService.closeEditor(tabId);
  };

  const handleTabMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      handleTabClose(e, tabId);
    }
  };

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTab && draggedTab !== targetTabId) {
      const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
      const targetIndex = tabs.findIndex(t => t.id === targetTabId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newTabs = [...tabs];
        const [removed] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, removed);
        setTabs(newTabs);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
  };

  const handlePinTab = (tabId: string) => {
    const editorService = EditorService.getInstance();
    const editor = editorService.getEditor(tabId);
    if (editor) {
      editor.isPinned = !editor.isPinned;
      EventBus.getInstance().emit('editor:changed', { editorId: tabId });
    }
    setContextMenu(null);
  };

  const handleCloseOthers = (tabId: string) => {
    const editorService = EditorService.getInstance();
    const editors = editorService.getOpenEditors();
    editors.forEach(editor => {
      if (editor.id !== tabId && !editor.isPinned) {
        editorService.closeEditor(editor.id);
      }
    });
    setContextMenu(null);
  };

  const handleCloseToRight = (tabId: string) => {
    const editorService = EditorService.getInstance();
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      tabs.slice(tabIndex + 1).forEach(tab => {
        if (!tab.isPinned) {
          editorService.closeEditor(tab.id);
        }
      });
    }
    setContextMenu(null);
  };

  const handleCloseAll = () => {
    const editorService = EditorService.getInstance();
    const editors = editorService.getOpenEditors();
    editors.forEach(editor => {
      if (!editor.isPinned) {
        editorService.closeEditor(editor.id);
      }
    });
    setContextMenu(null);
  };

  const handleCopyPath = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      navigator.clipboard.writeText(tab.path);
    }
    setContextMenu(null);
  };

  const handleSplitEditor = (tabId: string, direction: 'horizontal' | 'vertical') => {
    const editorService = EditorService.getInstance();
    editorService.splitEditor(tabId, direction);
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  return (
    <div className="editor-tabs">
      <div className="tabs-container" ref={tabsContainerRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.isActive ? 'active' : ''} ${tab.isPinned ? 'pinned' : ''} ${draggedTab === tab.id ? 'dragging' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onMouseDown={(e) => handleTabMiddleClick(e, tab.id)}
            onContextMenu={(e) => handleTabContextMenu(e, tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragEnd={handleDragEnd}
          >
            {tab.isPinned && <span className="pin-icon">📌</span>}
            <span className="tab-name">{tab.name}</span>
            {tab.isDirty && <span className="dirty-indicator">●</span>}
            <button
              className="close-button"
              onClick={(e) => handleTabClose(e, tab.id)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="menu-item" onClick={() => handleTabClose({} as React.MouseEvent, contextMenu.tabId)}>
            Close
          </div>
          <div className="menu-item" onClick={() => handlePinTab(contextMenu.tabId)}>
            {tabs.find(t => t.id === contextMenu.tabId)?.isPinned ? 'Unpin' : 'Pin'}
          </div>
          <div className="menu-separator" />
          <div className="menu-item" onClick={() => handleCloseOthers(contextMenu.tabId)}>
            Close Others
          </div>
          <div className="menu-item" onClick={() => handleCloseToRight(contextMenu.tabId)}>
            Close to the Right
          </div>
          <div className="menu-item" onClick={() => handleCloseAll()}>
            Close All
          </div>
          <div className="menu-separator" />
          <div className="menu-item" onClick={() => handleSplitEditor(contextMenu.tabId, 'horizontal')}>
            Split Right
          </div>
          <div className="menu-item" onClick={() => handleSplitEditor(contextMenu.tabId, 'vertical')}>
            Split Down
          </div>
          <div className="menu-separator" />
          <div className="menu-item" onClick={() => handleCopyPath(contextMenu.tabId)}>
            Copy Path
          </div>
        </div>
      )}

      <style jsx>{`
        .editor-tabs {
          display: flex;
          background: var(--vscode-editorGroupHeader-tabsBackground);
          border-bottom: 1px solid var(--vscode-editorGroupHeader-tabsBorder);
          height: 35px;
          overflow: hidden;
        }

        .tabs-container {
          display: flex;
          flex: 1;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .tabs-container::-webkit-scrollbar {
          height: 0;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          min-width: 120px;
          max-width: 200px;
          background: var(--vscode-tab-inactiveBackground);
          color: var(--vscode-tab-inactiveForeground);
          border-right: 1px solid var(--vscode-tab-border);
          cursor: pointer;
          user-select: none;
          transition: background 0.1s;
        }

        .tab:hover {
          background: var(--vscode-tab-hoverBackground);
        }

        .tab.active {
          background: var(--vscode-tab-activeBackground);
          color: var(--vscode-tab-activeForeground);
          border-bottom: 2px solid var(--vscode-tab-activeBorder);
        }

        .tab.pinned {
          min-width: 80px;
        }

        .tab.dragging {
          opacity: 0.5;
        }

        .pin-icon {
          font-size: 10px;
        }

        .tab-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .dirty-indicator {
          color: var(--vscode-tab-activeForeground);
          font-size: 16px;
          line-height: 1;
        }

        .close-button {
          display: none;
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          line-height: 1;
          padding: 0;
          width: 20px;
          height: 20px;
          cursor: pointer;
          border-radius: 3px;
        }

        .tab:hover .close-button {
          display: block;
        }

        .close-button:hover {
          background: var(--vscode-toolbar-hoverBackground);
        }

        .context-menu {
          position: fixed;
          background: var(--vscode-menu-background);
          border: 1px solid var(--vscode-menu-border);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          min-width: 200px;
          padding: 4px 0;
        }

        .menu-item {
          padding: 6px 20px;
          cursor: pointer;
          font-size: 13px;
          color: var(--vscode-menu-foreground);
        }

        .menu-item:hover {
          background: var(--vscode-menu-selectionBackground);
          color: var(--vscode-menu-selectionForeground);
        }

        .menu-separator {
          height: 1px;
          background: var(--vscode-menu-separatorBackground);
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
};
