'use client'

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  Box,
  Circle,
  Lightbulb,
  Camera,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Triangle,
  Zap,
  Music,
  Globe,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SceneNodeType =
  | 'mesh'
  | 'light'
  | 'camera'
  | 'empty'
  | 'group'
  | 'audio'
  | 'trigger'
  | 'terrain'

export interface SceneNode {
  id: string
  name: string
  type: SceneNodeType
  children?: SceneNode[]
  visible?: boolean
  locked?: boolean
  selected?: boolean
}

export interface OutlinerProps {
  nodes?: SceneNode[]
  onNodeSelect?: (nodeId: string) => void
  onNodeToggle?: (nodeId: string) => void
  onNodeVisibility?: (nodeId: string) => void
  onNodeLock?: (nodeId: string) => void
  onNodeReparent?: (draggedId: string, targetId: string) => void
}

// ─── Flattened row for virtualization ────────────────────────────────────────

interface FlatNode {
  node: SceneNode
  depth: number
}

function flattenNodes(
  nodes: SceneNode[],
  expanded: Set<string>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = []
  for (const node of nodes) {
    result.push({ node, depth })
    if (node.children?.length && expanded.has(node.id)) {
      result.push(...flattenNodes(node.children, expanded, depth + 1))
    }
  }
  return result
}

function filterNodes(nodes: SceneNode[], query: string): SceneNode[] {
  if (!query.trim()) return nodes
  const q = query.toLowerCase()
  function matchNode(node: SceneNode): SceneNode | null {
    const selfMatch = node.name.toLowerCase().includes(q)
    const filteredChildren = (node.children ?? []).map(matchNode).filter(Boolean) as SceneNode[]
    if (selfMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren }
    }
    return null
  }
  return nodes.map(matchNode).filter(Boolean) as SceneNode[]
}

// ─── Icon + color per node type (semantic color coding) ──────────────────────

interface NodeIconDef {
  Icon: React.ComponentType<any>
  colorClass: string
  label: string
}

const NODE_ICON_MAP: Record<SceneNodeType, NodeIconDef> = {
  mesh:    { Icon: Box,      colorClass: 'text-[var(--aethel-primary-light)]',  label: 'Mesh' },
  light:   { Icon: Lightbulb, colorClass: 'text-yellow-400',                    label: 'Light' },
  camera:  { Icon: Camera,   colorClass: 'text-sky-400',                        label: 'Camera' },
  group:   { Icon: Layers,   colorClass: 'text-emerald-400',                    label: 'Group' },
  empty:   { Icon: Circle,   colorClass: 'text-[var(--aethel-text-quaternary)]',label: 'Empty' },
  audio:   { Icon: Music,    colorClass: 'text-purple-400',                     label: 'Audio' },
  trigger: { Icon: Zap,      colorClass: 'text-orange-400',                     label: 'Trigger' },
  terrain: { Icon: Triangle, colorClass: 'text-lime-400',                       label: 'Terrain' },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 28 // px — must match CSS below
const OVERSCAN = 6   // extra rows rendered above/below viewport

// ─── Main component ───────────────────────────────────────────────────────────

export function Outliner3D({
  nodes = [],
  onNodeSelect = () => undefined,
  onNodeToggle = () => undefined,
  onNodeVisibility = () => undefined,
  onNodeLock = () => undefined,
  onNodeReparent,
}: OutlinerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [focusIndex, setFocusIndex] = useState<number>(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)
  const containerCallbackRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    setContainerHeight(el.clientHeight)
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerHeight(entry.contentRect.height)
    })
    ro.observe(el)
  }, [])

  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }, [])

  // Filtered + flattened list — only recomputed on dependency changes
  const filtered = useMemo(() => filterNodes(nodes, searchQuery), [nodes, searchQuery])
  const flat = useMemo(() => flattenNodes(filtered, expanded), [filtered, expanded])

  // Virtualisation math
  const totalHeight = flat.length * ROW_HEIGHT
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIndex = Math.min(flat.length - 1, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN)
  const visibleItems = flat.slice(startIndex, endIndex + 1)

  // Keyboard navigation across the flat list
  const handleListKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIndex(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      const item = flat[focusIndex]
      if (item?.node.children?.length && !expanded.has(item.node.id)) {
        toggleExpand(item.node.id)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const item = flat[focusIndex]
      if (item?.node.children?.length && expanded.has(item.node.id)) {
        toggleExpand(item.node.id)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const item = flat[focusIndex]
      if (item) onNodeSelect(item.node.id)
    }
  }, [flat, focusIndex, expanded, toggleExpand, onNodeSelect])

  const totalObjects = useMemo(() => {
    function count(ns: SceneNode[]): number {
      return ns.reduce((acc, n) => acc + 1 + count(n.children ?? []), 0)
    }
    return count(nodes)
  }, [nodes])

  return (
    <div
      className="flex h-full flex-col"
      style={{ background: 'var(--aethel-surface-primary)', color: 'var(--aethel-text-primary)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between border-b px-3 py-2 flex-shrink-0"
        style={{
          borderColor: 'var(--aethel-border-primary)',
          background: 'color-mix(in srgb, var(--aethel-surface-secondary) 70%, transparent)',
        }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--aethel-text-primary)' }}>
          Outliner
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery('') }}
            className="rounded p-1 transition-colors"
            style={{
              color: showSearch ? 'var(--aethel-primary-light)' : 'var(--aethel-text-tertiary)',
              background: showSearch ? 'color-mix(in srgb, var(--aethel-primary) 18%, transparent)' : 'transparent',
            }}
            onMouseEnter={e => { if (!showSearch) e.currentTarget.style.background = 'var(--aethel-interactive-hover)' }}
            onMouseLeave={e => { if (!showSearch) e.currentTarget.style.background = 'transparent' }}
          >
            <Search size={13} />
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div
          className="flex items-center gap-2 border-b px-2 py-1.5 flex-shrink-0"
          style={{ borderColor: 'var(--aethel-border-primary)' }}
        >
          <Search size={12} style={{ color: 'var(--aethel-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter objects..."
            autoFocus
            aria-label="Filter scene objects"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--aethel-text-quaternary)]"
            style={{ color: 'var(--aethel-text-primary)' }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setSearchQuery('')}
              style={{ color: 'var(--aethel-text-tertiary)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* ── Virtual List ── */}
      <div
        ref={containerCallbackRef}
        className="flex-1 overflow-hidden"
        onKeyDown={handleListKeyDown}
        tabIndex={0}
        aria-label="Scene outliner"
        role="tree"
        style={{ outline: 'none' }}
      >
        {flat.length === 0 ? (
          <div
            className="flex h-full items-center justify-center px-4 py-6 text-center text-xs"
            style={{ color: 'var(--aethel-text-tertiary)' }}
          >
            {searchQuery ? `No objects match "${searchQuery}"` : 'No objects in scene yet.'}
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="h-full overflow-y-auto"
            onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
          >
            {/* Spacer div creates correct scroll height */}
            <div style={{ height: totalHeight, position: 'relative' }}>
              {visibleItems.map(({ node, depth }, i) => {
                const absoluteIndex = startIndex + i
                const isFocused = absoluteIndex === focusIndex
                return (
                  <OutlinerRow
                    key={node.id}
                    node={node}
                    depth={depth}
                    absoluteIndex={absoluteIndex}
                    isFocused={isFocused}
                    isExpanded={expanded.has(node.id)}
                    isDragging={draggingId === node.id}
                    isDragOver={dragOverId === node.id}
                    isHovered={hoveredId === node.id}
                    onSelect={() => { setFocusIndex(absoluteIndex); onNodeSelect(node.id) }}
                    onToggle={() => toggleExpand(node.id)}
                    onVisibility={() => onNodeVisibility(node.id)}
                    onLock={() => onNodeLock(node.id)}
                    onDragStart={() => setDraggingId(node.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                    onDragOver={() => setDragOverId(node.id)}
                    onDrop={() => {
                      if (draggingId && draggingId !== node.id) {
                        onNodeReparent?.(draggingId, node.id)
                      }
                      setDraggingId(null)
                      setDragOverId(null)
                    }}
                    onMouseEnter={() => setHoveredId(node.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-between border-t px-3 py-1.5 flex-shrink-0 text-[10px]"
        style={{
          borderColor: 'var(--aethel-border-primary)',
          background: 'color-mix(in srgb, var(--aethel-surface-secondary) 70%, transparent)',
          color: 'var(--aethel-text-tertiary)',
        }}
      >
        <span>{totalObjects} {totalObjects === 1 ? 'object' : 'objects'}</span>
        {searchQuery && flat.length !== totalObjects && (
          <span style={{ color: 'var(--aethel-primary-light)' }}>
            {flat.length} visible
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Individual Row ───────────────────────────────────────────────────────────

interface OutlinerRowProps {
  node: SceneNode
  depth: number
  absoluteIndex: number
  isFocused: boolean
  isExpanded: boolean
  isDragging: boolean
  isDragOver: boolean
  isHovered: boolean
  onSelect: () => void
  onToggle: () => void
  onVisibility: () => void
  onLock: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: () => void
  onDrop: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function OutlinerRow({
  node,
  depth,
  absoluteIndex,
  isFocused,
  isExpanded,
  isDragging,
  isDragOver,
  isHovered,
  onSelect,
  onToggle,
  onVisibility,
  onLock,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMouseEnter,
  onMouseLeave,
}: OutlinerRowProps) {
  const isVisible = node.visible ?? true
  const isLocked = node.locked ?? false
  const isSelected = node.selected ?? false
  const hasChildren = (node.children?.length ?? 0) > 0
  const { Icon, colorClass, label } = NODE_ICON_MAP[node.type] ?? NODE_ICON_MAP.empty

  // Row styles — resolved to inline for determinism in the virtual list
  let rowBg = 'transparent'
  if (isSelected) rowBg = 'color-mix(in srgb, var(--aethel-primary) 18%, transparent)'
  else if (isDragOver) rowBg = 'color-mix(in srgb, var(--aethel-primary) 12%, transparent)'

  return (
    <div
      aria-selected={isSelected}
      aria-level={depth + 1}
      role="treeitem"
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart() }}
      onDragEnd={onDragEnd}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'absolute',
        top: absoluteIndex * ROW_HEIGHT,
        left: 0,
        right: 0,
        height: ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: depth * 14 + 8,
        paddingRight: 6,
        gap: 4,
        background: rowBg,
        opacity: isDragging ? 0.4 : 1,
        cursor: 'pointer',
        userSelect: 'none',
        outline: isFocused ? '2px solid var(--aethel-primary)' : 'none',
        outlineOffset: '-2px',
        borderLeft: isDragOver ? '2px solid var(--aethel-primary)' : '2px solid transparent',
        transition: 'background 80ms ease, opacity 80ms ease',
        fontSize: 12,
        color: isSelected
          ? 'var(--aethel-text-primary)'
          : 'var(--aethel-text-secondary)',
      }}
      onClick={onSelect}
    >
      {/* Expand/Collapse chevron */}
      <button
        type="button"
        aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
        onClick={e => { e.stopPropagation(); if (hasChildren) onToggle() }}
        style={{
          width: 14,
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--aethel-text-tertiary)',
          opacity: hasChildren ? 1 : 0,
          cursor: hasChildren ? 'pointer' : 'default',
          border: 'none',
          background: 'transparent',
          padding: 0,
        }}
      >
        {isExpanded
          ? <ChevronDown size={11} />
          : <ChevronRight size={11} />}
      </button>

      {/* Type icon with semantic color */}
      <span
        className={colorClass}
        style={{ flexShrink: 0, opacity: isVisible ? 1 : 0.35 }}
        aria-label={label}
        title={label}
      >
        <Icon size={13} />
      </span>

      {/* Name */}
      <span
        className="flex-1 truncate"
        style={{
          opacity: isVisible ? 1 : 0.45,
          textDecoration: isLocked ? 'none' : undefined,
        }}
      >
        {node.name}
      </span>

      {/* Action buttons — visible on hover or when non-default state (locked/hidden) */}
      <div
        className="outliner-row-actions flex items-center gap-0.5"
        style={{
          flexShrink: 0,
          opacity: isHovered || isFocused || isLocked || !isVisible ? 1 : 0,
          transition: 'opacity 100ms ease',
        }}
      >
        <button
          type="button"
          aria-label={isVisible ? `Hide ${node.name}` : `Show ${node.name}`}
          onClick={e => { e.stopPropagation(); onVisibility() }}
          style={{
            padding: 2,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: isVisible ? 'var(--aethel-text-tertiary)' : 'var(--aethel-text-quaternary)',
            display: 'flex',
          }}
        >
          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>

        <button
          type="button"
          aria-label={isLocked ? `Unlock ${node.name}` : `Lock ${node.name}`}
          onClick={e => { e.stopPropagation(); onLock() }}
          style={{
            padding: 2,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: isLocked ? 'var(--aethel-warning-light)' : 'var(--aethel-text-tertiary)',
            display: 'flex',
          }}
        >
          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>
    </div>
  )
}

export { Outliner3D as Outliner }
