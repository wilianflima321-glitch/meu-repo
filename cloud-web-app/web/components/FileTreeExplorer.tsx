'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
  size?: number;
  modified?: Date;
}

export default function FileTreeExplorer() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadFileTree();
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const loadFileTree = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/workspace' })
      });
      const data = await response.json();
      setTree(data.tree || getMockTree());
    } catch (error) {
      console.error('Failed to load file tree:', error);
      setTree(getMockTree());
    } finally {
      setLoading(false);
    }
  };

  const getMockTree = (): FileNode[] => [
    {
      name: 'src',
      path: '/workspace/src',
      type: 'directory',
      expanded: true,
      children: [
        {
          name: 'components',
          path: '/workspace/src/components',
          type: 'directory',
          children: [
            { name: 'Button.tsx', path: '/workspace/src/components/Button.tsx', type: 'file', size: 1024 },
            { name: 'Input.tsx', path: '/workspace/src/components/Input.tsx', type: 'file', size: 2048 }
          ]
        },
        {
          name: 'utils',
          path: '/workspace/src/utils',
          type: 'directory',
          children: [
            { name: 'helpers.ts', path: '/workspace/src/utils/helpers.ts', type: 'file', size: 768 }
          ]
        },
        { name: 'index.ts', path: '/workspace/src/index.ts', type: 'file', size: 512 },
        { name: 'app.tsx', path: '/workspace/src/app.tsx', type: 'file', size: 3072 }
      ]
    },
    {
      name: 'tests',
      path: '/workspace/tests',
      type: 'directory',
      children: [
        { name: 'app.test.ts', path: '/workspace/tests/app.test.ts', type: 'file', size: 1536 }
      ]
    },
    { name: 'package.json', path: '/workspace/package.json', type: 'file', size: 2048 },
    { name: 'tsconfig.json', path: '/workspace/tsconfig.json', type: 'file', size: 512 },
    { name: 'README.md', path: '/workspace/README.md', type: 'file', size: 4096 },
    { name: '.gitignore', path: '/workspace/.gitignore', type: 'file', size: 256 }
  ];

  const toggleExpand = (node: FileNode) => {
    if (node.type !== 'directory') return;

    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, expanded: !n.expanded };
        }
        if (n.children) {
          return { ...n, children: updateTree(n.children) };
        }
        return n;
      });
    };

    setTree(updateTree(tree));
  };

  const handleFileClick = (node: FileNode) => {
    if (node.type === 'file') {
      setSelectedPath(node.path);
      router.push(`/editor?file=${encodeURIComponent(node.path)}`);
    } else {
      toggleExpand(node);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const getFileIcon = (node: FileNode): string => {
    if (node.type === 'directory') {
      return node.expanded ? '📂' : '📁';
    }

    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'ts': '📘', 'tsx': '⚛️', 'js': '📜', 'jsx': '⚛️',
      'json': '📋', 'md': '📝', 'css': '🎨', 'html': '🌐',
      'py': '🐍', 'go': '🐹', 'rs': '🦀', 'java': '☕',
      'cpp': '⚙️', 'c': '⚙️', 'php': '🐘', 'rb': '💎',
      'sh': '🔧', 'yml': '⚙️', 'yaml': '⚙️', 'xml': '📄',
      'svg': '🖼️', 'png': '🖼️', 'jpg': '🖼️', 'gif': '🖼️',
      'gitignore': '🚫', 'env': '🔐', 'lock': '🔒'
    };

    return iconMap[ext || ''] || iconMap[node.name] || '📄';
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <div
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors ${
            isSelected
              ? 'bg-purple-600 text-white'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <span className="text-lg flex-shrink-0">{getFileIcon(node)}</span>
          <span className="flex-1 truncate text-sm">{node.name}</span>
          {node.type === 'directory' && (
            <span className="text-xs text-slate-500">
              {node.children?.length || 0}
            </span>
          )}
        </div>

        {node.type === 'directory' && node.expanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleNewFile = async () => {
    if (!contextMenu) return;
    const fileName = prompt('Enter file name:');
    if (fileName) {
      // Create new file
      console.log('Create file:', fileName, 'in', contextMenu.node.path);
    }
    setContextMenu(null);
  };

  const handleNewFolder = async () => {
    if (!contextMenu) return;
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      // Create new folder
      console.log('Create folder:', folderName, 'in', contextMenu.node.path);
    }
    setContextMenu(null);
  };

  const handleRename = async () => {
    if (!contextMenu) return;
    const newName = prompt('Enter new name:', contextMenu.node.name);
    if (newName) {
      // Rename file/folder
      console.log('Rename:', contextMenu.node.path, 'to', newName);
    }
    setContextMenu(null);
  };

  const handleDelete = async () => {
    if (!contextMenu) return;
    if (confirm(`Delete ${contextMenu.node.name}?`)) {
      // Delete file/folder
      console.log('Delete:', contextMenu.node.path);
    }
    setContextMenu(null);
  };

  const handleCopy = () => {
    if (!contextMenu) return;
    navigator.clipboard.writeText(contextMenu.node.path);
    setContextMenu(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-sm uppercase text-slate-400">Explorer</h3>
        <div className="flex gap-1">
          <button
            onClick={handleNewFile}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="New File"
          >
            📄
          </button>
          <button
            onClick={handleNewFolder}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="New Folder"
          >
            📁
          </button>
          <button
            onClick={loadFileTree}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="overflow-y-auto h-[calc(100%-48px)]">
        {tree.map(node => renderNode(node))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleNewFile}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            📄 New File
          </button>
          <button
            onClick={handleNewFolder}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            📁 New Folder
          </button>
          <div className="border-t border-slate-700 my-1"></div>
          <button
            onClick={handleRename}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            ✏️ Rename
          </button>
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            📋 Copy Path
          </button>
          <div className="border-t border-slate-700 my-1"></div>
          <button
            onClick={handleDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/30 transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
