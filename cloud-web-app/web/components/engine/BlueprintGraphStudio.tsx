'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  Move,
  Eye,
  Settings,
  Code,
  Activity,
  Box,
  Compass,
  Volume2,
  Flame,
  Search,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  CheckCircle2,
  HelpCircle,
  FolderPlus,
  Maximize2,
  Shield,
  MousePointer,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & PIN DEFINITIONS
// ─────────────────────────────────────────────────────────────

export type PinType = 'exec' | 'boolean' | 'number' | 'vector3' | 'string' | 'actor' | 'object'

export interface PinDefinition {
  id: string
  name: string
  type: PinType
  isInput: boolean
  defaultValue?: string | number | boolean
}

export type NodeCategory = 'event' | 'flow' | 'transform' | 'physics' | 'audio_vfx' | 'combat' | 'variable'

export interface BlueprintNode {
  id: string
  title: string
  category: NodeCategory
  x: number
  y: number
  inputs: PinDefinition[]
  outputs: PinDefinition[]
  customData?: Record<string, unknown>
  comment?: string
}

export interface NodeConnection {
  id: string
  fromNodeId: string
  fromPinId: string
  toNodeId: string
  toPinId: string
}

export interface BlueprintVariable {
  id: string
  name: string
  type: PinType
  defaultValue: string | number | boolean
  isPublic: boolean
  isReplicated: boolean
}

export interface BlueprintCommentBox {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

// Pin Color Specifications (Canonical Unreal Engine Standard)
const PIN_COLORS: Record<PinType, { border: string; bg: string; text: string; stroke: string }> = {
  exec: {
    border: 'border-white',
    bg: 'bg-white',
    text: 'text-white',
    stroke: '#ffffff',
  },
  boolean: {
    border: 'border-red-500',
    bg: 'bg-red-500',
    text: 'text-red-400',
    stroke: '#ef4444',
  },
  number: {
    border: 'border-emerald-400',
    bg: 'bg-emerald-400',
    text: 'text-emerald-300',
    stroke: '#34d399',
  },
  vector3: {
    border: 'border-amber-400',
    bg: 'bg-amber-400',
    text: 'text-amber-300',
    stroke: '#fbbf24',
  },
  string: {
    border: 'border-rose-400',
    bg: 'bg-rose-400',
    text: 'text-rose-300',
    stroke: '#fb7185',
  },
  actor: {
    border: 'border-cyan-400',
    bg: 'bg-cyan-400',
    text: 'text-cyan-300',
    stroke: '#22d3ee',
  },
  object: {
    border: 'border-sky-400',
    bg: 'bg-sky-400',
    text: 'text-sky-300',
    stroke: '#38bdf8',
  },
}

const CATEGORY_HEADER_STYLES: Record<NodeCategory, { bg: string; border: string; text: string }> = {
  event: {
    bg: 'bg-red-950/80',
    border: 'border-red-500/50',
    text: 'text-red-300',
  },
  flow: {
    bg: 'bg-slate-900',
    border: 'border-slate-600',
    text: 'text-slate-200',
  },
  transform: {
    bg: 'bg-blue-950/80',
    border: 'border-blue-500/50',
    text: 'text-blue-300',
  },
  physics: {
    bg: 'bg-amber-950/80',
    border: 'border-amber-500/50',
    text: 'text-amber-300',
  },
  audio_vfx: {
    bg: 'bg-cyan-950/80',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
  },
  combat: {
    bg: 'bg-orange-950/80',
    border: 'border-orange-500/50',
    text: 'text-orange-300',
  },
  variable: {
    bg: 'bg-emerald-950/80',
    border: 'border-emerald-500/50',
    text: 'text-emerald-300',
  },
}

// ─────────────────────────────────────────────────────────────
// PRESET BLUEPRINT GRAPH FIXTURES
// ─────────────────────────────────────────────────────────────

const INITIAL_NODES: BlueprintNode[] = [
  {
    id: 'node-beginplay',
    title: 'Event BeginPlay',
    category: 'event',
    x: 60,
    y: 120,
    inputs: [],
    outputs: [{ id: 'out-exec', name: '', type: 'exec', isInput: false }],
  },
  {
    id: 'node-branch',
    title: 'Branch (If/Else)',
    category: 'flow',
    x: 320,
    y: 120,
    inputs: [
      { id: 'in-exec', name: 'Exec', type: 'exec', isInput: true },
      { id: 'in-condition', name: 'Condition', type: 'boolean', isInput: true, defaultValue: true },
    ],
    outputs: [
      { id: 'out-true', name: 'True', type: 'exec', isInput: false },
      { id: 'out-false', name: 'False', type: 'exec', isInput: false },
    ],
  },
  {
    id: 'node-spawnvfx',
    title: 'Spawn Emitter at Location',
    category: 'audio_vfx',
    x: 620,
    y: 80,
    inputs: [
      { id: 'in-exec', name: 'Exec', type: 'exec', isInput: true },
      { id: 'in-location', name: 'Location', type: 'vector3', isInput: true },
      { id: 'in-scale', name: 'Scale', type: 'number', isInput: true, defaultValue: 1.0 },
    ],
    outputs: [
      { id: 'out-exec', name: 'Exec', type: 'exec', isInput: false },
      { id: 'out-emitter', name: 'VFX Component', type: 'object', isInput: false },
    ],
  },
  {
    id: 'node-playsound',
    title: 'Play Sound at Location (MetaSounds)',
    category: 'audio_vfx',
    x: 620,
    y: 300,
    inputs: [
      { id: 'in-exec', name: 'Exec', type: 'exec', isInput: true },
      { id: 'in-location', name: 'Location', type: 'vector3', isInput: true },
      { id: 'in-volume', name: 'Volume Multiplier', type: 'number', isInput: true, defaultValue: 1.0 },
      { id: 'in-pitch', name: 'Pitch Multiplier', type: 'number', isInput: true, defaultValue: 1.0 },
    ],
    outputs: [{ id: 'out-exec', name: 'Exec', type: 'exec', isInput: false }],
  },
  {
    id: 'node-getlocation',
    title: 'Get Actor Location',
    category: 'transform',
    x: 320,
    y: 360,
    inputs: [{ id: 'in-target', name: 'Target (Self)', type: 'actor', isInput: true }],
    outputs: [{ id: 'out-vector', name: 'Return Value', type: 'vector3', isInput: false }],
  },
]

const INITIAL_CONNECTIONS: NodeConnection[] = [
  {
    id: 'c1',
    fromNodeId: 'node-beginplay',
    fromPinId: 'out-exec',
    toNodeId: 'node-branch',
    toPinId: 'in-exec',
  },
  {
    id: 'c2',
    fromNodeId: 'node-branch',
    fromPinId: 'out-true',
    toNodeId: 'node-spawnvfx',
    toPinId: 'in-exec',
  },
  {
    id: 'c3',
    fromNodeId: 'node-branch',
    fromPinId: 'out-false',
    toNodeId: 'node-playsound',
    toPinId: 'in-exec',
  },
  {
    id: 'c4',
    fromNodeId: 'node-getlocation',
    fromPinId: 'out-vector',
    toNodeId: 'node-spawnvfx',
    toPinId: 'in-location',
  },
  {
    id: 'c5',
    fromNodeId: 'node-getlocation',
    fromPinId: 'out-vector',
    toNodeId: 'node-playsound',
    toPinId: 'in-location',
  },
]

const INITIAL_VARIABLES: BlueprintVariable[] = [
  { id: 'v1', name: 'bIsPlayerActive', type: 'boolean', defaultValue: true, isPublic: true, isReplicated: false },
  { id: 'v2', name: 'MaxHealth', type: 'number', defaultValue: 100, isPublic: true, isReplicated: true },
  { id: 'v3', name: 'SpawnTransformOffset', type: 'vector3', defaultValue: '0, 0, 150', isPublic: false, isReplicated: false },
  { id: 'v4', name: 'CharacterName', type: 'string', defaultValue: 'Cyber operative', isPublic: true, isReplicated: false },
]

export default function BlueprintGraphStudio() {
  const [nodes, setNodes] = useState<BlueprintNode[]>(INITIAL_NODES)
  const [connections, setConnections] = useState<NodeConnection[]>(INITIAL_CONNECTIONS)
  const [variables, setVariables] = useState<BlueprintVariable[]>(INITIAL_VARIABLES)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.0)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all')

  // Dragging connection state
  const [draggingPin, setDraggingPin] = useState<{
    nodeId: string
    pinId: string
    isInput: boolean
    type: PinType
  } | null>(null)
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null)

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLDivElement>(null)

  // Calculate Node Pin Positions
  const getPinCoordinate = useCallback(
    (nodeId: string, pinId: string, isInput: boolean): { x: number; y: number } => {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return { x: 0, y: 0 }

      const pinList = isInput ? node.inputs : node.outputs
      const pinIndex = pinList.findIndex((p) => p.id === pinId)
      const pinY = node.y + 44 + (pinIndex >= 0 ? pinIndex * 24 : 0) + 12
      const pinX = isInput ? node.x : node.x + 220

      return { x: pinX, y: pinY }
    },
    [nodes],
  )

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedNodeId(null)
    }
  }

  const handlePointerDownNode = (node: BlueprintNode, e: React.PointerEvent) => {
    e.stopPropagation()
    setSelectedNodeId(node.id)
    setDraggingNodeId(node.id)
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId
            ? { ...n, x: Math.round((e.clientX / zoom - dragOffset.x) / 8) * 8, y: Math.round((e.clientY / zoom - dragOffset.y) / 8) * 8 }
            : n,
        ),
      )
    }
    if (draggingPin && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setDragMousePos({
        x: (e.clientX - rect.left) / zoom - pan.x,
        y: (e.clientY - rect.top) / zoom - pan.y,
      })
    }
  }

  const handlePointerUp = () => {
    setDraggingNodeId(null)
    setDraggingPin(null)
    setDragMousePos(null)
  }

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId])

  return (
    <div
      className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ── Top Main Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Blueprint Visual Scripting Studio
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Event Dispatcher, Math Nodes, State Machines & Gameplay Logic
            </p>
          </div>
        </div>

        {/* Action Controls & Simulation Mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Good to Go (0 Errors)</span>
          </div>

          <div className="h-4 w-px bg-[var(--aethel-border-subtle)] mx-1" />

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all ${
              isSimulating
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Stop Sim
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Simulate Flow
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Studio Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Variables & Palette Panel */}
        <aside className="flex w-64 flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]">
          {/* Section: Variables */}
          <div className="border-b border-[var(--aethel-border-subtle)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)]">
                Variables ({variables.length})
              </span>
              <button
                onClick={() => {
                  const newVar: BlueprintVariable = {
                    id: `v-${Date.now()}`,
                    name: `NewVar_${variables.length + 1}`,
                    type: 'number',
                    defaultValue: 0,
                    isPublic: true,
                    isReplicated: false,
                  }
                  setVariables([...variables, newVar])
                }}
                className="flex h-5 w-5 items-center justify-center rounded bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]"
                title="Add Variable"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
              {variables.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded px-2 py-1 text-xs bg-[var(--aethel-surface-tertiary)]/50 hover:bg-[var(--aethel-surface-tertiary)] group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`h-2 w-2 rounded-full ${PIN_COLORS[v.type].bg}`} />
                    <span className="font-mono text-[var(--aethel-text-primary)] truncate">{v.name}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {v.isReplicated && (
                      <span title="Replicated">
                        <Shield className="h-2.5 w-2.5 text-cyan-400" />
                      </span>
                    )}
                    <button
                      onClick={() => setVariables(variables.filter((item) => item.id !== v.id))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Node Palette Library */}
          <div className="flex flex-1 flex-col p-3 overflow-hidden">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search Action or Event..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-full rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] pl-8 pr-2 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:border-blue-500/60 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                  Events
                </span>
                <div className="space-y-1 pl-1">
                  <div
                    onClick={() => {
                      const newNode: BlueprintNode = {
                        id: `node-${Date.now()}`,
                        title: 'Event CustomTrigger',
                        category: 'event',
                        x: 100,
                        y: 100,
                        inputs: [],
                        outputs: [{ id: 'out-exec', name: '', type: 'exec', isInput: false }],
                      }
                      setNodes([...nodes, newNode])
                    }}
                    className="cursor-pointer rounded px-2 py-1 bg-[var(--aethel-surface-tertiary)]/40 hover:bg-red-950/40 hover:text-red-200 border border-transparent hover:border-red-500/30 transition-all flex items-center justify-between"
                  >
                    <span>Event CustomTrigger</span>
                    <Plus className="h-3 w-3 opacity-60" />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                  Transform & Vectors
                </span>
                <div className="space-y-1 pl-1">
                  <div
                    onClick={() => {
                      const newNode: BlueprintNode = {
                        id: `node-${Date.now()}`,
                        title: 'Set Actor Location',
                        category: 'transform',
                        x: 200,
                        y: 200,
                        inputs: [
                          { id: 'in-exec', name: 'Exec', type: 'exec', isInput: true },
                          { id: 'in-newloc', name: 'New Location', type: 'vector3', isInput: true },
                          { id: 'in-sweep', name: 'Sweep Collision', type: 'boolean', isInput: true, defaultValue: true },
                        ],
                        outputs: [{ id: 'out-exec', name: 'Exec', type: 'exec', isInput: false }],
                      }
                      setNodes([...nodes, newNode])
                    }}
                    className="cursor-pointer rounded px-2 py-1 bg-[var(--aethel-surface-tertiary)]/40 hover:bg-blue-950/40 hover:text-blue-200 border border-transparent hover:border-blue-500/30 transition-all flex items-center justify-between"
                  >
                    <span>Set Actor Location</span>
                    <Plus className="h-3 w-3 opacity-60" />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Physics & Impulse
                </span>
                <div className="space-y-1 pl-1">
                  <div
                    onClick={() => {
                      const newNode: BlueprintNode = {
                        id: `node-${Date.now()}`,
                        title: 'Add Radial Impulse',
                        category: 'physics',
                        x: 250,
                        y: 250,
                        inputs: [
                          { id: 'in-exec', name: 'Exec', type: 'exec', isInput: true },
                          { id: 'in-origin', name: 'Origin', type: 'vector3', isInput: true },
                          { id: 'in-radius', name: 'Radius', type: 'number', isInput: true, defaultValue: 500 },
                          { id: 'in-strength', name: 'Strength', type: 'number', isInput: true, defaultValue: 2500 },
                        ],
                        outputs: [{ id: 'out-exec', name: 'Exec', type: 'exec', isInput: false }],
                      }
                      setNodes([...nodes, newNode])
                    }}
                    className="cursor-pointer rounded px-2 py-1 bg-[var(--aethel-surface-tertiary)]/40 hover:bg-amber-950/40 hover:text-amber-200 border border-transparent hover:border-amber-500/30 transition-all flex items-center justify-between"
                  >
                    <span>Add Radial Impulse</span>
                    <Plus className="h-3 w-3 opacity-60" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Interactive Node Canvas */}
        <main
          ref={canvasRef}
          onPointerDown={handlePointerDownCanvas}
          className="relative flex-1 overflow-hidden bg-slate-950 cursor-crosshair"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px), radial-gradient(circle, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px, 8px 8px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* SVG Connection Cables Layer */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ zIndex: 5 }}>
            {connections.map((c) => {
              const start = getPinCoordinate(c.fromNodeId, c.fromPinId, false)
              const end = getPinCoordinate(c.toNodeId, c.toPinId, true)
              const fromNode = nodes.find((n) => n.id === c.fromNodeId)
              const fromPin = fromNode?.outputs.find((p) => p.id === c.fromPinId)
              const strokeColor = fromPin ? PIN_COLORS[fromPin.type].stroke : '#ffffff'
              const isExec = fromPin?.type === 'exec'

              const dx = Math.abs(end.x - start.x) * 0.5
              const pathD = `M ${start.x} ${start.y} C ${start.x + Math.max(dx, 40)} ${start.y}, ${end.x - Math.max(dx, 40)} ${end.y}, ${end.x} ${end.y}`

              return (
                <g key={c.id}>
                  {/* Outer Glow */}
                  <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={isExec ? 4 : 3} opacity={0.3} />
                  {/* Core Wire */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isExec ? 2.5 : 2}
                    strokeDasharray={isSimulating && isExec ? '6 6' : undefined}
                    className={isSimulating && isExec ? 'animate-pulse' : ''}
                  />
                </g>
              )
            })}

            {/* In-Flight Dragging Wire */}
            {draggingPin && dragMousePos && (
              <path
                d={`M ${getPinCoordinate(draggingPin.nodeId, draggingPin.pinId, draggingPin.isInput).x} ${
                  getPinCoordinate(draggingPin.nodeId, draggingPin.pinId, draggingPin.isInput).y
                } L ${dragMousePos.x} ${dragMousePos.y}`}
                fill="none"
                stroke={PIN_COLORS[draggingPin.type].stroke}
                strokeWidth={2.5}
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* Node Render Layer */}
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id
              const headerStyle = CATEGORY_HEADER_STYLES[node.category]

              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => handlePointerDownNode(node, e)}
                  className={`absolute rounded-xl border bg-slate-900 shadow-2xl transition-shadow select-none w-56 ${
                    isSelected ? 'ring-2 ring-blue-500 border-blue-400 shadow-blue-500/20' : 'border-slate-700/60'
                  }`}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    zIndex: isSelected ? 20 : 10,
                  }}
                >
                  {/* Node Header */}
                  <div
                    className={`flex items-center justify-between rounded-t-xl px-3 py-2 border-b ${headerStyle.bg} ${headerStyle.border}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`h-2 w-2 rounded-full ${headerStyle.text} bg-current`} />
                      <span className={`text-xs font-bold truncate ${headerStyle.text}`}>{node.title}</span>
                    </div>
                  </div>

                  {/* Node Pins (Inputs left, Outputs right) */}
                  <div className="p-2.5 space-y-2">
                    {/* Max rows among inputs & outputs */}
                    {Array.from({ length: Math.max(node.inputs.length, node.outputs.length) }).map((_, idx) => {
                      const inPin = node.inputs[idx]
                      const outPin = node.outputs[idx]

                      return (
                        <div key={idx} className="flex items-center justify-between min-h-[20px] text-xs">
                          {/* Input Pin */}
                          {inPin ? (
                            <div className="flex items-center gap-1.5">
                              <div
                                onPointerDown={(e) => {
                                  e.stopPropagation()
                                  setDraggingPin({
                                    nodeId: node.id,
                                    pinId: inPin.id,
                                    isInput: true,
                                    type: inPin.type,
                                  })
                                }}
                                className={`h-3 w-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-125 ${
                                  PIN_COLORS[inPin.type].border
                                } ${PIN_COLORS[inPin.type].bg}`}
                              />
                              <span className="font-mono text-[11px] text-[var(--aethel-text-secondary)]">{inPin.name}</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          {/* Output Pin */}
                          {outPin ? (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="font-mono text-[11px] text-[var(--aethel-text-secondary)]">{outPin.name}</span>
                              <div
                                onPointerDown={(e) => {
                                  e.stopPropagation()
                                  setDraggingPin({
                                    nodeId: node.id,
                                    pinId: outPin.id,
                                    isInput: false,
                                    type: outPin.type,
                                  })
                                }}
                                className={`h-3 w-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-125 ${
                                  PIN_COLORS[outPin.type].border
                                } ${PIN_COLORS[outPin.type].bg}`}
                              />
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </main>

        {/* Right Side: Node Details & Pin Inspector */}
        <aside className="flex w-72 flex-col border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] mb-3 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" /> Node Details
          </h2>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] p-3">
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block">
                  Node Title
                </span>
                <span className="font-semibold text-sm text-[var(--aethel-text-primary)]">{selectedNode.title}</span>
                <span className="text-[11px] text-[var(--aethel-text-secondary)] block mt-0.5 capitalize">
                  Category: {selectedNode.category}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--aethel-text-secondary)] block mb-1.5">
                  Input Parameters ({selectedNode.inputs.length})
                </span>
                <div className="space-y-2">
                  {selectedNode.inputs.map((pin) => (
                    <div
                      key={pin.id}
                      className="rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]/60 p-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-[var(--aethel-text-primary)]">{pin.name || 'Exec'}</span>
                        <span className={`text-[10px] uppercase font-bold ${PIN_COLORS[pin.type].text}`}>
                          {pin.type}
                        </span>
                      </div>
                      {pin.defaultValue !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Default:</span>
                          <span className="font-mono text-xs text-[var(--aethel-text-primary)]">
                            {String(pin.defaultValue)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setNodes(nodes.filter((n) => n.id !== selectedNode.id))
                    setConnections(
                      connections.filter((c) => c.fromNodeId !== selectedNode.id && c.toNodeId !== selectedNode.id),
                    )
                    setSelectedNodeId(null)
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/40 bg-red-950/40 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Node
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-[var(--aethel-text-tertiary)] p-4">
              <MousePointer className="h-8 w-8 stroke-1 mb-2 opacity-40" />
              <p className="text-xs">Select any node in the graph to inspect inputs, parameters and flow properties.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
