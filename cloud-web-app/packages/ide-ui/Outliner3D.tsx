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
  Plus,
  Folders,
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
  color: string        // exact hex for icon
  bgColor: string      // subtle background tint
  label: string
}

const NODE_ICON_MAP: Record<SceneNodeType, NodeIconDef> = {
  mesh:    { Icon: Box,       color: 'var(--aethel-primary-light)', bgColor: 'rgba(var(--aethel-primary-rgb), 0.12)', label: 'Mesh' },
  light:   { Icon: Lightbulb, color: 'var(--aethel-warning-light)', bgColor: 'color-mix(in srgb, var(--aethel-neon-amber) 12%, transparent)', label: 'Light' },
  camera:  { Icon: Camera,    color: 'var(--aethel-info-light)', bgColor: 'rgba(var(--aethel-info-rgb), 0.12)', label: 'Camera' },
  group:   { Icon: Layers,    color: 'var(--aethel-success-light)', bgColor: 'color-mix(in srgb, var(--aethel-neon-emerald) 12%, transparent)', label: 'Group' },
  empty:   { Icon: Circle,    color: 'var(--aethel-text-tertiary)', bgColor: 'color-mix(in srgb, var(--aethel-text-tertiary) 8%, transparent)', label: 'Empty' },
  audio:   { Icon: Music,     color: 'var(--aethel-accent-light)', bgColor: 'rgba(var(--aethel-accent-rgb), 0.12)', label: 'Audio' },
  trigger: { Icon: Zap,       color: 'var(--aethel-warning-light)', bgColor: 'rgba(var(--aethel-warning-rgb), 0.12)', label: 'Trigger' },
  terrain: { Icon: Triangle,  color: 'var(--aethel-neon-emerald)', bgColor: 'color-mix(in srgb, var(--aethel-success) 12%, transparent)', label: 'Terrain' },
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 28 // px — must match virtual list math below
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
        className="flex items-center justify-between flex-shrink-0 border-b px-3"
        style={{
          borderColor: 'var(--aethel-border-secondary)',
          background: 'var(--aethel-panel)',
          backdropFilter: 'blur(12px)',
          height: 36,
        }}
      >
        <div className="flex items-center gap-2">
          <Folders size={12} style={{ color: 'var(--aethel-success-light)', opacity: 0.8 }} />
          <span
            className="text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: 'var(--aethel-text-secondary)', letterSpacing: '0.06em' }}
          >
            Scene
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Toggle search"
            onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery('') }}
            className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
            style={{
              color: showSearch ? 'var(--aethel-primary-light)' : 'var(--aethel-text-tertiary)',
              background: showSearch ? 'rgba(var(--aethel-primary-rgb), 0.18)' : 'transparent',
            }}
            onMouseEnter={e => { if (!showSearch) e.currentTarget.style.background = 'var(--aethel-interactive-hover)' }}
            onMouseLeave={e => { if (!showSearch) e.currentTarget.style.background = 'transparent' }}
          >
            <Search size={12} />
          </button>
          <button
            type="button"
            aria-label="Add new object"
            className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
            style={{ color: 'var(--aethel-text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--aethel-interactive-hover)'; e.currentTarget.style.color = 'var(--aethel-primary-light)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aethel-text-tertiary)' }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div
          className="flex items-center gap-2 border-b px-2.5 flex-shrink-0"
          style={{
            borderColor: 'var(--aethel-border-subtle)',
            background: 'var(--aethel-glass-bg)',
            height: 32,
          }}
        >
          <Search size={11} style={{ color: 'var(--aethel-text-tertiary)', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter objects..."
            autoFocus
            aria-label="Filter scene objects"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{
              color: 'var(--aethel-text-primary)',
              caretColor: 'var(--aethel-primary)',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setSearchQuery('')}
              className="flex-shrink-0 transition-colors duration-150"
              style={{ color: 'var(--aethel-text-tertiary)' }}
            >
              <X size={11} />
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
            className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center"
            style={{ color: 'var(--aethel-text-quaternary)' }}
          >
            <Globe size={28} style={{ opacity: 0.18 }} />
            <span className="text-xs">
              {searchQuery ? `No objects match "${searchQuery}"` : 'Scene is empty. Add an object to start.'}
            </span>
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
        className="flex items-center justify-between border-t px-3 flex-shrink-0"
        style={{
          borderColor: 'var(--aethel-border-subtle)',
          background: 'var(--aethel-panel-soft)',
          backdropFilter: 'blur(8px)',
          height: 24,
        }}
      >
        <span className="text-[10px] font-mono" style={{ color: 'var(--aethel-text-quaternary)' }}>
          {totalObjects} {totalObjects === 1 ? 'object' : 'objects'}
        </span>
        {searchQuery && flat.length !== totalObjects && (
          <span className="text-[10px] font-mono" style={{ color: 'var(--aethel-primary-light)' }}>
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
  const { Icon, color, bgColor, label } = NODE_ICON_MAP[node.type] ?? NODE_ICON_MAP.empty

  let rowBg = 'transparent'
  if (isSelected) rowBg = 'rgba(var(--aethel-primary-rgb), 0.15)'
  else if (isDragOver) rowBg = 'rgba(var(--aethel-primary-rgb), 0.08)'
  else if (isHovered) rowBg = 'var(--aethel-interactive-hover)'

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
        paddingLeft: depth * 16 + 6,
        paddingRight: 4,
        gap: 3,
        background: rowBg,
        opacity: isDragging ? 0.35 : 1,
        cursor: 'pointer',
        userSelect: 'none',
        // Selected row: left accent bar via box-shadow (no extra DOM node)
        boxShadow: isSelected
          ? 'inset 2px 0 0 rgba(var(--aethel-primary-rgb), 0.9)'
          : isDragOver
            ? 'inset 2px 0 0 rgba(var(--aethel-primary-rgb), 0.5)'
            : 'none',
        outline: isFocused ? '1px solid rgba(var(--aethel-primary-rgb), 0.6)' : 'none',
        outlineOffset: '-1px',
        transition: 'background 80ms ease, box-shadow 80ms ease, opacity 80ms ease',
        fontSize: 12,
        color: isSelected ? 'var(--aethel-text-primary)' : isVisible ? 'var(--aethel-text-secondary)' : 'var(--aethel-text-quaternary)',
      }}
      onClick={onSelect}
    >
      {/* Depth line connector */}
      {depth > 0 && (
        <div
          style={{
            position: 'absolute',
            left: depth * 16 - 2,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--aethel-border-secondary)',
          }}
        />
      )}

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
          transition: 'transform 150ms ease',
        }}
      >
        <ChevronRight
          size={11}
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </button>

      {/* Type icon with semantic color badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: 4,
          background: isSelected ? bgColor : isHovered ? bgColor : 'transparent',
          flexShrink: 0,
          opacity: isVisible ? 1 : 0.3,
          transition: 'background 100ms ease',
        }}
        aria-label={label}
        title={label}
      >
        <Icon size={12} style={{ color }} />
      </div>

      {/* Name */}
      <span
        className="flex-1 truncate text-xs"
        style={{
          opacity: isVisible ? 1 : 0.4,
          fontWeight: isSelected ? 500 : 400,
          letterSpacing: '0.01em',
        }}
      >
        {node.name}
      </span>

      {/* Action buttons — visible on hover or when non-default state */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexShrink: 0,
          opacity: isHovered || isFocused || isLocked || !isVisible ? 1 : 0,
          transition: 'opacity 100ms ease',
        }}
      >
        <button
          type="button"
          aria-label={isVisible ? `Hide ${node.name}` : `Show ${node.name}`}
          onClick={e => { e.stopPropagation(); onVisibility() }}
          className="flex items-center justify-center w-5 h-5 rounded transition-all duration-100"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: isVisible ? 'var(--aethel-text-tertiary)' : 'var(--aethel-text-quaternary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--aethel-interactive-hover)'; e.currentTarget.style.color = 'var(--aethel-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isVisible ? 'var(--aethel-text-tertiary)' : 'var(--aethel-text-quaternary)' }}
        >
          {isVisible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>

        <button
          type="button"
          aria-label={isLocked ? `Unlock ${node.name}` : `Lock ${node.name}`}
          onClick={e => { e.stopPropagation(); onLock() }}
          className="flex items-center justify-center w-5 h-5 rounded transition-all duration-100"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: isLocked ? 'var(--aethel-warning-light)' : 'var(--aethel-text-tertiary)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--aethel-interactive-hover)'; e.currentTarget.style.color = 'var(--aethel-text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = isLocked ? 'var(--aethel-warning-light)' : 'var(--aethel-text-tertiary)' }}
        >
          {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  )
}

export { Outliner3D as Outliner }
