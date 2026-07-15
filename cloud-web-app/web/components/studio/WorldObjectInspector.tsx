'use client'

import React, { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import type { SceneNode } from './WorldSceneOutliner'

export interface TransformState {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

const DEFAULT_TRANSFORM: TransformState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 }
}

interface WorldObjectInspectorProps {
  node: SceneNode | null
  onTransformChange?: (transform: TransformState) => void
}

export const WorldObjectInspector: React.FC<WorldObjectInspectorProps> = ({
  node,
  onTransformChange
}) => {
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM)

  // Sync transform when node changes
  useEffect(() => {
    if (node) {
      const seed = node.id.charCodeAt(0) % 5
      setTransform({
        position: { x: seed, y: 0, z: seed * 0.5 },
        rotation: { x: 0, y: seed * 10, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      })
    } else {
      setTransform(DEFAULT_TRANSFORM)
    }
  }, [node])

  const handleValueChange = (
    section: 'position' | 'rotation' | 'scale',
    axis: 'x' | 'y' | 'z',
    value: number
  ) => {
    const nextTransform = {
      ...transform,
      [section]: {
        ...transform[section],
        [axis]: value
      }
    }
    setTransform(nextTransform)
    if (onTransformChange) {
      onTransformChange(nextTransform)
    }
  }

  const resetTransform = () => {
    setTransform(DEFAULT_TRANSFORM)
    if (onTransformChange) {
      onTransformChange(DEFAULT_TRANSFORM)
    }
  }

  if (!node) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-4 border border-[var(--aethel-glass-border)] rounded-xl bg-[var(--aethel-bg-base)]">
        <p className="text-xs text-[var(--aethel-text-quaternary)] font-mono">No object selected</p>
        <p className="text-[10px] text-[var(--aethel-text-quaternary)] mt-1">Select a node from the Outliner to view and edit its transform properties.</p>
      </div>
    )
  }

  const renderVec3Row = (
    label: string,
    section: 'position' | 'rotation' | 'scale'
  ) => {
    const vals = transform[section]
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)] font-mono">
          {label}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* X Axis */}
          <div className="flex items-center gap-1.5 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-glass-border)] rounded-lg px-2 py-1">
            <span className="text-[9px] font-bold text-red-500 font-mono">X</span>
            <input
              type="number"
              step={section === 'scale' ? 0.1 : 0.5}
              value={Number(vals.x.toFixed(3))}
              onChange={(e) => handleValueChange(section, 'x', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border-none text-[10px] font-mono text-[var(--aethel-text-primary)] outline-none"
            />
          </div>
          {/* Y Axis */}
          <div className="flex items-center gap-1.5 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-glass-border)] rounded-lg px-2 py-1">
            <span className="text-[9px] font-bold text-green-500 font-mono">Y</span>
            <input
              type="number"
              step={section === 'scale' ? 0.1 : 0.5}
              value={Number(vals.y.toFixed(3))}
              onChange={(e) => handleValueChange(section, 'y', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border-none text-[10px] font-mono text-[var(--aethel-text-primary)] outline-none"
            />
          </div>
          {/* Z Axis */}
          <div className="flex items-center gap-1.5 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-glass-border)] rounded-lg px-2 py-1">
            <span className="text-[9px] font-bold text-sky-500 font-mono">Z</span>
            <input
              type="number"
              step={section === 'scale' ? 0.1 : 0.5}
              value={Number(vals.z.toFixed(3))}
              onChange={(e) => handleValueChange(section, 'z', parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border-none text-[10px] font-mono text-[var(--aethel-text-primary)] outline-none"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-bg-base)] border border-[var(--aethel-glass-border)] rounded-xl p-3 space-y-4">
      {/* Object Header Info */}
      <div className="border-b border-[var(--aethel-glass-border)] pb-2 space-y-1">
        <p className="text-[12px] font-semibold text-[var(--aethel-text-primary)] truncate">
          {node.name}
        </p>
        <div className="flex items-center justify-between text-[9px] text-[var(--aethel-text-quaternary)] font-mono">
          <span>Type: <strong className="uppercase text-[var(--aethel-neon-cyan)]">{node.type}</strong></span>
          <span className="bg-[var(--aethel-surface-primary)] px-1 rounded truncate max-w-[120px]">{node.id}</span>
        </div>
      </div>

      {/* Vector Rows */}
      <div className="space-y-4 flex-1">
        {renderVec3Row('Position', 'position')}
        {renderVec3Row('Rotation', 'rotation')}
        {renderVec3Row('Scale', 'scale')}
      </div>

      {/* Actions */}
      <div className="border-t border-[var(--aethel-glass-border)] pt-3 flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)] flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-neon-cyan)]" />
          ⚡ Affects Play Mode
        </span>
        <button
          type="button"
          onClick={resetTransform}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--aethel-border-subtle)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-primary)] transition-all outline-none focus:ring-1 focus:ring-[var(--aethel-neon-cyan)]"
        >
          <RotateCcw size={11} />
          Reset Transform
        </button>
      </div>
    </div>
  )
}

export default WorldObjectInspector
