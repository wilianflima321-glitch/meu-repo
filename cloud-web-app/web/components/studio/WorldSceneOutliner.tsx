'use client'

import React, { useState, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Globe,
  Folder,
  Box,
  Sun,
  Camera,
  Layers
} from 'lucide-react'

export interface SceneNode {
  id: string
  name: string
  type: 'world' | 'group' | 'mesh' | 'light' | 'camera' | 'ambient' | string
  children?: SceneNode[]
  visible?: boolean
  locked?: boolean
}

// R3: DEFAULT_TREE removed — component now uses `initialTree` prop from the real backend.
// When no data is provided, an explicit empty state is rendered instead of fictional scene data.

interface WorldSceneOutlinerProps {
  /** Real scene tree from the backend. When null/undefined, renders an explicit empty state. */
  initialTree?: SceneNode | null
  selectedId: string | null
  onSelect: (node: SceneNode) => void
  onFocus: (node: SceneNode) => void
}

export const WorldSceneOutliner: React.FC<WorldSceneOutlinerProps> = ({
  initialTree = null,
  selectedId,
  onSelect,
  onFocus
}) => {
  const [tree, setTree] = useState<SceneNode | null>(initialTree)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    initialTree ? new Set([initialTree.id]) : new Set()
  )

  // Flattened list of visible/expanded nodes for keyboard navigation
  const [flatList, setFlatList] = useState<SceneNode[]>([])

  useEffect(() => {
    if (!tree) { setFlatList([]); return }
    const list: SceneNode[] = []
    const traverse = (node: SceneNode) => {
      list.push(node)
      if (node.children && expandedNodes.has(node.id)) {
        node.children.forEach(traverse)
      }
    }
    traverse(tree)
    setFlatList(list)
  }, [tree, expandedNodes])

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateNodeState = (id: string, key: 'visible' | 'locked', value: boolean) => {
    const deepCloneAndModify = (node: SceneNode): SceneNode => {
      if (node.id === id) {
        return { ...node, [key]: value }
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(deepCloneAndModify)
        }
      }
      return node
    }
    setTree((prev) => prev ? deepCloneAndModify(prev) : null)
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'world':
        return <Globe size={13} className="text-sky-400" />
      case 'group':
        return <Folder size={13} className="text-amber-400 fill-amber-400/10" />
      case 'mesh':
        return <Box size={13} className="text-emerald-400" />
      case 'ambient':
      case 'light':
        return <Sun size={13} className="text-yellow-400" />
      case 'camera':
        return <Camera size={13} className="text-blue-400" />
      default:
        return <Layers size={13} className="text-cyan-400" />
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, node: SceneNode) => {
    const index = flatList.findIndex((n) => n.id === node.id)
    if (index === -1) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (index < flatList.length - 1) {
          onSelect(flatList[index + 1])
          document.getElementById(`outliner-node-${flatList[index + 1].id}`)?.focus()
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (index > 0) {
          onSelect(flatList[index - 1])
          document.getElementById(`outliner-node-${flatList[index - 1].id}`)?.focus()
        }
        break
      case 'ArrowRight':
        e.preventDefault()
        if (node.children && !expandedNodes.has(node.id)) {
          toggleExpand(node.id)
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        if (node.children && expandedNodes.has(node.id)) {
          toggleExpand(node.id)
        }
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        onSelect(node)
        break
    }
  }

  const renderBranch = (node: SceneNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedId === node.id
    const hasChildren = !!(node.children && node.children.length > 0)
    const isVisible = node.visible !== false
    const isLocked = !!node.locked

    return (
      <div key={node.id} className="flex flex-col">
        {/* Node Row */}
        <div
          id={`outliner-node-${node.id}`}
          tabIndex={0}
          onKeyDown={(e) => handleKeyDown(e, node)}
          onClick={() => onSelect(node)}
          onDoubleClick={() => onFocus(node)}
          className={`
            group relative flex items-center justify-between px-2 py-1 select-none cursor-pointer
            border-l-2 transition-all duration-150 text-[11px] font-mono
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--aethel-info)]
            ${isSelected 
              ? 'bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] text-[var(--aethel-neon-cyan)] border-[var(--aethel-info)] shadow-[inset_4px_0_16px_color-mix(in_srgb,var(--aethel-info)_7%,transparent)]' 
              : 'border-transparent text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] hover:border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] hover:text-[var(--aethel-text-primary)]'
            }
          `}
          style={{ paddingLeft: `${Math.max(8, depth * 14)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Chevron toggle */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpand(node.id)
                }}
                className="p-0.5 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]"
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            ) : (
              <span className="w-5" />
            )}

            {/* Icon */}
            {getNodeIcon(node.type)}

            {/* Name */}
            <span className="truncate">{node.name}</span>
          </div>

          {/* Visibility and Lock Action Buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateNodeState(node.id, 'visible', !isVisible)
              }}
              title={isVisible ? 'Hide Node' : 'Show Node'}
              className="p-0.5 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]"
            >
              {isVisible ? <Eye size={11} /> : <EyeOff size={11} className="text-amber-500/70" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateNodeState(node.id, 'locked', !isLocked)
              }}
              title={isLocked ? 'Unlock Node' : 'Lock Node'}
              className="p-0.5 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]"
            >
              {isLocked ? <Lock size={11} className="text-red-400" /> : <Unlock size={11} />}
            </button>
          </div>
        </div>

        {/* Child branches */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.children!.map((child) => renderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[var(--aethel-bg-base)] scrollbar-none border border-[var(--aethel-glass-border)] rounded-xl py-1">
      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)] border-b border-[var(--aethel-glass-border)] mb-1">
        Scene Hierarchy
      </div>
      <div className="flex flex-col min-h-0 flex-1">
        {tree ? (
          renderBranch(tree)
        ) : (
          /* R3: Honest empty state — no fake scene data */
          <div className="flex flex-col items-center justify-center gap-2 h-full py-8 text-center px-4">
            <Layers size={24} className="text-[var(--aethel-text-quaternary)] opacity-40" />
            <p className="text-[11px] font-mono text-[var(--aethel-text-tertiary)]">
              No scene loaded
            </p>
            <p className="text-[10px] text-[var(--aethel-text-quaternary)] leading-relaxed">
              Create a new world or open an existing project to populate the hierarchy.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorldSceneOutliner
