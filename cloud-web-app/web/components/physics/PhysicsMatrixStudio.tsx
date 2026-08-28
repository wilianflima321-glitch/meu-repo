'use client'

import React, { useState } from 'react'
import {
  Shield,
  Layers,
  Sliders,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Box,
  Flame,
  Volume2,
  Settings,
  Plus,
  Trash2,
  Info,
  CircleDot,
  Maximize2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type CollisionResponse = 'ignore' | 'overlap' | 'block'

export type CollisionChannel =
  | 'WorldStatic'
  | 'WorldDynamic'
  | 'Pawn'
  | 'Visibility'
  | 'Camera'
  | 'PhysicsBody'
  | 'Vehicle'
  | 'Destructible'
  | 'Projectile'
  | 'TriggerVolume'

export interface PhysicalMaterial {
  id: string
  name: string
  staticFriction: number // 0..2
  dynamicFriction: number // 0..2
  restitution: number // 0..1 (bounciness)
  densityKgM3: number // 100..20,000 kg/m^3
  frictionCombineMode: 'Average' | 'Min' | 'Multiply' | 'Max'
  restitutionCombineMode: 'Average' | 'Min' | 'Multiply' | 'Max'
  surfaceType: 'Concrete' | 'Metal' | 'Wood' | 'Flesh' | 'Glass' | 'Water' | 'Mud' | 'Ice' | 'Rubber'
  impactSoundCue: string
  impactVfxEmitter: string
}

export interface JointConstraintConfig {
  id: string
  name: string
  type: 'Spherical' | 'Revolute' | 'Prismatic' | 'Distance' | 'XPBD_Muscle'
  linearStiffness: number
  angularStiffness: number
  linearDamping: number
  angularDamping: number
  swingLimitDeg: number // 0..180°
  twistLimitDeg: number // 0..180°
  isBreakable: boolean
  breakForceThresholdN: number
}

// Default Collision Channels
const COLLISION_CHANNELS: CollisionChannel[] = [
  'WorldStatic',
  'WorldDynamic',
  'Pawn',
  'Visibility',
  'Camera',
  'PhysicsBody',
  'Vehicle',
  'Destructible',
  'Projectile',
  'TriggerVolume',
]

// Default Physical Materials Library
const INITIAL_MATERIALS: PhysicalMaterial[] = [
  {
    id: 'mat-concrete',
    name: 'PhysMat_Concrete',
    staticFriction: 0.8,
    dynamicFriction: 0.6,
    restitution: 0.15,
    densityKgM3: 2400,
    frictionCombineMode: 'Average',
    restitutionCombineMode: 'Average',
    surfaceType: 'Concrete',
    impactSoundCue: 'Cue_Impact_Concrete_Heavy',
    impactVfxEmitter: 'NS_Concrete_Debris',
  },
  {
    id: 'mat-metal',
    name: 'PhysMat_Titanium',
    staticFriction: 0.4,
    dynamicFriction: 0.3,
    restitution: 0.25,
    densityKgM3: 4500,
    frictionCombineMode: 'Min',
    restitutionCombineMode: 'Average',
    surfaceType: 'Metal',
    impactSoundCue: 'Cue_Impact_Metal_Sparks',
    impactVfxEmitter: 'NS_Sparks_Ricochet',
  },
  {
    id: 'mat-ice',
    name: 'PhysMat_GlacialIce',
    staticFriction: 0.05,
    dynamicFriction: 0.02,
    restitution: 0.1,
    densityKgM3: 917,
    frictionCombineMode: 'Min',
    restitutionCombineMode: 'Min',
    surfaceType: 'Ice',
    impactSoundCue: 'Cue_Footstep_Ice_Crack',
    impactVfxEmitter: 'NS_Ice_Shards',
  },
  {
    id: 'mat-rubber',
    name: 'PhysMat_HighBounceRubber',
    staticFriction: 0.9,
    dynamicFriction: 0.75,
    restitution: 0.88,
    densityKgM3: 1100,
    frictionCombineMode: 'Multiply',
    restitutionCombineMode: 'Max',
    surfaceType: 'Rubber',
    impactSoundCue: 'Cue_Impact_Rubber_Thud',
    impactVfxEmitter: 'NS_Dust_Puff',
  },
]

// Initial Matrix State
const INITIAL_MATRIX: Record<CollisionChannel, Record<CollisionChannel, CollisionResponse>> = {
  WorldStatic: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'block',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'ignore',
  },
  WorldDynamic: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'overlap',
  },
  Pawn: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'overlap',
  },
  Visibility: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'ignore',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'ignore',
    TriggerVolume: 'ignore',
  },
  Camera: {
    WorldStatic: 'block',
    WorldDynamic: 'ignore',
    Pawn: 'ignore',
    Visibility: 'ignore',
    Camera: 'ignore',
    PhysicsBody: 'ignore',
    Vehicle: 'ignore',
    Destructible: 'ignore',
    Projectile: 'ignore',
    TriggerVolume: 'ignore',
  },
  PhysicsBody: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'overlap',
  },
  Vehicle: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'overlap',
  },
  Destructible: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'block',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'block',
    TriggerVolume: 'overlap',
  },
  Projectile: {
    WorldStatic: 'block',
    WorldDynamic: 'block',
    Pawn: 'block',
    Visibility: 'ignore',
    Camera: 'ignore',
    PhysicsBody: 'block',
    Vehicle: 'block',
    Destructible: 'block',
    Projectile: 'overlap',
    TriggerVolume: 'overlap',
  },
  TriggerVolume: {
    WorldStatic: 'ignore',
    WorldDynamic: 'overlap',
    Pawn: 'overlap',
    Visibility: 'ignore',
    Camera: 'ignore',
    PhysicsBody: 'overlap',
    Vehicle: 'overlap',
    Destructible: 'overlap',
    Projectile: 'overlap',
    TriggerVolume: 'ignore',
  },
}

type TabMode = 'matrix' | 'materials' | 'joints'

export default function PhysicsMatrixStudio() {
  const [activeTab, setActiveTab] = useState<TabMode>('matrix')
  const [matrix, setMatrix] = useState(INITIAL_MATRIX)
  const [materials, setMaterials] = useState<PhysicalMaterial[]>(INITIAL_MATERIALS)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('mat-concrete')

  const toggleResponse = (chA: CollisionChannel, chB: CollisionChannel) => {
    const current = matrix[chA][chB]
    const next: CollisionResponse = current === 'block' ? 'overlap' : current === 'overlap' ? 'ignore' : 'block'

    setMatrix((prev) => ({
      ...prev,
      [chA]: { ...prev[chA], [chB]: next },
      [chB]: { ...prev[chB], [chA]: next },
    }))
  }

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0]

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Main Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Chaos Physics & Collision Matrix Studio
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Channel Interactions, Physical Materials, Restitution & XPBD Muscle Joints
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-xs text-amber-400 font-medium">
            <Activity className="h-3.5 w-3.5" />
            <span>Rapier/Chaos 60Hz Physics (Zero-Copy)</span>
          </div>
        </div>
      </header>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex h-10 shrink-0 border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/60 px-4">
        <div className="flex gap-1 overflow-x-auto py-1">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'matrix'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Collision Response Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'materials'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>Physical Materials Library</span>
          </button>

          <button
            onClick={() => setActiveTab('joints')}
            className={`flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              activeTab === 'joints'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>XPBD Constraints & Ragdoll</span>
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* TAB 1: COLLISION MATRIX */}
        {activeTab === 'matrix' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
                    Channel-to-Channel Collision Responses
                  </h2>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Click any cell to cycle between Block (B), Overlap (O) and Ignore (I).
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Block
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-amber-500" /> Overlap
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-slate-700" /> Ignore
                  </span>
                </div>
              </div>

              {/* Response Matrix Grid Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]/50">
                      <th className="p-2.5 text-left font-semibold text-[var(--aethel-text-secondary)]">Channel</th>
                      {COLLISION_CHANNELS.map((col) => (
                        <th key={col} className="p-2.5 text-center font-mono text-[11px] text-[var(--aethel-text-secondary)]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COLLISION_CHANNELS.map((row) => (
                      <tr
                        key={row}
                        className="border-b border-[var(--aethel-border-subtle)]/50 hover:bg-[var(--aethel-surface-tertiary)]/30"
                      >
                        <td className="p-2.5 font-medium text-[var(--aethel-text-primary)] bg-[var(--aethel-surface-secondary)]/80">
                          {row}
                        </td>
                        {COLLISION_CHANNELS.map((col) => {
                          const resp = matrix[row][col]
                          return (
                            <td key={col} className="p-1.5 text-center">
                              <button
                                onClick={() => toggleResponse(row, col)}
                                className={`h-7 w-full rounded font-mono font-bold text-[10px] uppercase transition-all ${
                                  resp === 'block'
                                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                                    : resp === 'overlap'
                                      ? 'bg-amber-950/60 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
                                      : 'bg-slate-900/60 border border-slate-700/50 text-slate-400 hover:bg-slate-800'
                                }`}
                              >
                                {resp === 'block' ? 'Block' : resp === 'overlap' ? 'Overlap' : 'Ignore'}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PHYSICAL MATERIALS */}
        {activeTab === 'materials' && (
          <div className="flex flex-1 overflow-hidden">
            {/* Left Material List */}
            <aside className="w-64 border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-3 overflow-y-auto space-y-1">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)]">
                  Materials ({materials.length})
                </span>
                <button
                  onClick={() => {
                    const newMat: PhysicalMaterial = {
                      id: `mat-${Date.now()}`,
                      name: `PhysMat_NewMaterial_${materials.length + 1}`,
                      staticFriction: 0.5,
                      dynamicFriction: 0.4,
                      restitution: 0.3,
                      densityKgM3: 1000,
                      frictionCombineMode: 'Average',
                      restitutionCombineMode: 'Average',
                      surfaceType: 'Concrete',
                      impactSoundCue: 'Cue_Impact_Default',
                      impactVfxEmitter: 'NS_Impact_Default',
                    }
                    setMaterials([...materials, newMat])
                    setSelectedMaterialId(newMat.id)
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded bg-[var(--aethel-surface-tertiary)] hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-primary)]"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              {materials.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMaterialId(m.id)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs transition-all ${
                    selectedMaterialId === m.id
                      ? 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
                      : 'border border-transparent hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  <span className="font-mono font-medium truncate">{m.name}</span>
                  <span className="text-[10px] text-[var(--aethel-text-tertiary)] capitalize">{m.surfaceType}</span>
                </div>
              ))}
            </aside>

            {/* Right Material Inspector */}
            <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
              <div className="border-b border-[var(--aethel-border-subtle)] pb-3">
                <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">{selectedMaterial.name}</h2>
                <p className="text-xs text-[var(--aethel-text-tertiary)]">
                  Friction parameters, restitution restitution coefficients and dynamic audio/VFX impact triggers.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">Static Friction</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={selectedMaterial.staticFriction}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setMaterials(materials.map((m) => (m.id === selectedMaterial.id ? { ...m, staticFriction: val } : m)))
                      }}
                      className="w-full h-8 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 font-mono text-xs text-[var(--aethel-text-primary)]"
                    />
                  </div>

                  <div>
                    <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">Dynamic Friction</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={selectedMaterial.dynamicFriction}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setMaterials(materials.map((m) => (m.id === selectedMaterial.id ? { ...m, dynamicFriction: val } : m)))
                      }}
                      className="w-full h-8 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 font-mono text-xs text-[var(--aethel-text-primary)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">Restitution (Bounciness)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={selectedMaterial.restitution}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setMaterials(materials.map((m) => (m.id === selectedMaterial.id ? { ...m, restitution: val } : m)))
                      }}
                      className="w-full h-8 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 font-mono text-xs text-[var(--aethel-text-primary)]"
                    />
                  </div>

                  <div>
                    <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">Density (kg/m³)</span>
                    <input
                      type="number"
                      step="50"
                      min="50"
                      max="20000"
                      value={selectedMaterial.densityKgM3}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setMaterials(materials.map((m) => (m.id === selectedMaterial.id ? { ...m, densityKgM3: val } : m)))
                      }}
                      className="w-full h-8 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 font-mono text-xs text-[var(--aethel-text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-[var(--aethel-text-secondary)] block mb-1">MetaSounds Impact Sound Cue</span>
                  <input
                    type="text"
                    value={selectedMaterial.impactSoundCue}
                    onChange={(e) => {
                      const val = e.target.value
                      setMaterials(materials.map((m) => (m.id === selectedMaterial.id ? { ...m, impactSoundCue: val } : m)))
                    }}
                    className="w-full h-8 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 font-mono text-xs text-[var(--aethel-text-primary)]"
                  />
                </div>
              </div>
            </main>
          </div>
        )}

        {/* TAB 3: XPBD JOINTS */}
        {activeTab === 'joints' && (
          <div className="flex-1 p-6 space-y-6 max-w-4xl">
            <div className="border-b border-[var(--aethel-border-subtle)] pb-3">
              <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">
                Extended Position-Based Dynamics (XPBD) Constraints
              </h2>
              <p className="text-xs text-[var(--aethel-text-tertiary)]">
                Muscle actuator compliance, angular spring limits, dynamic balance torque and active ragdoll solver (Lei III).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Pelvis / Spine XPBD Joint Actuator
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Angular Stiffness</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">15,000 N·m/rad</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Angular Damping</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">450 N·s/m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Swing Limit Cone</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">45.0°</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Dynamic Balance Controller (Euphoria Parity)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Center of Mass Tracking</span>
                    <span className="font-mono text-emerald-400">Active (60Hz)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Fall Recovery Stepping</span>
                    <span className="font-mono text-emerald-400">Enabled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--aethel-text-secondary)]">Impact Energy Absorption</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">85%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
