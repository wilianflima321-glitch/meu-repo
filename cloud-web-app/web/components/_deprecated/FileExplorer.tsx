'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

export default function FileExplorer() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFileStructure();
  }, []);

  const fetchFileStructure = async () => {
    try {
      setErrorMessage(null);
      const response = await fetch('/api/workspace/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/workspace' })
      });
      if (!response.ok) {
        throw new Error(`Workspace tree request failed (${response.status})`);
      }
      const data = await response.json();
      const tree = Array.isArray(data?.tree) ? data.tree : [];
      // Adapt shape to this component
      const adapt = (nodes: any[]): FileNode[] =>
        nodes.map((n) => ({
          name: String(n.name ?? ''),
          type: n.type === 'directory' ? 'folder' : 'file',
          path: String(n.path ?? ''),
          expanded: Boolean(n.expanded),
          children: Array.isArray(n.children) ? adapt(n.children) : undefined,
        }));
      setFiles(adapt(tree));
    } catch (error) {
      console.error('Failed to fetch file structure:', error);
      setFiles([]);
      setErrorMessage('Explorer indisponível. Verifique o endpoint /api/workspace/tree.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.type === 'folder') {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setFiles(updateNode(files));
  };

  const renderNode = (node: FileNode, depth: number = 0) => {
    const indent = { paddingLeft: `${depth * 16 + 8}px` };

    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className="aethel-file-tree-item aethel-cursor-pointer"
          style={indent}
          onClick={() => console.log('Open file:', node.path)}
        >
          <DocumentIcon className="aethel-file-tree-icon text-slate-400" />
          <span className="text-sm truncate">{node.name}</span>
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className="aethel-file-tree-item aethel-cursor-pointer"
          style={indent}
          onClick={() => toggleFolder(node.path)}
        >
          {node.expanded ? (
            <ChevronDownIcon className="aethel-file-tree-icon text-slate-400" />
          ) : (
            <ChevronRightIcon className="aethel-file-tree-icon text-slate-400" />
          )}
          <FolderIcon className={`aethel-file-tree-icon ${
            node.expanded ? 'text-emerald-400' : 'text-slate-400'
          }`} />
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {node.expanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="aethel-panel aethel-flex aethel-items-center aethel-justify-center aethel-p-8">
      <div className="aethel-flex aethel-flex-col aethel-items-center aethel-gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-slate-400">Loading file structure...</span>
      </div>
    </div>
  );

  return (
    <div className="aethel-panel h-full">
      <div className="aethel-panel-header aethel-flex aethel-items-center aethel-justify-between">
        <div className="aethel-flex aethel-items-center aethel-gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded aethel-flex aethel-items-center aethel-justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 5a2 2 0 012-2h4a2 2 0 012 2v0" />
            </svg>
          </div>
          <h3 className="font-semibold">Explorer</h3>
        </div>
        <div className="aethel-flex aethel-items-center aethel-gap-2">
          <button className="aethel-button aethel-button-ghost aethel-p-2" title="New File">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button className="aethel-button aethel-button-ghost aethel-p-2" title="New Folder">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button className="aethel-button aethel-button-ghost aethel-p-2" title="Refresh">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V9a8 8 0 1115.356 2m-15.356 0H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="aethel-panel-content aethel-p-0">
        <div className="aethel-file-tree">
          {errorMessage ? (
            <div className="aethel-p-4 aethel-text-sm aethel-text-slate-400">{errorMessage}</div>
          ) : (
            files.map(node => renderNode(node))
          )}
        </div>
      </div>
    </div>
  );
}
