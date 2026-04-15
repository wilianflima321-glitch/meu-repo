'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Codicon, { type CodiconName } from './Codicon'
import { Search, X, Filter } from 'lucide-react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

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
  ts: { icon: 'symbol-file', color: 'text-[var(--aethel-text-secondary)]' },
  tsx: { icon: 'symbol-file', color: 'text-[var(--aethel-text-secondary)]' },
  js: { icon: 'symbol-file', color: 'text-[var(--aethel-text-secondary)]' },
  jsx: { icon: 'symbol-file', color: 'text-[var(--aethel-text-secondary)]' },
  json: { icon: 'symbol-number', color: 'text-[var(--aethel-text-tertiary)]' },
  md: { icon: 'symbol-file', color: 'text-[var(--aethel-text-tertiary)]' },
  css: { icon: 'symbol-color', color: 'text-[var(--aethel-text-tertiary)]' },
  scss: { icon: 'symbol-color', color: 'text-[var(--aethel-text-tertiary)]' },
  html: { icon: 'symbol-file', color: 'text-[var(--aethel-text-secondary)]' },
  png: { icon: 'symbol-file', color: 'text-[var(--aethel-text-tertiary)]' },
  jpg: { icon: 'symbol-file', color: 'text-[var(--aethel-text-tertiary)]' },
  svg: { icon: 'symbol-file', color: 'text-[var(--aethel-text-tertiary)]' },
  package: { icon: 'extensions', color: 'text-[var(--aethel-text-tertiary)]' },
  config: { icon: 'gear', color: 'text-[var(--aethel-text-tertiary)]' },
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
  return FILE_ICONS[ext] || { icon: 'symbol-file' as CodiconName, color: 'text-[var(--aethel-text-tertiary)]' }
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
  const nodeIcon = isFolder
    ? (isExpanded ? 'folder-opened' : 'folder')
    : fileIcon.icon

  return (
    <>
      <button type="button" aria-label={isFolder ? `${isExpanded ? 'Recolher' : 'Expandir'} pasta ${node.name}` : `Abrir arquivo ${node.name}`}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault()
            const target = event.currentTarget
            const rect = target.getBoundingClientRect()
            onContextMenu(
              {
                preventDefault: () => {},
                clientX: Math.round(rect.left + 8),
                clientY: Math.round(rect.top + rect.height + 4),
              } as React.MouseEvent,
              node
            )
          }
        }}
        className={`
          w-full density-row flex items-center gap-1.5 px-2 text-xs text-left
          hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] active:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_88%,transparent)] transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]
          ${isSelected ? 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-secondary)]'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Chevron for folders */}
        {isFolder && (
          <span className="w-3.5 h-3.5 flex items-center justify-center text-[var(--aethel-text-tertiary)]">
            {isExpanded ? (
              <Codicon name="chevron-down" />
            ) : (
              <Codicon name="chevron-right" />
            )}
          </span>
        )}

        {/* File/Folder icon */}
        <Codicon name={nodeIcon} className={`${isFolder ? 'text-[var(--aethel-text-secondary)]' : fileIcon.color}`} />

        {/* Name */}
        <span className="flex-1 truncate">{node.name}</span>

        {/* Modified indicator */}
        {node.modified && (
          <span className="h-2 w-2 rounded-full bg-[var(--aethel-warning-light)]" title="Modificado" aria-label="Arquivo modificado" />
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
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState({ left: x, top: y })
  const isFolder = file.type === 'folder'

    const menuItems = [
      ...(isFolder ? [
        { id: 'new-file', label: 'Novo arquivo', icon: 'new-file' as CodiconName },
        { id: 'new-folder', label: 'Nova pasta', icon: 'new-folder' as CodiconName },
        { id: 'divider-1', divider: true },
      ] : []),
      { id: 'rename', label: 'Renomear', icon: 'edit' as CodiconName },
      { id: 'delete', label: 'Excluir', icon: 'trash' as CodiconName, danger: true },
    ]
  const actionableItems = menuItems.filter((item) => !item.divider)

  useEffect(() => {
    const activeButton = menuRef.current?.querySelector<HTMLButtonElement>(`button[data-action-index="${activeIndex}"]`)
    activeButton?.focus()
  }, [activeIndex])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu || typeof window === 'undefined') return
    const width = menu.offsetWidth || 192
    const height = menu.offsetHeight || 120
    const margin = 8

    const maxLeft = Math.max(margin, window.innerWidth - width - margin)
    const maxTop = Math.max(margin, window.innerHeight - height - margin)

    setMenuPosition({
      left: Math.max(margin, Math.min(x, maxLeft)),
      top: Math.max(margin, Math.min(y, maxTop)),
    })
  }, [x, y, menuItems.length])

  const activateActionAtIndex = useCallback((index: number) => {
    const item = actionableItems[index]
    if (!item?.id) return
    onAction(item.id)
    onClose()
  }, [actionableItems, onAction, onClose])

  const handleMenuKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % actionableItems.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activateActionAtIndex(activeIndex)
    }
  }, [activateActionAtIndex, actionableItems.length, activeIndex, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        role="menu"
        aria-label={`Acoes de contexto para ${file.name}`}
        onKeyDown={handleMenuKeyDown}
        className="fixed z-50 min-w-48 py-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg shadow-xl"
        style={{ left: menuPosition.left, top: menuPosition.top }}
      >
        {(() => {
          let actionPointer = -1
          return menuItems.map((item, i) => {
            if (item.divider) {
              return <div key={`divider-${i}`} className="my-1 border-t border-[var(--aethel-border-secondary)]" />
            }
            actionPointer += 1
            const actionIndex = actionPointer
            return (
              <button
                type="button"
                key={item.id}
                role="menuitem"
                data-action-index={actionIndex}
                tabIndex={actionIndex === activeIndex ? 0 : -1}
                onMouseEnter={() => setActiveIndex(actionIndex)}
                onClick={() => {
                  onAction(item.id!)
                  onClose()
                }}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-xs
                  ${item.danger ? 'text-[var(--aethel-error)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]' : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]'}
                `}
              >
                {item.icon && <Codicon name={item.icon} />}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })
        })()}
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
  workspaceName = 'engine',
  className = '',
}: FileExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [internalFiles, setInternalFiles] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    file: FileNode
  } | null>(null)

  const usingExternalFiles = Array.isArray(files)
  const resolvedFiles = files ?? internalFiles
  const effectiveLoading = usingExternalFiles ? externalLoading : isLoading
  const effectiveError = usingExternalFiles ? externalError : loadError
  const iconButtonClass = `p-1 rounded text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_78%,transparent)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

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
      if (!res.ok) throw new Error('Falha ao carregar workspace')
      const data = await res.json()
      const tree = Array.isArray(data?.children)
        ? data.children
        : Array.isArray(data?.tree)
          ? data.tree
          : []
      const mapped = tree.map(mapWorkspaceNode)
      setInternalFiles(mapped)
      setLastSyncAt(new Date().toISOString())
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

  useEffect(() => {
    if (!contextMenu) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [contextMenu])

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
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="density-header flex items-center justify-between px-2 border-b border-[var(--aethel-border-primary)]">
        <span className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider truncate">
          {workspaceName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Alternar busca de arquivos"
            className={`${iconButtonClass} ${showSearch ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]'}`}
            title="Buscar arquivos"
          >
            <Codicon name="search" />
          </button>
          <button
            type="button"
            onClick={() => onFileCreate?.('/', 'file')}
            aria-label="Criar novo arquivo"
            className={iconButtonClass}
            title="Novo arquivo"
          >
            <Codicon name="new-file" />
          </button>
          <button
            type="button"
            onClick={() => onFileCreate?.('/', 'folder')}
            aria-label="Criar nova pasta"
            className={iconButtonClass}
            title="Nova pasta"
          >
            <Codicon name="new-folder" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Atualizar arquivos do workspace"
            className={iconButtonClass}
            title="Atualizar"
          >
            <Codicon name="refresh" />
          </button>
        </div>
      </div>
      {lastSyncAt && (
        <div className="px-2 py-1 border-b border-[var(--aethel-border-primary)] text-[10px] text-[var(--aethel-text-tertiary)]" aria-live="polite">
          Ultima sincronizacao: {new Date(lastSyncAt).toLocaleTimeString()}
        </div>
      )}

      {/* Search */}
      {showSearch && (
        <div className="px-2 py-2 border-b border-[var(--aethel-border-primary)]">
          <div className="relative">
            <Codicon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar arquivos..."
              className={`w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] py-1.5 pl-8 pr-3 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
              autoFocus
              aria-label="Buscar arquivos no explorer"
            />
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {effectiveError && (
          <div className="px-3 py-2">
            <div
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-error-light)]"
              role="alert"
              aria-live="polite"
            >
              {effectiveError}
            </div>
          </div>
        )}
        {effectiveLoading && !effectiveError && (
          <div className="px-3 py-2" aria-live="polite">
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-3 text-xs text-[var(--aethel-text-secondary)]">
              <p className="mb-2 font-medium text-[var(--aethel-text-primary)]">Carregando arvore do workspace...</p>
              <div className="space-y-1.5">
                <div className="h-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
                <div className="h-2 w-5/6 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
                <div className="h-2 w-2/3 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]" />
              </div>
            </div>
          </div>
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
          <div className="px-3 py-3">
            <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_54%,transparent)] px-3 py-3 text-center text-xs text-[var(--aethel-text-secondary)]">
              <p className="mb-1 font-medium text-[var(--aethel-text-primary)]">Nenhum arquivo encontrado</p>
              <p>{`"${searchQuery}"`}</p>
            </div>
          </div>
        )}
        {filteredFiles.length === 0 && !searchQuery && !effectiveLoading && !effectiveError && (
          <div className="h-full flex items-center justify-center px-4 text-center">
            <div className="max-w-xs">
                <div className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-1">Workspace vazio</div>
                <div className="text-[11px] text-[var(--aethel-text-tertiary)] mb-3">
                  Crie um arquivo ou pasta para comecar a editar neste projeto.
                </div>
              <div className="flex items-center justify-center gap-2">
                <button type="button" aria-label="Criar novo arquivo em workspace vazio"
                  onClick={() => onFileCreate?.('/', 'file')}
                  className={`rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/70 px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]/80 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                >
                  Novo arquivo
                </button>
                <button type="button" aria-label="Criar nova pasta em workspace vazio"
                  onClick={() => onFileCreate?.('/', 'folder')}
                  className={`rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/70 px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)]/80 ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`}
                >
                  Nova pasta
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



