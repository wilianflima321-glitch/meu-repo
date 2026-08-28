'use client'

import React, { useState, useMemo } from 'react'
import {
  GitFork,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Sliders,
  Shield,
  Zap,
  Activity,
  CheckCircle2,
  HelpCircle,
  FolderPlus,
  Crosshair,
  Footprints,
  Eye,
  Clock,
  Radio,
  Search,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type BTNodeType = 'root' | 'selector' | 'sequence' | 'decorator' | 'service' | 'task'

export interface BlackboardKey {
  id: string
  name: string
  type: 'boolean' | 'vector3' | 'actor' | 'number' | 'enum'
  defaultValue?: string | number | boolean
}

export interface BTNode {
  id: string
  type: BTNodeType
  title: string
  category: 'composite' | 'decorator' | 'task' | 'root'
  description?: string
  x: number
  y: number
  childrenIds?: string[]
  decoratorDetails?: {
    conditionKey: string
    operator: '==' | '!=' | 'is_set' | 'is_not_set'
    abortMode: 'None' | 'Self' | 'LowerPriority' | 'Both'
  }
  taskDetails?: {
    action: 'MoveTo' | 'AttackTarget' | 'FindCover' | 'PatrolWaypoints' | 'PlayMontage' | 'Wait'
    parameters: Record<string, string | number | boolean>
  }
  executionState?: 'idle' | 'running' | 'success' | 'failed'
}

const INITIAL_BLACKBOARD: BlackboardKey[] = [
  { id: 'bb-target', name: 'TargetEnemyActor', type: 'actor' },
  { id: 'bb-has-los', name: 'bHasLineOfSight', type: 'boolean', defaultValue: false },
  { id: 'bb-health', name: 'CurrentHealthPct', type: 'number', defaultValue: 100 },
  { id: 'bb-cover-pos', name: 'NearestCoverLocation', type: 'vector3' },
]

const INITIAL_BT_NODES: BTNode[] = [
  {
    id: 'node-root',
    type: 'root',
    category: 'root',
    title: 'Root',
    description: 'Entry point for AI decision loop (60Hz)',
    x: 60,
    y: 200,
    childrenIds: ['node-sel-main'],
  },
  {
    id: 'node-sel-main',
    type: 'selector',
    category: 'composite',
    title: 'Selector (Combat / Patrol)',
    description: 'Tries combat sequence first; falls back to patrol',
    x: 280,
    y: 200,
    childrenIds: ['node-seq-combat', 'node-seq-patrol'],
  },
  {
    id: 'node-seq-combat',
    type: 'sequence',
    category: 'composite',
    title: 'Sequence (Engage Target)',
    description: 'Executes when bHasLineOfSight is TRUE',
    x: 540,
    y: 100,
    childrenIds: ['node-task-moveto', 'node-task-attack'],
  },
  {
    id: 'node-task-moveto',
    type: 'task',
    category: 'task',
    title: 'Task: MoveTo (Target)',
    description: 'NavMesh pathfinding towards TargetEnemyActor',
    taskDetails: {
      action: 'MoveTo',
      parameters: { acceptableRadius: 250, allowStrafe: true },
    },
    x: 820,
    y: 40,
  },
  {
    id: 'node-task-attack',
    type: 'task',
    category: 'task',
    title: 'Task: AttackTarget',
    description: 'Executes primary weapon firing montage',
    taskDetails: {
      action: 'AttackTarget',
      parameters: { burstCount: 3, weaponSlot: 'Primary' },
    },
    x: 820,
    y: 160,
  },
  {
    id: 'node-seq-patrol',
    type: 'sequence',
    category: 'composite',
    title: 'Sequence (Idle Patrol)',
    description: 'Loops through designated level waypoints',
    x: 540,
    y: 300,
    childrenIds: ['node-task-patrol', 'node-task-wait'],
  },
  {
    id: 'node-task-patrol',
    type: 'task',
    category: 'task',
    title: 'Task: PatrolWaypoints',
    description: 'Walks between PatrolRoute_A markers',
    taskDetails: {
      action: 'PatrolWaypoints',
      parameters: { routeName: 'PatrolRoute_Alpha', speedMps: 3.5 },
    },
    x: 820,
    y: 280,
  },
  {
    id: 'node-task-wait',
    type: 'task',
    category: 'task',
    title: 'Task: Wait (3s)',
    description: 'Pauses at waypoint before continuing',
    taskDetails: {
      action: 'Wait',
      parameters: { durationSec: 3.0, randomDeviationSec: 0.5 },
    },
    x: 820,
    y: 400,
  },
]

export default function BehaviorTreeStudio() {
  const [nodes, setNodes] = useState<BTNode[]>(INITIAL_BT_NODES)
  const [blackboard, setBlackboard] = useState<BlackboardKey[]>(INITIAL_BLACKBOARD)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-sel-main')
  const [isSimulating, setIsSimulating] = useState(false)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || nodes[0], [nodes, selectedNodeId])

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Main Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <GitFork className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              AI Behavior Tree & Environment Query System (EQS)
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Decision Trees, Blackboard Keys, Task Decorators & Autonomous NPC Logic
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all ${
              isSimulating
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" /> Stop AI Sim
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" /> Run Behavior Tree
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Studio Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Blackboard Key Manager */}
        <aside className="w-64 flex flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)]">
              Blackboard Keys ({blackboard.length})
            </span>
            <button
              onClick={() => {
                const newKey: BlackboardKey = {
                  id: `bb-${Date.now()}`,
                  name: `Key_${blackboard.length + 1}`,
                  type: 'boolean',
                  defaultValue: false,
                }
                setBlackboard([...blackboard, newKey])
              }}
              className="flex h-5 w-5 items-center justify-center rounded bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto">
            {blackboard.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs bg-[var(--aethel-surface-tertiary)]/50 hover:bg-[var(--aethel-surface-tertiary)]"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-emerald-300 truncate">{key.name}</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--aethel-text-tertiary)] uppercase">{key.type}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Graph Canvas */}
        <main
          className="relative flex-1 overflow-auto bg-slate-950 p-8"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="relative w-[1400px] h-[800px]">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`absolute w-60 rounded-xl border bg-slate-900/95 p-3 shadow-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-emerald-400 shadow-emerald-500/20'
                      : 'border-slate-700/60 hover:border-slate-500'
                  }`}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                >
                  {/* Node Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                    <span className="text-xs font-bold text-slate-200 truncate">{node.title}</span>
                    <span
                      className={`text-[9px] font-mono uppercase rounded px-1.5 py-0.5 ${
                        node.category === 'composite' || node.type === 'selector' || node.type === 'sequence'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                          : node.type === 'task'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {node.type}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{node.description}</p>
                </div>
              )
            })}
          </div>
        </main>

        {/* Right: Node Details Inspector */}
        <aside className="w-80 flex flex-col border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 overflow-y-auto space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" /> Node Inspector
          </h2>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                  Node Title
                </span>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => {
                    const val = e.target.value
                    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n)))
                  }}
                  className="h-7 w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 font-semibold text-xs text-[var(--aethel-text-primary)]"
                />
              </div>

              <div>
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block mb-1">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={selectedNode.description || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setNodes(nodes.map((n) => (n.id === selectedNode.id ? { ...n, description: val } : n)))
                  }}
                  className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] p-2 text-xs text-[var(--aethel-text-primary)] focus:outline-none"
                />
              </div>

              {selectedNode.taskDetails && (
                <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]/50 p-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Task Parameters
                  </span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--aethel-text-secondary)]">Action:</span>
                      <span className="text-emerald-300">{selectedNode.taskDetails.action}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
