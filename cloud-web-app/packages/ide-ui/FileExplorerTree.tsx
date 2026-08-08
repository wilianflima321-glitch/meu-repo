'use client'

import FilePresenceDot from '../../web/components/collaboration/FilePresenceDot'
import { AETHEL_ASSET_DRAG_MIME, type DraggableAssetKind } from '../../web/lib/ide/assetDragPayload'
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
  rs: { icon: 'symbol-enum', color: 'text-[var(--aethel-warning-light)]' },
  py: { icon: 'symbol-method', color: 'text-[var(--aethel-info-dark)]' },
  gltf: { icon: 'box', color: 'text-[var(--aethel-neon-emerald)]' },
  glb: { icon: 'box', color: 'text-[var(--aethel-neon-emerald)]' },
  obj: { icon: 'box', color: 'text-[var(--aethel-text-tertiary)]' },
  fbx: { icon: 'box', color: 'text-[var(--aethel-text-tertiary)]' },
  blend: { icon: 'box', color: 'text-[var(--aethel-warning-dark)]' },
  wgsl: { icon: 'symbol-color', color: 'text-[var(--aethel-info)]' },
}

function getFileIcon(name: string, isOpen = false) {
  if (name === 'package.json') return FILE_ICONS.package
  if (name.includes('config')) return FILE_ICONS.config

  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || { icon: 'symbol-file' as CodiconName, color: 'text-[var(--aethel-text-tertiary)]' }
}

// ============= Drag-and-Drop 3D Absolute (FASE 3.4) =============
// Lets the user drag a texture/material thumbnail out of the explorer and
// drop it directly onto a mesh in the 3D viewport (see
// `SceneViewportStage.tsx` `handleDrop` for the receiving end, which
// raycasts the drop position against the live scene).

const TEXTURE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'ktx2', 'basis', 'tga', 'exr', 'hdr'])
const MATERIAL_EXTENSIONS = new Set(['mat', 'aethelmat'])

export function getDraggableAssetKind(name: string): DraggableAssetKind | null {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (TEXTURE_EXTENSIONS.has(ext)) return 'texture'
  if (MATERIAL_EXTENSIONS.has(ext)) return 'material'
  return null
}

export { AETHEL_ASSET_DRAG_MIME, type DraggableAssetKind }

function handleAssetDragStart(event: React.DragEvent, node: FileNode, kind: DraggableAssetKind) {
  const payload = JSON.stringify({ path: node.path, name: node.name, kind })
  event.dataTransfer.setData(AETHEL_ASSET_DRAG_MIME, payload)
  // Plain-text fallback keeps this compatible with the existing generic
  // asset-drop handling in `SceneViewportStage.tsx` (`text/aethel-asset` /
  // `text/plain`) for drop targets that don't understand the JSON payload.
  event.dataTransfer.setData('text/aethel-asset', node.name)
  event.dataTransfer.setData('text/plain', node.name)
  event.dataTransfer.effectAllowed = 'copy'
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

/**
 * Flattens a `FileNode` tree into the exact linear sequence of rows that
 * would be visible given the current `expandedFolders` set — a folder's
 * children only appear once their ancestor is expanded. This is what makes
 * the tree virtualizable: `VirtualList` (`web/components/ui/VirtualList.tsx`)
 * only ever needs a flat array + a fixed row height, never recursion.
 */
export interface FlattenedFileEntry {
  node: FileNode
  depth: number
}

export function flattenVisibleFiles(
  nodes: FileNode[],
  expandedFolders: Set<string>,
  depth = 0
): FlattenedFileEntry[] {
  const result: FlattenedFileEntry[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.type === 'folder' && expandedFolders.has(node.id) && node.children) {
      result.push(...flattenVisibleFiles(node.children, expandedFolders, depth + 1))
    }
  }
  return result
}

export const FILE_TREE_ROW_HEIGHT = 24

/** Single non-recursive tree row — the unit `flattenVisibleFiles` + `VirtualList` render per visible entry. */
export function FileTreeRow({
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
  const draggableAssetKind = isFolder ? null : getDraggableAssetKind(node.name)
  const buttonLabel = isFolder
    ? `${isExpanded ? 'Collapse' : 'Expand'} folder ${node.name}${presence ? `. ${presence.label}` : ''}`
    : `Open file ${node.name}${presence ? `. ${presence.label}` : ''}${draggableAssetKind ? '. Drag onto the viewport to apply.' : ''}`

  return (
    <>
      <button type="button" aria-label={buttonLabel}
        draggable={Boolean(draggableAssetKind)}
        onDragStart={draggableAssetKind ? (e) => handleAssetDragStart(e, node, draggableAssetKind) : undefined}
        title={draggableAssetKind ? `Drag onto a mesh in the viewport to apply as ${draggableAssetKind}` : undefined}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault()
            const target = event.currentTarget
            const rect = target.getBoundingClientRect()
            onContextMenu(
              {
                preventDefault: () => { },
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
    </>
  )
}

/**
 * Recursive tree renderer kept for non-virtualized consumers. New call sites
 * with potentially large trees should prefer `flattenVisibleFiles` +
 * `FileTreeRow` fed through `VirtualList` instead (see `FileExplorerView.tsx`).
 */
export function FileTreeNode(props: FileTreeNodeProps) {
  const { node, depth, selectedFile, expandedFolders, onSelect, onToggle, onContextMenu, getPresence } = props
  const isFolder = node.type === 'folder'
  const isExpanded = expandedFolders.has(node.id)

  return (
    <>
      <FileTreeRow {...props} />
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
