'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { RemotePeer } from '@/hooks/useCollaborationAwareness'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import {
  describePresence,
  mapWorkspaceNode,
  normalizeExplorerPath,
  resolveProjectIdFromClient,
  type ExplorerPresenceSummary,
  type FileExplorerProps,
  type FileNode,
} from './FileExplorerPro.parts'
import { FileExplorerView } from './FileExplorerView'

export default function FileExplorerPro({
  files,
  collaborationPeers = [],
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

  const activeCollaborationEntries = useMemo(() => {
    return collaborationPeers.flatMap((peer) => {
      const filePath = peer.cursor?.filePath ?? peer.selection?.filePath
      if (!filePath) return []

      return [{
        peer,
        filePath: normalizeExplorerPath(filePath),
      }]
    })
  }, [collaborationPeers])

  const filePresenceMap = useMemo(() => {
    const presence = new Map<string, RemotePeer[]>()

    for (const entry of activeCollaborationEntries) {
      const existing = presence.get(entry.filePath) ?? []
      if (!existing.some((peer) => peer.id === entry.peer.id)) {
        existing.push(entry.peer)
        presence.set(entry.filePath, existing)
      }
    }

    return presence
  }, [activeCollaborationEntries])

  const folderPresenceMap = useMemo(() => {
    const presence = new Map<string, RemotePeer[]>()

    for (const entry of activeCollaborationEntries) {
      const segments = entry.filePath.split('/').filter(Boolean)
      let currentPath = ''

      for (let index = 0; index < segments.length - 1; index += 1) {
        currentPath = `${currentPath}/${segments[index]}`
        const existing = presence.get(currentPath) ?? []
        if (!existing.some((peer) => peer.id === entry.peer.id)) {
          existing.push(entry.peer)
          presence.set(currentPath, existing)
        }
      }
    }

    return presence
  }, [activeCollaborationEntries])

  const describeNodePresence = useCallback((node: FileNode): ExplorerPresenceSummary | null => {
    const normalizedPath = normalizeExplorerPath(node.path)
    const peers = node.type === 'folder'
      ? folderPresenceMap.get(normalizedPath) ?? []
      : filePresenceMap.get(normalizedPath) ?? []

    if (peers.length === 0) return null

    return {
      peers,
      label: describePresence(peers, node.name),
    }
  }, [filePresenceMap, folderPresenceMap])

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
      if (!res.ok) throw new Error('Failed to load workspace')
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
      setLoadError(error instanceof Error ? error.message : 'Error loading files')
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

  const handleSelect = useCallback((file: FileNode) => {
    setSelectedFile(file.id)
    onFileSelect?.(file)
  }, [onFileSelect])

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
    <FileExplorerView
      workspaceName={workspaceName}
      className={className}
      showSearch={showSearch}
      setShowSearch={setShowSearch}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      lastSyncAt={lastSyncAt}
      effectiveLoading={effectiveLoading}
      effectiveError={effectiveError}
      filteredFiles={filteredFiles}
      selectedFile={selectedFile}
      expandedFolders={expandedFolders}
      contextMenu={contextMenu}
      iconButtonClass={iconButtonClass}
      onFileCreate={onFileCreate}
      onRefresh={handleRefresh}
      onSelect={handleSelect}
      onToggleFolder={toggleFolder}
      onContextMenu={handleContextMenu}
      getPresence={describeNodePresence}
      onCloseContextMenu={() => setContextMenu(null)}
      onContextAction={handleAction}
    />
  )
}
