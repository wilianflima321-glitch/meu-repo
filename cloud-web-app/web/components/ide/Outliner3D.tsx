'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Box, Sphere, Lightbulb, Camera, Layers, Eye, EyeOff, Lock, Unlock } from 'lucide-react'

interface SceneNode {
  id: string
  name: string
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'group'
  children: SceneNode[]
  visible: boolean
  locked: boolean
  selected: boolean
}

interface OutlinerProps {
  nodes: SceneNode[]
  onNodeSelect: (nodeId: string) => void
  onNodeToggle: (nodeId: string) => void
  onNodeVisibility: (nodeId: string) => void
  onNodeLock: (nodeId: string) => void
}

export function Outliner({ nodes = defaultNodes, onNodeSelect, onNodeToggle, onNodeVisibility, onNodeLock }: OutlinerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root', 'group1']))

  const toggleExpand = (nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const getNodeIcon = (type: SceneNode['type']) => {
    switch (type) {
      case 'mesh':
        return <Box className="w-3 h-3" />
      case 'light':
        return <Lightbulb className="w-3 h-3" />
      case 'camera':
        return <Camera className="w-3 h-3" />
      case 'group':
        return <Layers className="w-3 h-3" />
      default:
        return <Sphere className="w-3 h-3" />
    }
  }

  const renderNode = (node: SceneNode, depth: number = 0) => {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 text-[10px] cursor-pointer transition-colors ${
            node.selected
               'bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] text-[var(--aethel-primary-light)]'
              : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onNodeSelect.(node.id)}
        >
          {/* Expand/Collapse */}
          {hasChildren  (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(node.id)
              }}
              className="p-0.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
            >
              {isExpanded  <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Node Icon */}
          <span className={node.visible  'text-[var(--aethel-text-secondary)]' : 'text-[var(--aethel-text-quaternary)]'}>
            {getNodeIcon(node.type)}
          </span>

          {/* Node Name */}
          <span className={`flex-1 truncate ${node.visible  '' : 'opacity-50'}`}>
            {node.name}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNodeVisibility.(node.id)
              }}
              className="p-0.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
            >
              {node.visible  <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNodeLock.(node.id)
              }}
              className="p-0.5 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
            >
              {node.locked  <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">Outliner</span>
        <button
          type="button"
          className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
          title="Adicionar objeto"
        >
          <Box className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scene Tree */}
      <div className="flex-1 overflow-auto">
        {nodes.map(node => renderNode(node))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {nodes.length} objetos na cena
        </div>
      </div>
    </div>
  )
}

const defaultNodes: SceneNode[] = [
  {
    id: 'root',
    name: 'Scene Root',
    type: 'group',
    selected: false,
    children: [
      {
        id: 'group1',
        name: 'Main Group',
        type: 'group',
        selected: true,
        children: [
          {
            id: 'cube1',
            name: 'Cube',
            type: 'mesh',
            visible: true,
            locked: false,
          },
          {
            id: 'sphere1',
            name: 'Sphere',
            type: 'mesh',
            visible: true,
            locked: false,
          },
        ],
      },
      {
        id: 'light1',
        name: 'Directional Light',
        type: 'light',
        visible: true,
        locked: false,
      },
      {
        id: 'camera1',
        name: 'Camera',
        type: 'camera',
        visible: true,
        locked: true,
      },
    ],
  },
]
