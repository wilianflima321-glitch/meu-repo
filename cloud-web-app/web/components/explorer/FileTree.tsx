/**
 * File Tree Component
 * Displays file system tree with drag & drop support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFileExplorerManager, FileNode } from '../../lib/explorer/file-explorer-manager';
import { getThemeManager } from '../../lib/themes/theme-manager';

interface FileTreeProps {
  onFileSelect?: (path: string) => void;
  onFileOpen?: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, onFileOpen }) => {
  const [root, setRoot] = useState<FileNode | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [draggedPath, setDraggedPath] = useState<string | null>(null);

  const explorerManager = getFileExplorerManager();
  const themeManager = getThemeManager();

  // Load file tree
  useEffect(() => {
    const loadTree = async () => {
      const rootNode = explorerManager.getRoot();
      setRoot(rootNode);
    };

    loadTree();
  }, [explorerManager]);

  // Handle file click
  const handleFileClick = useCallback((path: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      const newSelection = new Set(selectedPaths);
      if (newSelection.has(path)) {
        newSelection.delete(path);
      } else {
        newSelection.add(path);
      }
      setSelectedPaths(newSelection);
      explorerManager.select(path, true);
    } else {
      // Single select
      setSelectedPaths(new Set([path]));
      explorerManager.select(path, false);
    }

    onFileSelect?.(path);
  }, [selectedPaths, explorerManager, onFileSelect]);

  // Handle file double click
  const handleFileDoubleClick = useCallback((path: string) => {
    onFileOpen?.(path);
  }, [onFileOpen]);

  // Handle directory toggle
  const handleDirectoryToggle = useCallback(async (path: string, node: FileNode) => {
    if (node.expanded) {
      explorerManager.collapse(path);
    } else {
      await explorerManager.expand(path);
    }
    setRoot(explorerManager.getRoot());
  }, [explorerManager]);

  // Handle context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, path: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, path });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: React.DragEvent, path: string) => {
    setDraggedPath(path);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', path);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const handleDrop = useCallback(async (event: React.DragEvent, targetPath: string) => {
    event.preventDefault();
    
    if (!draggedPath) return;

    try {
      await explorerManager.moveFiles([draggedPath], targetPath);
      setRoot(explorerManager.getRoot());
    } catch (error) {
      console.error('Move failed:', error);
    }

    setDraggedPath(null);
  }, [draggedPath, explorerManager]);

  // Render file node
  const renderNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isSelected = selectedPaths.has(node.path);
    const icon = node.type === 'directory' 
      ? themeManager.getFolderIcon(node.expanded)
      : themeManager.getFileIcon(node.name);

    return (
      <div key={node.path}>
        <div
          className={`file-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => handleFileClick(node.path, e)}
          onDoubleClick={() => node.type === 'file' && handleFileDoubleClick(node.path)}
          onContextMenu={(e) => handleContextMenu(e, node.path)}
          draggable
          onDragStart={(e) => handleDragStart(e, node.path)}
          onDragOver={handleDragOver}
          onDrop={(e) => node.type === 'directory' && handleDrop(e, node.path)}
        >
          {node.type === 'directory' && (
            <span
              className="expand-icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDirectoryToggle(node.path, node);
              }}
            >
              {node.expanded ? '▼' : '▶'}
            </span>
          )}
          <span className="file-icon">{icon}</span>
          <span className="file-name">{node.name}</span>
        </div>

        {node.type === 'directory' && node.expanded && node.children && (
          <div className="children">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree">
      {root ? renderNode(root) : <div className="loading">Loading...</div>}

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          path={contextMenu.path}
          onClose={() => setContextMenu(null)}
          onAction={() => {
            setContextMenu(null);
            setRoot(explorerManager.getRoot());
          }}
        />
      )}

      <style jsx>{`
        .file-tree {
          height: 100%;
          overflow-y: auto;
          user-select: none;
        }

        .file-node {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .file-node:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .file-node.selected {
          background: var(--editor-selectionBackground);
        }

        .expand-icon {
          width: 16px;
          font-size: 10px;
          margin-right: 4px;
          cursor: pointer;
        }

        .file-icon {
          margin-right: 6px;
        }

        .file-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .loading {
          padding: 16px;
          text-align: center;
          color: var(--sidebar-fg);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

// Context Menu Component
interface FileContextMenuProps {
  x: number;
  y: number;
  path: string;
  onClose: () => void;
  onAction: () => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({ x, y, path, onClose, onAction }) => {
  const explorerManager = getFileExplorerManager();

  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  const handleCopy = () => {
    explorerManager.copy([path]);
    onAction();
  };

  const handleCut = () => {
    explorerManager.cut([path]);
    onAction();
  };

  const handlePaste = async () => {
    try {
      await explorerManager.paste(path);
      onAction();
    } catch (error) {
      console.error('Paste failed:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${path}?`)) {
      try {
        await explorerManager.deleteFiles([path]);
        onAction();
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleRename = () => {
    const newName = prompt('New name:', path.split('/').pop());
    if (newName) {
      explorerManager.renameFile(path, newName);
      onAction();
    }
  };

  return (
    <div className="context-menu" style={{ left: x, top: y }}>
      <div className="menu-item" onClick={handleCopy}>Copy</div>
      <div className="menu-item" onClick={handleCut}>Cut</div>
      <div className="menu-item" onClick={handlePaste}>Paste</div>
      <div className="menu-separator" />
      <div className="menu-item" onClick={handleRename}>Rename</div>
      <div className="menu-item danger" onClick={handleDelete}>Delete</div>

      <style jsx>{`
        .context-menu {
          position: fixed;
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          min-width: 150px;
        }

        .menu-item {
          padding: 8px 16px;
          cursor: pointer;
          font-size: 13px;
        }

        .menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-item.danger {
          color: #f14c4c;
        }

        .menu-separator {
          height: 1px;
          background: var(--panel-border);
          margin: 4px 0;
        }
      `}</style>
    </div>
  );
};
