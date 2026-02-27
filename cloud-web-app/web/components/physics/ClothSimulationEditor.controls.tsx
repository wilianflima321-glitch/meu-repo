'use client'

import React, { useState } from 'react'
import * as THREE from 'three'
import {
  Box,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  Eye,
  Layers,
  Move,
  Pause,
  Pin,
  Play,
  RotateCcw,
  Scissors,
  Settings,
  Wind,
  Zap,
} from 'lucide-react'

import type { ClothCollider, ClothConfig } from '@/lib/cloth-simulation'

import {
  CLOTH_PRESETS,
  Slider,
  Vector3Input,
  type ClothEditorState,
  type ClothPreset,
} from './cloth-editor-controls'
import type { ClothToolType } from './cloth-simulation-editor.types'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 py-1.5 text-left text-sm text-slate-200 transition-colors hover:text-white"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {icon}
        {title}
      </button>
      {isOpen && <div className="pt-2 pl-6">{children}</div>}
    </div>
  )
}

interface ToolbarProps {
  selectedTool: ClothToolType
  onToolChange: (tool: ClothToolType) => void
  isSimulating: boolean
  onToggleSimulation: () => void
  onReset: () => void
}

export function Toolbar({ selectedTool, onToolChange, isSimulating, onToggleSimulation, onReset }: ToolbarProps) {
  const tools: { id: ClothToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <Move className="h-4 w-4" />, label: 'Select' },
    { id: 'pin', icon: <Pin className="h-4 w-4" />, label: 'Pin Vertices' },
    { id: 'unpin', icon: <Pin className="h-4 w-4 text-red-400" />, label: 'Unpin' },
    { id: 'tear', icon: <Scissors className="h-4 w-4" />, label: 'Tear' },
    { id: 'move_collider', icon: <Box className="h-4 w-4" />, label: 'Move Collider' },
  ]

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-slate-800/90 p-2">
      <button
        onClick={onToggleSimulation}
        className={`rounded p-2 transition-colors ${
          isSimulating ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        title={isSimulating ? 'Pause Simulation' : 'Play Simulation'}
      >
        {isSimulating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        onClick={onReset}
        className="rounded bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600"
        title="Reset Simulation"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div className="my-2 h-px bg-slate-700" />

      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`rounded p-2 transition-colors ${
            selectedTool === tool.id ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  )
}

interface ClothSettingsPanelProps {
  config: ClothConfig
  setConfig: React.Dispatch<React.SetStateAction<ClothConfig>>
  editorState: ClothEditorState
  setEditorState: React.Dispatch<React.SetStateAction<ClothEditorState>>
  showWindArrow: boolean
  setShowWindArrow: (value: boolean) => void
  colliders: ClothCollider[]
  setColliders: React.Dispatch<React.SetStateAction<ClothCollider[]>>
  selectedCollider: number | null
  setSelectedCollider: React.Dispatch<React.SetStateAction<number | null>>
  applyPreset: (preset: ClothPreset) => void
  addCollider: (type: ClothCollider['type']) => void
  handleExport: () => void
}

export function ClothSettingsPanel({
  config,
  setConfig,
  editorState,
  setEditorState,
  showWindArrow,
  setShowWindArrow,
  colliders,
  setColliders,
  selectedCollider,
  setSelectedCollider,
  applyPreset,
  addCollider,
  handleExport,
}: ClothSettingsPanelProps) {
  return (
    <div className="w-72 overflow-y-auto border-l border-slate-700 bg-slate-850">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Layers className="h-5 w-5 text-sky-400" />
            Cloth Settings
          </h2>
          <button
            onClick={handleExport}
            className="rounded bg-sky-600 p-1.5 transition-colors hover:bg-sky-500"
            title="Export Configuration"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        <CollapsibleSection title="Presets" icon={<Zap className="h-4 w-4 text-yellow-400" />}>
          <div className="grid grid-cols-2 gap-1.5">
            {CLOTH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`rounded p-2 text-left transition-colors ${
                  editorState.currentPreset === preset.id
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <div className="text-xs font-medium">{preset.name}</div>
                <div className="truncate text-[10px] opacity-70">{preset.description}</div>
              </button>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Physics" icon={<Settings className="h-4 w-4 text-blue-400" />}>
          <Slider
            label="Mass"
            value={config.mass}
            min={0.1}
            max={2}
            step={0.1}
            unit=" kg"
            onChange={(v) => setConfig((p) => ({ ...p, mass: v }))}
            tooltip="Total mass of the cloth"
          />
          <Slider
            label="Stiffness"
            value={config.stiffness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setConfig((p) => ({ ...p, stiffness: v }))}
            tooltip="How rigid the cloth is"
          />
          <Slider
            label="Damping"
            value={config.damping}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => setConfig((p) => ({ ...p, damping: v }))}
            tooltip="Energy dissipation"
          />
          <Slider
            label="Iterations"
            value={config.iterations}
            min={1}
            max={30}
            step={1}
            onChange={(v) => setConfig((p) => ({ ...p, iterations: v }))}
            tooltip="Solver iterations per frame"
          />
          <Slider
            label="Tear Threshold"
            value={config.tearThreshold}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(v) => setConfig((p) => ({ ...p, tearThreshold: v }))}
            tooltip="Force required to tear the cloth"
          />

          <div className="mt-3 flex items-center justify-between">
            <label className="text-xs text-slate-400">Self Collision</label>
            <input
              type="checkbox"
              checked={config.selfCollision}
              onChange={(e) => setConfig((p) => ({ ...p, selfCollision: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600 focus:ring-sky-500 focus:ring-offset-slate-900"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Wind" icon={<Wind className="h-4 w-4 text-cyan-400" />}>
          <Vector3Input
            label="Direction & Strength"
            value={{ x: config.wind.x, y: config.wind.y, z: config.wind.z }}
            onChange={(v) => setConfig((p) => ({ ...p, wind: new THREE.Vector3(v.x, v.y, v.z) }))}
            min={-10}
            max={10}
          />
          <Slider
            label="Variation"
            value={config.windVariation}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setConfig((p) => ({ ...p, windVariation: v }))}
            tooltip="Wind turbulence"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="text-xs text-slate-400">Show Wind Arrow</label>
            <input
              type="checkbox"
              checked={showWindArrow}
              onChange={(e) => setShowWindArrow(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Gravity" icon={<Circle className="h-4 w-4 text-blue-400" />}>
          <Vector3Input
            label="Gravity Vector"
            value={{ x: config.gravity.x, y: config.gravity.y, z: config.gravity.z }}
            onChange={(v) => setConfig((p) => ({ ...p, gravity: new THREE.Vector3(v.x, v.y, v.z) }))}
            min={-20}
            max={20}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Colliders" icon={<Box className="h-4 w-4 text-orange-400" />}>
          <div className="mb-3 flex gap-1">
            <button
              onClick={() => addCollider('sphere')}
              className="flex-1 rounded bg-slate-700 p-1.5 text-xs transition-colors hover:bg-slate-600"
            >
              + Sphere
            </button>
            <button
              onClick={() => addCollider('box')}
              className="flex-1 rounded bg-slate-700 p-1.5 text-xs transition-colors hover:bg-slate-600"
            >
              + Box
            </button>
            <button
              onClick={() => addCollider('plane')}
              className="flex-1 rounded bg-slate-700 p-1.5 text-xs transition-colors hover:bg-slate-600"
            >
              + Plane
            </button>
          </div>

          {colliders.map((collider, index) => (
            <div
              key={index}
              className={`mb-1.5 cursor-pointer rounded p-2 transition-colors ${
                selectedCollider === index ? 'border border-sky-500 bg-sky-600/30' : 'bg-slate-700'
              }`}
              onClick={() => setSelectedCollider(index)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs capitalize">{collider.type}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setColliders((prev) => prev.filter((_, i) => i !== index))
                    setSelectedCollider((prev) => {
                      if (prev === null) return null
                      if (prev === index) return null
                      return prev > index ? prev - 1 : prev
                    })
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 flex items-center justify-between">
            <label className="text-xs text-slate-400">Show Colliders</label>
            <input
              type="checkbox"
              checked={editorState.showColliders}
              onChange={(e) => setEditorState((p) => ({ ...p, showColliders: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600"
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <label className="text-xs text-slate-400">Ground Plane</label>
            <input
              type="checkbox"
              checked={config.groundPlane}
              onChange={(e) => setConfig((p) => ({ ...p, groundPlane: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600"
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="View Options" icon={<Eye className="h-4 w-4 text-slate-400" />} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Wireframe</label>
              <input
                type="checkbox"
                checked={editorState.showWireframe}
                onChange={(e) => setEditorState((p) => ({ ...p, showWireframe: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-400">Show Constraints</label>
              <input
                type="checkbox"
                checked={editorState.showConstraints}
                onChange={(e) => setEditorState((p) => ({ ...p, showConstraints: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-600"
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Mesh Resolution" icon={<Layers className="h-4 w-4 text-green-400" />} defaultOpen={false}>
          <Slider label="Width" value={config.width} min={1} max={10} step={0.5} unit="m" onChange={(v) => setConfig((p) => ({ ...p, width: v }))} />
          <Slider label="Height" value={config.height} min={1} max={10} step={0.5} unit="m" onChange={(v) => setConfig((p) => ({ ...p, height: v }))} />
          <Slider label="Segments X" value={config.segmentsX} min={5} max={50} step={1} onChange={(v) => setConfig((p) => ({ ...p, segmentsX: v }))} />
          <Slider label="Segments Y" value={config.segmentsY} min={5} max={50} step={1} onChange={(v) => setConfig((p) => ({ ...p, segmentsY: v }))} />
          <p className="mt-2 text-[10px] text-slate-500">Note: Changing resolution will reset the simulation</p>
        </CollapsibleSection>
      </div>
    </div>
  )
}
