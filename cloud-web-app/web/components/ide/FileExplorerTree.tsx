'use client'

import FilePresenceDot from '@/components/collaboration/FilePresenceDot'
import Codicon, { type CodiconName } from './Codicon'
import type { FileNode } from './FileExplorerPro.types'
import type { ExplorerPresenceSummary } from './FileExplorerPro.helpers'

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

function getFileIcon(name: string, isOpen = false) {
  if (name === 'package.json') return FILE_ICONS.package
  if (name.includes('config')) return FILE_ICONS.config

  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || { icon: 'symbol-file' as CodiconName, color: 'text-[var(--aethel-text-tertiary)]' }
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
  getPresence: (node: FileNode) => ExplorerPresenceSummary | null
  presence?: ExplorerPresenceSummary | null
}

export function FileTreeNode({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onSelect,
  onToggle,
  onContextMenu,
  getPresence,
  presence,
}: FileTreeNodeProps) {
  const isFolder = node.type === 'folder'
  const isExpanded = expandedFolders.has(node.id)
  const isSelected = selectedFile === node.id
  const fileIcon = getFileIcon(node.name, isExpanded)
  const nodeIcon = isFolder
    ? (isExpanded ? 'folder-opened' : 'folder')
    : fileIcon.icon
  const buttonLabel = isFolder
    ? `${isExpanded ? 'Collapse' : 'Expand'} folder ${node.name}${presence ? `. ${presence.label}` : ''}`
    : `Open file ${node.name}${presence ? `. ${presence.label}` : ''}`

  return (
    <>
      <button type="button" aria-label={buttonLabel}
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

        {presence ? (
          <FilePresenceDot peers={presence.peers} className="mr-1 flex-shrink-0" />
        ) : null}

        {/* Modified indicator */}
        {node.modified && (
          <span className="h-2 w-2 rounded-full bg-[var(--aethel-warning-light)]" title="Modified" aria-label="Modified file" />
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
              getPresence={getPresence}
              presence={getPresence(child)}
            />
          ))}
        </div>
      )}
    </>
  )
}
