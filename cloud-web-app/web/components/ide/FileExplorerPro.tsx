'use client'

import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Search,
  FileCode,
  FileJson,
  FileType,
  FileImage,
  Package,
  Settings,
  Trash2,
  Edit,
  Copy,
  Scissors,
  Clipboard,
  Download,
  Upload,
  FolderPlus,
  FilePlus,
} from 'lucide-react'

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
  onFileSelect?: (file: FileNode) => void
  onFileCreate?: (parentPath: string, type: 'file' | 'folder') => void
  onFileDelete?: (file: FileNode) => void
  onFileRename?: (file: FileNode, newName: string) => void
  onRefresh?: () => void
  workspaceName?: string
  className?: string
}

// ============= File Icon Helper =============

const FILE_ICONS: Record<string, { icon: typeof File; color: string }> = {
  ts: { icon: FileCode, color: 'text-blue-400' },
  tsx: { icon: FileCode, color: 'text-blue-400' },
  js: { icon: FileCode, color: 'text-yellow-400' },
  jsx: { icon: FileCode, color: 'text-yellow-400' },
  json: { icon: FileJson, color: 'text-amber-400' },
  md: { icon: FileType, color: 'text-slate-400' },
  css: { icon: FileCode, color: 'text-purple-400' },
  scss: { icon: FileCode, color: 'text-pink-400' },
  html: { icon: FileCode, color: 'text-orange-400' },
  png: { icon: FileImage, color: 'text-green-400' },
  jpg: { icon: FileImage, color: 'text-green-400' },
  svg: { icon: FileImage, color: 'text-amber-400' },
  package: { icon: Package, color: 'text-red-400' },
  config: { icon: Settings, color: 'text-slate-400' },
}

function getFileIcon(name: string, isOpen = false) {
  if (name === 'package.json') return FILE_ICONS.package
  if (name.includes('config')) return FILE_ICONS.config
  
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || { icon: File, color: 'text-slate-400' }
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
  onSelect: (file: FileNode) => void
  onToggle: (folderId: string) => void
  onContextMenu: (e: React.MouseEvent, file: FileNode) => void
}

function FileTreeNode({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onSelect,
  onToggle,
  onContextMenu,
}: FileTreeNodeProps) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedFolders.has(node.id)
  const isSelected = selectedFile === node.id
  const fileIcon = getFileIcon(node.name, isExpanded)
  const IconComponent = isFolder 
    ? (isExpanded ? FolderOpen : Folder)
    : fileIcon.icon

  return (
    <>
      <button
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        className={`
          w-full flex items-center gap-1.5 py-1 px-2 text-sm text-left
          hover:bg-slate-800/50 transition-colors
          ${isSelected ? 'bg-slate-800 text-white' : 'text-slate-300'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {isFolder && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        )}
        
        {/* File/Folder icon */}
        <IconComponent className={`w-4 h-4 ${isFolder ? 'text-amber-400' : fileIcon.color}`} />
        
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
      { id: 'new-file', label: 'New File', icon: FilePlus },
      { id: 'new-folder', label: 'New Folder', icon: FolderPlus },
      { id: 'divider-1', divider: true },
    ] : []),
    { id: 'rename', label: 'Rename', icon: Edit },
    { id: 'duplicate', label: 'Duplicate', icon: Copy },
    { id: 'divider-2', divider: true },
    { id: 'cut', label: 'Cut', icon: Scissors, shortcut: '⌘X' },
    { id: 'copy', label: 'Copy', icon: Copy, shortcut: '⌘C' },
    { id: 'paste', label: 'Paste', icon: Clipboard, shortcut: '⌘V' },
    { id: 'divider-3', divider: true },
    { id: 'delete', label: 'Delete', icon: Trash2, danger: true },
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
              className={`
                w-full flex items-center gap-2 px-3 py-1.5 text-sm
                ${item.danger ? 'text-red-400 hover:bg-red-500/20' : 'text-slate-300 hover:bg-slate-700'}
              `}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              <span className="flex-1 text-left">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-slate-500">{item.shortcut}</span>
              )}
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

  const resolvedFiles = files ?? internalFiles

  const fetchWorkspaceTree = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      const res = await fetch('/api/workspace/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Falha ao carregar workspace')
      const data = await res.json()
      const tree = Array.isArray(data?.tree) ? data.tree : []
      const mapped = tree.map(mapWorkspaceNode)
      setInternalFiles(mapped)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar arquivos')
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
        // Would show rename modal
        break
      case 'new-file':
        onFileCreate?.(contextMenu.file.path, 'file')
        break
      case 'new-folder':
        onFileCreate?.(contextMenu.file.path, 'folder')
        break
    }
  }, [contextMenu, onFileDelete, onFileCreate])

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
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">
          {workspaceName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-1 rounded hover:bg-slate-800 ${showSearch ? 'text-indigo-400' : 'text-slate-400'}`}
            title="Search Files"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFileCreate?.('/', 'file')}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="New File"
          >
            <FilePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onFileCreate?.('/', 'folder')}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-2 py-2 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loadError && (
          <div className="px-3 py-2 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {isLoading && !loadError && (
          <div className="px-3 py-2 text-xs text-slate-500">Carregando arquivos...</div>
        )}
        {filteredFiles.map(node => (
          <FileTreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
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
