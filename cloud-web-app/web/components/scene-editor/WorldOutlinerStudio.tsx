'use client'

import React, { useState, useMemo } from 'react'
import {
  Layers,
  Folder,
  FolderPlus,
  Box,
  Sun,
  Camera,
  Volume2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Move,
  RotateCw,
  Maximize2,
  Copy,
  Sliders,
  MoreVertical,
  Check,
  CircleDot,
  Radio,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type ActorClass =
  | 'StaticMeshActor'
  | 'DirectionalLight'
  | 'PointLight'
  | 'SpotLight'
  | 'CameraActor'
  | 'PlayerStart'
  | 'AudioEmitter'
  | 'NiagaraVFXActor'
  | 'TriggerVolume'
  | 'PostProcessVolume'

export interface ActorComponentNode {
  id: string
  name: string
  type: string
  isRoot?: boolean
}

export interface WorldActor {
  id: string
  name: string
  actorClass: ActorClass
  folderId?: string | null
  visible: boolean
  locked: boolean
  castShadows: boolean
  collisionEnabled: boolean
  tags: string[]
  layer: string
  transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  components: ActorComponentNode[]
}

export interface OutlinerFolder {
  id: string
  name: string
  expanded: boolean
  color?: string
}

// Initial Mock Level Actors
const INITIAL_FOLDERS: OutlinerFolder[] = [
  { id: 'f-lighting', name: 'Environment & Lighting', expanded: true },
  { id: 'f-geometry', name: 'Static Architecture', expanded: true },
  { id: 'f-gameplay', name: 'Spawners & Triggers', expanded: true },
  { id: 'f-fx', name: 'Atmosphere & Particles', expanded: true },
]

const INITIAL_ACTORS: WorldActor[] = [
  {
    id: 'actor-sun',
    name: 'DirectionalLight_Sun',
    actorClass: 'DirectionalLight',
    folderId: 'f-lighting',
    visible: true,
    locked: true,
    castShadows: true,
    collisionEnabled: false,
    tags: ['Lighting', 'PrimarySun'],
    layer: 'Lighting',
    transform: { position: [0, 500, 0], rotation: [-58, 215, 0], scale: [1, 1, 1] },
    components: [
      { id: 'c1', name: 'RootComponent', type: 'SceneComponent', isRoot: true },
      { id: 'c2', name: 'DirectionalLightComponent', type: 'DirectionalLightComponent' },
    ],
  },
  {
    id: 'actor-camera-main',
    name: 'CineCameraActor_Hero',
    actorClass: 'CameraActor',
    folderId: 'f-lighting',
    visible: true,
    locked: false,
    castShadows: false,
    collisionEnabled: false,
    tags: ['Camera', 'Cinematic'],
    layer: 'Cameras',
    transform: { position: [0, 180, -350], rotation: [-10, 0, 0], scale: [1, 1, 1] },
    components: [
      { id: 'c3', name: 'RootComponent', type: 'SceneComponent', isRoot: true },
      { id: 'c4', name: 'CineCameraComponent', type: 'CineCameraComponent' },
    ],
  },
  {
    id: 'actor-ground',
    name: 'SM_ModularFloor_PBR_01',
    actorClass: 'StaticMeshActor',
    folderId: 'f-geometry',
    visible: true,
    locked: false,
    castShadows: true,
    collisionEnabled: true,
    tags: ['Architecture', 'Floor', 'PBR'],
    layer: 'Default',
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [10, 1, 10] },
    components: [
      { id: 'c5', name: 'RootComponent', type: 'SceneComponent', isRoot: true },
      { id: 'c6', name: 'StaticMeshComponent', type: 'StaticMeshComponent' },
    ],
  },
  {
    id: 'actor-spawnpoint',
    name: 'PlayerStart_Alpha',
    actorClass: 'PlayerStart',
    folderId: 'f-gameplay',
    visible: true,
    locked: false,
    castShadows: false,
    collisionEnabled: false,
    tags: ['Spawn', 'TeamAlpha'],
    layer: 'Gameplay',
    transform: { position: [0, 100, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    components: [
      { id: 'c7', name: 'RootComponent', type: 'SceneComponent', isRoot: true },
      { id: 'c8', name: 'CapsuleComponent', type: 'CapsuleComponent' },
    ],
  },
  {
    id: 'actor-sparks',
    name: 'NS_Sparks_Generator_01',
    actorClass: 'NiagaraVFXActor',
    folderId: 'f-fx',
    visible: true,
    locked: false,
    castShadows: false,
    collisionEnabled: false,
    tags: ['VFX', 'Particles'],
    layer: 'FX',
    transform: { position: [150, 40, 200], rotation: [0, 45, 0], scale: [1, 1, 1] },
    components: [
      { id: 'c9', name: 'RootComponent', type: 'SceneComponent', isRoot: true },
      { id: 'c10', name: 'NiagaraComponent', type: 'NiagaraComponent' },
    ],
  },
]

const ACTOR_ICONS: Record<ActorClass, React.ComponentType<{ className?: string }>> = {
  StaticMeshActor: Box,
  DirectionalLight: Sun,
  PointLight: Sparkles,
  SpotLight: Sun,
  CameraActor: Camera,
  PlayerStart: CircleDot,
  AudioEmitter: Volume2,
  NiagaraVFXActor: Sparkles,
  TriggerVolume: Radio,
  PostProcessVolume: Sliders,
}

export default function WorldOutlinerStudio() {
  const [folders, setFolders] = useState<OutlinerFolder[]>(INITIAL_FOLDERS)
  const [actors, setActors] = useState<WorldActor[]>(INITIAL_ACTORS)
  const [selectedActorIds, setSelectedActorIds] = useState<string[]>(['actor-ground'])
  const [searchFilter, setSearchFilter] = useState('')
  const [activeLayerFilter, setActiveLayerFilter] = useState<string>('All')

  const toggleFolder = (folderId: string) => {
    setFolders(folders.map((f) => (f.id === folderId ? { ...f, expanded: !f.expanded } : f)))
  }

  const toggleVisibility = (actorId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActors(actors.map((a) => (a.id === actorId ? { ...a, visible: !a.visible } : a)))
  }

  const toggleLock = (actorId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActors(actors.map((a) => (a.id === actorId ? { ...a, locked: !a.locked } : a)))
  }

  const handleActorClick = (actorId: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey) {
      if (selectedActorIds.includes(actorId)) {
        setSelectedActorIds(selectedActorIds.filter((id) => id !== actorId))
      } else {
        setSelectedActorIds([...selectedActorIds, actorId])
      }
    } else {
      setSelectedActorIds([actorId])
    }
  }

  const filteredActors = useMemo(() => {
    return actors.filter((actor) => {
      const matchSearch =
        actor.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        actor.actorClass.toLowerCase().includes(searchFilter.toLowerCase()) ||
        actor.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()))

      const matchLayer = activeLayerFilter === 'All' || actor.layer === activeLayerFilter

      return matchSearch && matchLayer
    })
  }, [actors, searchFilter, activeLayerFilter])

  const primarySelectedActor = useMemo(
    () => actors.find((a) => a.id === selectedActorIds[0]),
    [actors, selectedActorIds],
  )

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Header Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              World Outliner & Scene Hierarchy Studio
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Actor Scene Graph, Component Trees, Transform Matrix & World Partitioning
            </p>
          </div>
        </div>

        {/* Quick Actor Spawner Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const newActor: WorldActor = {
                id: `actor-${Date.now()}`,
                name: `SM_StaticMesh_${actors.length + 1}`,
                actorClass: 'StaticMeshActor',
                folderId: 'f-geometry',
                visible: true,
                locked: false,
                castShadows: true,
                collisionEnabled: true,
                tags: ['Mesh'],
                layer: 'Default',
                transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
                components: [
                  { id: `c-${Date.now()}-1`, name: 'RootComponent', type: 'SceneComponent', isRoot: true },
                  { id: `c-${Date.now()}-2`, name: 'StaticMeshComponent', type: 'StaticMeshComponent' },
                ],
              }
              setActors([...actors, newActor])
              setSelectedActorIds([newActor.id])
            }}
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Plus className="h-3 w-3" /> Add Mesh
          </button>

          <button
            onClick={() => {
              const newFolder: OutlinerFolder = {
                id: `f-${Date.now()}`,
                name: `Folder_${folders.length + 1}`,
                expanded: true,
              }
              setFolders([...folders, newFolder])
            }}
            className="flex h-7 items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 text-xs font-medium text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]"
          >
            <FolderPlus className="h-3 w-3" /> New Folder
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: World Outliner Hierarchy List */}
        <div className="flex flex-1 flex-col border-r border-[var(--aethel-border-subtle)]">
          {/* Search & Filter Header */}
          <div className="flex items-center gap-2 border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/50 p-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
              <input
                type="text"
                placeholder="Search Actors by Name, Class or Tag..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-7 w-full rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] pl-8 pr-2 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:border-emerald-500/60 focus:outline-none"
              />
            </div>

            <span className="text-[11px] font-mono text-[var(--aethel-text-tertiary)] shrink-0">
              {filteredActors.length} / {actors.length} Actors
            </span>
          </div>

          {/* Hierarchy Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {folders.map((folder) => {
              const folderActors = filteredActors.filter((a) => a.folderId === folder.id)

              return (
                <div key={folder.id} className="space-y-0.5">
                  {/* Folder Header */}
                  <div
                    onClick={() => toggleFolder(folder.id)}
                    className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs font-semibold text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]/60"
                  >
                    <div className="flex items-center gap-1.5">
                      {folder.expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                      )}
                      <Folder className="h-3.5 w-3.5 text-amber-400" />
                      <span>{folder.name}</span>
                      <span className="text-[10px] font-normal text-[var(--aethel-text-tertiary)]">
                        ({folderActors.length})
                      </span>
                    </div>
                  </div>

                  {/* Folder Children */}
                  {folder.expanded && (
                    <div className="pl-4 space-y-0.5 border-l border-[var(--aethel-border-subtle)]/40 ml-3">
                      {folderActors.map((actor) => {
                        const Icon = ACTOR_ICONS[actor.actorClass] || Box
                        const isSelected = selectedActorIds.includes(actor.id)

                        return (
                          <div
                            key={actor.id}
                            onClick={(e) => handleActorClick(actor.id, e)}
                            className={`flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                : 'hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Icon className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)] shrink-0" />
                              <span className="font-mono font-medium truncate text-[var(--aethel-text-primary)]">
                                {actor.name}
                              </span>
                              <span className="text-[10px] text-[var(--aethel-text-tertiary)] shrink-0">
                                [{actor.actorClass}]
                              </span>
                            </div>

                            {/* Status Icons */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => toggleVisibility(actor.id, e)}
                                className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                              >
                                {actor.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                              <button
                                onClick={(e) => toggleLock(actor.id, e)}
                                className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                              >
                                {actor.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5 opacity-40" />}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Inspector Details for Selected Actor */}
        <aside className="w-80 flex flex-col bg-[var(--aethel-surface-secondary)] p-4 overflow-y-auto space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" /> Actor Details
          </h2>

          {primarySelectedActor ? (
            <div className="space-y-4 text-xs">
              {/* Actor Identity */}
              <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] p-3">
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block">Actor Name</span>
                <input
                  type="text"
                  value={primarySelectedActor.name}
                  onChange={(e) => {
                    const val = e.target.value
                    setActors(actors.map((a) => (a.id === primarySelectedActor.id ? { ...a, name: val } : a)))
                  }}
                  className="mt-1 h-7 w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 font-mono text-xs text-[var(--aethel-text-primary)]"
                />
                <span className="text-[11px] text-[var(--aethel-text-tertiary)] block mt-1">
                  Class: {primarySelectedActor.actorClass}
                </span>
              </div>

              {/* Transform Matrix (Location, Rotation, Scale) */}
              <div className="space-y-3 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]/50 p-3">
                <span className="text-[11px] font-bold text-[var(--aethel-text-secondary)] block">
                  Transform (World Matrix)
                </span>

                {/* Location */}
                <div>
                  <span className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Location (X, Y, Z)</span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    <input
                      type="number"
                      value={primarySelectedActor.transform.position[0]}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setActors(
                          actors.map((a) =>
                            a.id === primarySelectedActor.id
                              ? { ...a, transform: { ...a.transform, position: [val, a.transform.position[1], a.transform.position[2]] } }
                              : a,
                          ),
                        )
                      }}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-red-300"
                    />
                    <input
                      type="number"
                      value={primarySelectedActor.transform.position[1]}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setActors(
                          actors.map((a) =>
                            a.id === primarySelectedActor.id
                              ? { ...a, transform: { ...a.transform, position: [a.transform.position[0], val, a.transform.position[2]] } }
                              : a,
                          ),
                        )
                      }}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-emerald-300"
                    />
                    <input
                      type="number"
                      value={primarySelectedActor.transform.position[2]}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setActors(
                          actors.map((a) =>
                            a.id === primarySelectedActor.id
                              ? { ...a, transform: { ...a.transform, position: [a.transform.position[0], a.transform.position[1], val] } }
                              : a,
                          ),
                        )
                      }}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-blue-300"
                    />
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <span className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Scale (X, Y, Z)</span>
                  <div className="grid grid-cols-3 gap-1.5 font-mono">
                    <input
                      type="number"
                      step="0.1"
                      value={primarySelectedActor.transform.scale[0]}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-red-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={primarySelectedActor.transform.scale[1]}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-emerald-300"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={primarySelectedActor.transform.scale[2]}
                      className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-blue-300"
                    />
                  </div>
                </div>
              </div>

              {/* Component Hierarchy */}
              <div className="space-y-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]/50 p-3">
                <span className="text-[11px] font-bold text-[var(--aethel-text-secondary)] block">
                  Component Hierarchy ({primarySelectedActor.components.length})
                </span>
                <div className="space-y-1">
                  {primarySelectedActor.components.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between rounded px-2 py-1 bg-[var(--aethel-surface-primary)] text-xs font-mono"
                    >
                      <span className="text-[var(--aethel-text-primary)]">{comp.name}</span>
                      <span className="text-[10px] text-[var(--aethel-text-tertiary)]">({comp.type})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete Actor */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setActors(actors.filter((a) => a.id !== primarySelectedActor.id))
                    setSelectedActorIds([])
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/40 bg-red-950/40 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Actor
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-[var(--aethel-text-tertiary)]">
              <Box className="h-8 w-8 stroke-1 mb-2 opacity-40" />
              <p className="text-xs">Select an actor in the World Outliner to inspect its transforms and components.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
