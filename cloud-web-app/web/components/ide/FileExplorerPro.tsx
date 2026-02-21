'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Codicon, { type CodiconName } from './Codicon'

// ============= Types =============

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  modified?: boolean
  isNew?: boolean
  extension?: string
}

interface FileExplorerProps {
  files?: FileNode[]
  isLoading?: boolean
  error?: string | null
  onFileSelect?: (file: FileNode) => void
  onFileCreate?: (parentPath: string, type: 'file' | 'folder') => void
  onFileDelete?: (file: FileNode) => void
  onFileRename?: (file: FileNode, newName?: string) => void
  onRefresh?: () => void
  workspaceName?: string
  className?: string
}

// ============= File Icon Helper =============

const FILE_ICONS: Record<string, { icon: CodiconName; color: string }> = {
  ts: { icon: 'symbol-file', color: 'text-slate-300' },
  tsx: { icon: 'symbol-file', color: 'text-slate-300' },
  js: { icon: 'symbol-file', color: 'text-slate-300' },
  jsx: { icon: 'symbol-file', color: 'text-slate-300' },
  json: { icon: 'symbol-number', color: 'text-slate-400' },
  md: { icon: 'symbol-file', color: 'text-slate-400' },
  css: { icon: 'symbol-color', color: 'text-slate-400' },
  scss: { icon: 'symbol-color', color: 'text-slate-400' },
  html: { icon: 'symbol-file', color: 'text-slate-300' },
  png: { icon: 'symbol-file', color: 'text-slate-400' },
  jpg: { icon: 'symbol-file', color: 'text-slate-400' },
  svg: { icon: 'symbol-file', color: 'text-slate-400' },
  package: { icon: 'extensions', color: 'text-slate-400' },
  config: { icon: 'gear', color: 'text-slate-400' },
}

const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId'

function resolveProjectIdFromClient(): string {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('projectId')
  if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  const fromStorage = localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY)
  if (fromStorage && fromStorage.trim()) return fromStorage.trim()
  return 'default'
}

function getFileIcon(name: string, isOpen = false) {
  if (name === 'package.json') return FILE_ICONS.package
  if (name.includes('config')) return FILE_ICONS.config
  
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || { icon: 'symbol-file' as CodiconName, color: 'text-slate-400' }
}

// ============= Workspace Tree =============

type WorkspaceTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: WorkspaceTreeNode[]
}

function mapWorkspaceNode(node: WorkspaceTreeNode): FileNode {
  const extension = node.type === 'file' ? node.name.split('.').pop()?.toLowerCase() : undefined
  return {
    id: node.path,
    name: node.name,
    type: node.type === 'directory' ? 'folder' : 'file',
    path: node.path,
    extension,
    children: node.children?.map(mapWorkspaceNode),
  }
}

// ============= File Tree Node Component =============

interface FileTreeNodeProps {
  node: FileNode
  depth: number
  selectedFile: string | null
  expandedFolders: Set<string>
  forceExpanded?: boolean
  onSelect: (file: FileNode) => void
  onToggle: (folderId: string) => void
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void
}

function FileTreeNode({
  node,
  depth,
  selectedFile,
  expandedFolders,
  forceExpanded = false,
  onSelect,
  onToggle,
  onContextMenu,
}: FileTreeNodeProps) {
  const isFolder = node.type === 'folder'
  const isExpanded = forceExpanded || expandedFolders.has(node.id)
  const isSelected = selectedFile === node.id
  const fileIcon = getFileIcon(node.name, isExpanded)
  const nodeIcon = isFolder
    ? (isExpanded ? 'folder-opened' : 'folder')
    : fileIcon.icon

  return (
    <>
      <button
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        aria-expanded={isFolder ? isExpanded : undefined}
        aria-selected={isSelected}
        role="treeitem"
        className={`
          w-full density-row flex items-center gap-1.5 px-2 text-xs text-left
          hover:bg-white/5 active:bg-white/10 transition-colors
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500
          ${isSelected ? 'bg-slate-800 text-white' : 'text-slate-300'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {isFolder && (
          <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500">
            {isExpanded ? (
              <Codicon name="chevron-down" />
            ) : (
              <Codicon name="chevron-right" />
            )}
          </span>
        )}
        
        {/* File/Folder icon */}
        <Codicon name={nodeIcon} className={`${isFolder ? 'text-slate-300' : fileIcon.color}`} />
        
        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>
        
        {/* Modified indicator */}
        {node.modified && (
          <span className="w-2 h-2 bg-amber-400 rounded-full" title="Modified" />
        )}
      </button>

      {/* Children */}
      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              forceExpanded={forceExpanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ============= Context Menu =============

interface ContextMenuProps {
  x: number
  y: number
  file: FileNode
  onClose: () => void
  onAction: (action: string) => void
}

function ContextMenu({ x, y, file, onClose, onAction }: ContextMenuProps) {
  const isFolder = file.type === 'folder'
  
  const menuItems = [
    ...(isFolder ? [
      { id: 'new-file', label: 'New File', icon: 'new-file' as CodiconName },
      { id: 'new-folder', label: 'New Folder', icon: 'new-folder' as CodiconName },
      { id: 'divider-1', divider: true },
    ] : []),
    { id: 'rename', label: 'Rename', icon: 'edit' as CodiconName },
    { id: 'delete', label: 'Delete', icon: 'trash' as CodiconName, danger: true },
  ]

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div
        className="fixed z-50 min-w-48 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
        style={{ left: x, top: y }}
        role="menu"
        aria-label={`File actions for ${file.name}`}
      >
        {menuItems.map((item, i) => (
          item.divider ? (
            <div key={`divider-${i}`} className="my-1 border-t border-slate-700" />
          ) : (
            <button
              key={item.id}
              onClick={() => {
                onAction(item.id!)
                onClose()
              }}
              role="menuitem"
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-xs
                ${item.danger ? 'text-red-400 hover:bg-red-500/20' : 'text-slate-300 hover:bg-slate-700'}
              `}
            >
              {item.icon && <Codicon name={item.icon} />}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          )
        ))}
      </div>
    </>
  )
}

// ============= Main Component =============

export default function FileExplorerPro({
  files,
  isLoading: externalLoading = false,
  error: externalError = null,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onRefresh,
  workspaceName = 'aethel-engine',
  className = '',
}: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [internalFiles, setInternalFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    file: FileNode
  } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const usingExternalFiles = Array.isArray(files)
  const resolvedFiles = files ?? internalFiles
  const effectiveLoading = usingExternalFiles ? externalLoading : isLoading
  const effectiveError = usingExternalFiles ? externalError : loadError

  const fetchWorkspaceTree = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const projectId = resolveProjectIdFromClient()
      const res = await fetch('/api/files/tree', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': projectId,
        },
        body: JSON.stringify({ path: '/', maxDepth: 6, projectId }),
      })
      if (!res.ok) throw new Error('Failed to load workspace tree.')
      const data = await res.json()
      const tree = Array.isArray(data?.children)
        ? data.children
        : Array.isArray(data?.tree)
          ? data.tree
          : []
      const mapped = tree.map(mapWorkspaceNode)
      setInternalFiles(mapped)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load files.')
      setInternalFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!files) {
      fetchWorkspaceTree()
    }
  }, [files, fetchWorkspaceTree])

  useEffect(() => {
    if (!showSearch) return
    searchInputRef.current?.focus()
  }, [showSearch])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const withinExplorer =
        containerRef.current &&
        event.target instanceof Node &&
        containerRef.current.contains(event.target)

      if (event.key === 'Escape') {
        if (contextMenu) {
          event.preventDefault()
          setContextMenu(null)
          return
        }
        if (showSearch && withinExplorer) {
          event.preventDefault()
          if (searchQuery.trim()) {
            setSearchQuery('')
          } else {
            setShowSearch(false)
          }
        }
        return
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.key.toLowerCase() === 'f') {
        if (!withinExplorer) return
        event.preventDefault()
        setShowSearch(true)
        requestAnimationFrame(() => searchInputRef.current?.focus())
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [showSearch, searchQuery, contextMenu])

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  // Handle file selection
  const handleSelect = useCallback((file: FileNode) => {
    setSelectedFile(file.id)
    onFileSelect?.(file)
  }, [onFileSelect])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, file: FileNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, file })
  }, [])

  // Handle context menu action
  const handleAction = useCallback((action: string) => {
    if (!contextMenu) return
    
    switch (action) {
      case 'delete':
        onFileDelete?.(contextMenu.file)
        break
      case 'rename':
        onFileRename?.(contextMenu.file)
        break
      case 'new-file':
        onFileCreate?.(contextMenu.file.path, 'file')
        break
      case 'new-folder':
        onFileCreate?.(contextMenu.file.path, 'folder')
        break
    }
  }, [contextMenu, onFileDelete, onFileCreate, onFileRename])

  const handleRefresh = useCallback(() => {
    if (onRefresh) return onRefresh()
    if (!files) {
      return fetchWorkspaceTree()
    }
  }, [onRefresh, files, fetchWorkspaceTree])

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return resolvedFiles
    
    const filterNode = (node: FileNode): FileNode | null => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? node : null
      }
      
      const filteredChildren = node.children
        ?.map(child => filterNode(child))
        .filter((child): child is FileNode => child !== null)
      
      if (filteredChildren && filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }
      
      return node.name.toLowerCase().includes(searchQuery.toLowerCase()) ? node : null
    }
    
    return resolvedFiles
      .map(f => filterNode(f))
      .filter((f): f is FileNode => f !== null)
  }, [resolvedFiles, searchQuery])

  return (
    <div
      ref={containerRef}
      className={`h-full flex flex-col ${className}`}
      tabIndex={0}
      aria-label="File explorer"
    >
      {/* Header */}
      <div className="density-header flex items-center justify-between px-2 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
          {workspaceName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${showSearch ? 'text-blue-300' : 'text-slate-400'}`}
            title="Search Files"
            aria-label="Search files"
            aria-pressed={showSearch}
          >
            <Codicon name="search" />
          </button>
          <button
            onClick={() => onFileCreate?.('/', 'file')}
            className="p-1 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 text-slate-400"
            title="New File"
            aria-label="Create new file"
          >
            <Codicon name="new-file" />
          </button>
          <button
            onClick={() => onFileCreate?.('/', 'folder')}
            className="p-1 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 text-slate-400"
            title="New Folder"
            aria-label="Create new folder"
          >
            <Codicon name="new-folder" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 text-slate-400"
            title="Refresh"
            aria-label="Refresh file tree"
          >
            <Codicon name="refresh" />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-2 py-2 border-b border-slate-800">
          <div className="relative">
            <Codicon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              aria-label="Search files in workspace"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                aria-label="Clear search"
                title="Clear search"
              >
                <Codicon name="x" />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* File Tree */}
      <div
        className="flex-1 overflow-y-auto py-1"
        role="tree"
        aria-label="Workspace files"
        aria-busy={effectiveLoading}
      >
        {effectiveError && (
          <div className="px-3 py-2 text-xs text-red-400" role="alert">
            <div className="flex items-center justify-between gap-2">
              <span>{effectiveError}</span>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700/80"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {effectiveLoading && !effectiveError && (
          <div className="px-3 py-2 text-xs text-slate-500 space-y-1.5">
            <div className="h-3 rounded bg-slate-800/80 aethel-shimmer" />
            <div className="h-3 rounded bg-slate-800/70 aethel-shimmer" />
            <div className="h-3 rounded bg-slate-800/60 aethel-shimmer" />
          </div>
        )}
        {filteredFiles.map(node => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            forceExpanded={Boolean(searchQuery)}
            onSelect={handleSelect}
            onToggle={toggleFolder}
            onContextMenu={handleContextMenu}
          />
        ))}
        
        {filteredFiles.length === 0 && searchQuery && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No files matching {`"${searchQuery}"`}
          </div>
        )}
        {filteredFiles.length === 0 && !searchQuery && !effectiveLoading && !effectiveError && (
          <div className="h-full flex items-center justify-center px-4 text-center">
            <div className="max-w-xs">
              <div className="text-xs font-medium text-slate-300 mb-1">Workspace is empty</div>
              <div className="text-[11px] text-slate-500 mb-3">
                Create a file or folder to start editing in this project.
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => onFileCreate?.('/', 'file')}
                  className="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800/70 text-[11px] text-slate-200 hover:bg-slate-700/80"
                >
                  New File
                </button>
                <button
                  onClick={() => onFileCreate?.('/', 'folder')}
                  className="px-2.5 py-1.5 rounded border border-slate-700 bg-slate-800/70 text-[11px] text-slate-200 hover:bg-slate-700/80"
                >
                  New Folder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          onAction={handleAction}
        />
      )}
    </div>
  )
}


