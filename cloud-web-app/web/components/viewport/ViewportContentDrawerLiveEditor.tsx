'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Folder,
  FolderOpen,
  Box,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  Zap,
  Sliders,
  Eye,
  EyeOff,
  Search,
  Plus,
  Trash2,
  Copy,
  Move,
  RotateCw,
  Maximize2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Filter,
  Grid,
  List,
  Layers,
  Palette,
  Camera,
  Activity,
  Check,
  MousePointer,
  Maximize,
  Minimize2,
  Lock,
  Unlock,
  Radio,
  Crosshair,
  Play,
  Pause,
  HelpCircle,
  X,
  Terminal,
  BookOpen,
  Info,
  Cpu,
  Shield,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type AssetType = 'mesh' | 'material' | 'texture' | 'vfx' | 'audio' | 'blueprint' | 'animation'

export interface ProjectAsset {
  id: string
  name: string
  type: AssetType
  folderPath: string
  fileSizeKb: number
  thumbnailUrl?: string
  triangleCount?: number
  lodCount?: number
  pbrProperties?: {
    albedoColor: string
    metallic: number // 0..1
    roughness: number // 0..1
    emissiveIntensity: number // 0..10
    normalStrength: number // 0..2
    tilingU: number
    tilingV: number
  }
}

export interface InViewportSelectedActor {
  id: string
  name: string
  assetId: string
  transform: {
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
  }
  materialOverride?: {
    albedoColor: string
    metallic: number
    roughness: number
    emissiveIntensity: number
  }
  lodLevel: number // 0..4
  wireframe: boolean
  castShadows: boolean
}

// Initial Assets Fixtures
const PROJECT_ASSETS: ProjectAsset[] = [
  {
    id: 'ast-mesh-hero',
    name: 'SM_CyberOperative_Armor',
    type: 'mesh',
    folderPath: '/Game/Characters/Meshes',
    fileSizeKb: 14200,
    triangleCount: 48500,
    lodCount: 4,
    pbrProperties: {
      albedoColor: 'rgb(45, 55, 72)',
      metallic: 0.85,
      roughness: 0.25,
      emissiveIntensity: 1.5,
      normalStrength: 1.0,
      tilingU: 1,
      tilingV: 1,
    },
  },
  {
    id: 'ast-mat-carbon',
    name: 'M_CarbonFiber_Weave_01',
    type: 'material',
    folderPath: '/Game/Materials/Industrial',
    fileSizeKb: 420,
    pbrProperties: {
      albedoColor: 'rgb(20, 20, 25)',
      metallic: 0.1,
      roughness: 0.35,
      emissiveIntensity: 0.0,
      normalStrength: 1.4,
      tilingU: 4,
      tilingV: 4,
    },
  },
  {
    id: 'ast-mesh-building',
    name: 'SM_ModularSkyscraper_Tower',
    type: 'mesh',
    folderPath: '/Game/Environment/Architecture',
    fileSizeKb: 28400,
    triangleCount: 124000,
    lodCount: 5,
    pbrProperties: {
      albedoColor: 'rgb(70, 80, 95)',
      metallic: 0.6,
      roughness: 0.4,
      emissiveIntensity: 0.8,
      normalStrength: 1.0,
      tilingU: 2,
      tilingV: 2,
    },
  },
  {
    id: 'ast-vfx-plasma',
    name: 'NS_Plasma_Sparks_Explosion',
    type: 'vfx',
    folderPath: '/Game/VFX/Combat',
    fileSizeKb: 1250,
  },
  {
    id: 'ast-audio-impact',
    name: 'MS_Metal_Resonance_Impact',
    type: 'audio',
    folderPath: '/Game/Audio/MetaSounds',
    fileSizeKb: 890,
  },
  {
    id: 'ast-bp-interactable',
    name: 'BP_SecurityTerminal_Interact',
    type: 'blueprint',
    folderPath: '/Game/Logic/Blueprints',
    fileSizeKb: 640,
  },
]

const ASSET_TYPE_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  mesh: Box,
  material: Palette,
  texture: ImageIcon,
  vfx: Sparkles,
  audio: Volume2,
  blueprint: Zap,
  animation: Activity,
}

export default function ViewportContentDrawerLiveEditor() {
  // Content Drawer State (Unreal Ctrl+Space drawer)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDrawerPinned, setIsDrawerPinned] = useState(false)
  const [drawerSearchQuery, setDrawerSearchQuery] = useState('')
  const [activeTypeFilter, setActiveTypeFilter] = useState<AssetType | 'all'>('all')
  const [selectedAssetId, setSelectedAssetId] = useState<string>('ast-mesh-hero')

  // In-Viewport Active Selection & Live Editing State
  const [activeActor, setActiveActor] = useState<InViewportSelectedActor>({
    id: 'actor-hero-01',
    name: 'CyberOperative_Actor_01',
    assetId: 'ast-mesh-hero',
    transform: {
      position: [0, 100, 0],
      rotation: [0, 45, 0],
      scale: [1, 1, 1],
    },
    materialOverride: {
      albedoColor: 'rgb(45, 55, 72)',
      metallic: 0.85,
      roughness: 0.25,
      emissiveIntensity: 1.5,
    },
    lodLevel: 0,
    wireframe: false,
    castShadows: true,
  })

  const [activeGizmoMode, setActiveGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [gridSnap, setGridSnap] = useState<number>(10)
  const [angleSnap, setAngleSnap] = useState<number>(15)
  const [scaleSnap, setScaleSnap] = useState<number>(0.25)
  const [showWireframe, setShowWireframe] = useState(false)
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(true)
  const [isGameViewMode, setIsGameViewMode] = useState(false)
  const [isFramingNotice, setIsFramingNotice] = useState(false)
  const [isPlayingInEditor, setIsPlayingInEditor] = useState(false)
  const [renderViewMode, setRenderViewMode] = useState<'Lit' | 'Unlit' | 'Wireframe' | 'Nanite' | 'Lumen' | 'Collision'>('Lit')
  const [showProfilerStats, setShowProfilerStats] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [helpActiveTab, setHelpActiveTab] = useState<'shortcuts' | 'commands' | 'about' | 'guide'>('shortcuts')
  const [helpSearchQuery, setHelpSearchQuery] = useState('')
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null)
  const [bookmarkNotice, setBookmarkNotice] = useState<string | null>(null)
  const [cameraBookmarks, setCameraBookmarks] = useState<Record<number, [number, number, number]>>({
    1: [0, 2.5, 8],
    2: [12, 18, 25],
    3: [-15, 4, 10],
  })

  // Keyboard shortcuts (Unreal Standard): Ctrl+Space, Alt+P (PIE), Esc (Stop PIE), Ctrl+D (Duplicate), ?, F1 (Cheat Sheet), W, E, R, G, F, Ctrl+1..9, 1..9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' || e.key === 'F1') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowShortcutsModal((prev) => !prev)
        }
      } else if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        setIsDrawerOpen((prev) => !prev)
      } else if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        setIsPlayingInEditor((prev) => !prev)
      } else if (e.key === 'Escape') {
        if (showShortcutsModal) setShowShortcutsModal(false)
        if (isPlayingInEditor) setIsPlayingInEditor(false)
      } else if (e.ctrlKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        setActiveActor((prev) => ({
          ...prev,
          name: `${prev.name}_Clone`,
          transform: {
            ...prev.transform,
            position: [prev.transform.position[0] + 2, prev.transform.position[1], prev.transform.position[2] + 2],
          },
        }))
        setBookmarkNotice('Actor Duplicated (Ctrl+D)')
        setTimeout(() => setBookmarkNotice(null), 1500)
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        setShowProfilerStats((prev) => !prev)
      } else if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsGameViewMode((prev) => !prev)
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setIsFramingNotice(true)
          setTimeout(() => setIsFramingNotice(false), 1500)
        }
      } else if (e.ctrlKey && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const slot = Number(e.key)
        setCameraBookmarks((prev) => ({ ...prev, [slot]: [...activeActor.transform.position] }))
        setBookmarkNotice(`Camera Bookmark ${slot} Saved`)
        setTimeout(() => setBookmarkNotice(null), 1500)
      } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.key >= '1' && e.key <= '9' && document.activeElement?.tagName !== 'INPUT') {
        const slot = Number(e.key)
        if (cameraBookmarks[slot]) {
          setBookmarkNotice(`Recalled Camera Bookmark ${slot}`)
          setTimeout(() => setBookmarkNotice(null), 1500)
        }
      } else if (e.key === 'w' || e.key === 'W') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setActiveGizmoMode('translate')
        }
      } else if (e.key === 'e' || e.key === 'E') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setActiveGizmoMode('rotate')
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setActiveGizmoMode('scale')
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeActor.transform.position, cameraBookmarks, isPlayingInEditor])

  const filteredAssets = useMemo(() => {
    return PROJECT_ASSETS.filter((asset) => {
      const matchSearch =
        asset.name.toLowerCase().includes(drawerSearchQuery.toLowerCase()) ||
        asset.folderPath.toLowerCase().includes(drawerSearchQuery.toLowerCase())
      const matchType = activeTypeFilter === 'all' || asset.type === activeTypeFilter
      return matchSearch && matchType
    })
  }, [drawerSearchQuery, activeTypeFilter])

  const selectedAsset = useMemo(
    () => PROJECT_ASSETS.find((a) => a.id === selectedAssetId) || PROJECT_ASSETS[0],
    [selectedAssetId],
  )

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-[var(--aethel-text-primary)] select-none">
      {/* ── 3D Viewport Simulation Canvas Background ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Subtle Perspective Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'perspective(600px) rotateX(60deg) scale(2.5)',
            transformOrigin: 'center 80%',
          }}
        />

        {/* 3D Wireframe / Mesh Hologram Demo Representation */}
        <div className="relative flex flex-col items-center">
          <div
            className={`h-48 w-48 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center shadow-2xl ${
              showWireframe
                ? 'border-cyan-400/80 bg-cyan-950/20 shadow-cyan-500/20'
                : 'border-slate-600/80 bg-slate-900/40 shadow-blue-500/10'
            }`}
            style={{
              transform: `rotateY(${activeActor.transform.rotation[1]}deg) scale(${activeActor.transform.scale[0]})`,
            }}
          >
            <Box className="h-24 w-24 text-cyan-400 stroke-1 animate-pulse" />
          </div>

          <div className="mt-4 rounded-full bg-slate-900/80 border border-slate-700/60 px-3 py-1 text-[11px] font-mono text-cyan-300">
            {activeActor.name} • LOD{activeActor.lodLevel} • {selectedAsset.triangleCount?.toLocaleString() || '1,200'} Tris
          </div>
        </div>
      </div>

      {/* ── Top Viewport Context HUD (Non-Intrusive Engine Capabilities Bar) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-full border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/85 px-4 py-1.5 text-[11px] font-mono shadow-2xl backdrop-blur-md text-[var(--aethel-text-secondary)]">
        {/* Render View Mode Selector */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-[var(--aethel-border-subtle)]">
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <select
            value={renderViewMode}
            onChange={(e) => setRenderViewMode(e.target.value as any)}
            className="bg-transparent text-cyan-300 font-semibold text-xs focus:outline-none cursor-pointer"
          >
            <option value="Lit" className="bg-slate-900 text-slate-200">Lit (PBR 60Hz)</option>
            <option value="Unlit" className="bg-slate-900 text-slate-200">Unlit (Albedo Only)</option>
            <option value="Wireframe" className="bg-slate-900 text-slate-200">Wireframe Topology</option>
            <option value="Nanite" className="bg-slate-900 text-slate-200">Nanite Clusters</option>
            <option value="Lumen" className="bg-slate-900 text-slate-200">Lumen Radiance Probes</option>
            <option value="Collision" className="bg-slate-900 text-slate-200">Chaos Collision Bounds</option>
          </select>
        </div>

        {/* Profiler Stats Toggle Pill */}
        <button
          onClick={() => setShowProfilerStats(!showProfilerStats)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
            showProfilerStats
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              : 'hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
          }`}
          title="Toggle Engine Telemetry Profiler (Ctrl+Shift+P)"
        >
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span>{showProfilerStats ? '60.0 FPS • 16.6ms • 2.1GB VRAM' : 'Stat FPS'}</span>
        </button>

        <span className="opacity-30">•</span>

        {/* Shortcuts Hints */}
        <span className={isGameViewMode ? 'text-amber-400 font-bold' : ''}>
          [G] {isGameViewMode ? 'Game View' : 'Game View'}
        </span>
        <span className="opacity-30">•</span>
        <span>[F] Frame</span>
        <span className="opacity-30">•</span>
        <span>[Ctrl+Space] Content Drawer</span>
        <span className="opacity-30">•</span>
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="flex items-center gap-1 hover:text-cyan-300 transition-colors text-[var(--aethel-text-secondary)]"
          title="Keyboard Shortcuts Reference (? / F1)"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>[?]</span>
        </button>
      </div>

      {/* ── Camera Bookmark Notification Toast ── */}
      {bookmarkNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/90 px-3 py-1 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-md animate-bounce">
          <Camera className="h-3.5 w-3.5" /> {bookmarkNotice}
        </div>
      )}

      {/* ── Framing Selected Asset Toast Indicator ── */}
      {isFramingNotice && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/90 px-3 py-1 text-xs font-semibold text-cyan-200 shadow-2xl backdrop-blur-md animate-bounce">
          <Crosshair className="h-3.5 w-3.5" /> Centered & Focused on {activeActor.name}
        </div>
      )}

      {/* ── Play-In-Editor (PIE) Live Gameplay Banner ── */}
      {isPlayingInEditor && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-950/90 px-4 py-1.5 text-xs font-semibold text-emerald-200 shadow-2xl backdrop-blur-md animate-pulse">
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>SIMULATION RUNNING (60Hz Physics)</span>
          <span className="opacity-40">•</span>
          <span className="font-mono text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300">
            Esc to Stop
          </span>
        </div>
      )}

      {/* ── Left Floating Viewport Transform Gizmo Toolbar (Adobe / Unreal Modes) ── */}
      {!isGameViewMode && !isPlayingInEditor && (
        <div className="absolute left-4 top-4 z-20 flex flex-col gap-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/90 p-1.5 shadow-2xl backdrop-blur-md">
          {/* Play-In-Editor Quick Trigger */}
          <button
            onClick={() => setIsPlayingInEditor(true)}
            title="Play in Viewport (Alt+P)"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 text-xs transition-all"
          >
            <Play className="h-4 w-4 fill-current" />
          </button>

          <div className="my-0.5 h-px bg-[var(--aethel-border-subtle)]" />

          <button
            onClick={() => setActiveGizmoMode('translate')}
            title="Translate Gizmo (W)"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
              activeGizmoMode === 'translate'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Move className="h-4 w-4" />
          </button>

          <button
            onClick={() => setActiveGizmoMode('rotate')}
            title="Rotate Gizmo (E)"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
              activeGizmoMode === 'rotate'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setActiveGizmoMode('scale')}
            title="Scale Gizmo (R)"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
              activeGizmoMode === 'scale'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <div className="my-1 h-px bg-[var(--aethel-border-subtle)]" />

          <button
            onClick={() => setShowWireframe(!showWireframe)}
            title="Toggle Wireframe Overlay"
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all ${
              showWireframe
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Top-Right In-Viewport Floating Quick Asset Live Inspector (Adobe/Unreal HUD) ── */}
      {!isGameViewMode && !isPlayingInEditor && (
        <div className="absolute right-4 top-4 z-20 w-80 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/90 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Inspector Header */}
          <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/80 px-3 py-2">
            <div className="flex items-center gap-2 truncate">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400">
                <Box className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-semibold text-[var(--aethel-text-primary)] truncate">
                {activeActor.name}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
              >
                {isInspectorExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

        {/* Inspector Body */}
        {isInspectorExpanded && (
          <div className="p-3 space-y-3.5 text-xs max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* Transform Matrix Controls */}
            <div className="space-y-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/50 p-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] block">
                Transform Coordinates
              </span>

              {/* Location */}
              <div>
                <div className="flex justify-between text-[10px] text-[var(--aethel-text-tertiary)] mb-1">
                  <span>Location (X, Y, Z)</span>
                  <span className="font-mono">Grid Snap: {gridSnap}cm</span>
                </div>
                <div className="grid grid-cols-3 gap-1 font-mono">
                  <input
                    type="number"
                    value={activeActor.transform.position[0]}
                    onChange={(e) =>
                      setActiveActor({
                        ...activeActor,
                        transform: {
                          ...activeActor.transform,
                          position: [Number(e.target.value), activeActor.transform.position[1], activeActor.transform.position[2]],
                        },
                      })
                    }
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-red-300"
                  />
                  <input
                    type="number"
                    value={activeActor.transform.position[1]}
                    onChange={(e) =>
                      setActiveActor({
                        ...activeActor,
                        transform: {
                          ...activeActor.transform,
                          position: [activeActor.transform.position[0], Number(e.target.value), activeActor.transform.position[2]],
                        },
                      })
                    }
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-emerald-300"
                  />
                  <input
                    type="number"
                    value={activeActor.transform.position[2]}
                    onChange={(e) =>
                      setActiveActor({
                        ...activeActor,
                        transform: {
                          ...activeActor.transform,
                          position: [activeActor.transform.position[0], activeActor.transform.position[1], Number(e.target.value)],
                        },
                      })
                    }
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-blue-300"
                  />
                </div>
              </div>

              {/* Rotation */}
              <div>
                <span className="text-[10px] text-[var(--aethel-text-tertiary)] block mb-1">Rotation (Pitch, Yaw, Roll)</span>
                <div className="grid grid-cols-3 gap-1 font-mono">
                  <input
                    type="number"
                    value={activeActor.transform.rotation[0]}
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-red-300"
                  />
                  <input
                    type="number"
                    value={activeActor.transform.rotation[1]}
                    onChange={(e) =>
                      setActiveActor({
                        ...activeActor,
                        transform: {
                          ...activeActor.transform,
                          rotation: [activeActor.transform.rotation[0], Number(e.target.value), activeActor.transform.rotation[2]],
                        },
                      })
                    }
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-emerald-300"
                  />
                  <input
                    type="number"
                    value={activeActor.transform.rotation[2]}
                    className="h-6 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-1 text-center text-xs text-blue-300"
                  />
                </div>
              </div>
            </div>

            {/* PBR Material & Shading Live Overrides */}
            {selectedAsset.pbrProperties && (
              <div className="space-y-2.5 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/50 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                  Live PBR Shading Adjuster
                </span>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[var(--aethel-text-secondary)]">Metallic</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">
                      {selectedAsset.pbrProperties.metallic.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedAsset.pbrProperties.metallic}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (selectedAsset.pbrProperties) selectedAsset.pbrProperties.metallic = val
                      setActiveActor({ ...activeActor })
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[var(--aethel-text-secondary)]">Roughness</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">
                      {selectedAsset.pbrProperties.roughness.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedAsset.pbrProperties.roughness}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (selectedAsset.pbrProperties) selectedAsset.pbrProperties.roughness = val
                      setActiveActor({ ...activeActor })
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[var(--aethel-text-secondary)]">Emissive Intensity</span>
                    <span className="font-mono text-[var(--aethel-text-primary)]">
                      {selectedAsset.pbrProperties.emissiveIntensity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={selectedAsset.pbrProperties.emissiveIntensity}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (selectedAsset.pbrProperties) selectedAsset.pbrProperties.emissiveIntensity = val
                      setActiveActor({ ...activeActor })
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Bottom Content Drawer Trigger Bar (Unreal Style Ctrl+Space Drawer) ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center">
        {/* Drawer Toggle Handle Pill */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="flex items-center gap-2 rounded-t-xl border-t border-x border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-5 py-1.5 text-xs font-semibold text-[var(--aethel-text-primary)] shadow-2xl hover:bg-[var(--aethel-surface-secondary)] transition-all"
        >
          <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
          <span>Content Drawer</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-[var(--aethel-text-tertiary)]">
            Ctrl+Space
          </span>
          {isDrawerOpen ? <ChevronDown className="h-3.5 w-3.5 ml-1" /> : <ChevronUp className="h-3.5 w-3.5 ml-1" />}
        </button>

        {/* ── Collapsible Content Drawer Panel ── */}
        {isDrawerOpen && (
          <div className="h-64 w-full border-t border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]/95 shadow-2xl backdrop-blur-xl flex flex-col">
            {/* Drawer Sub-Header Toolbar */}
            <div className="flex h-10 items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search Content in /Game/..."
                    value={drawerSearchQuery}
                    onChange={(e) => setDrawerSearchQuery(e.target.value)}
                    className="h-7 w-full rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] pl-8 pr-2 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] focus:border-blue-500/60 focus:outline-none"
                  />
                </div>
              </div>

              {/* Asset Type Filter Badges */}
              <div className="flex items-center gap-1">
                {(['all', 'mesh', 'material', 'vfx', 'audio', 'blueprint'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveTypeFilter(type)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                      activeTypeFilter === type
                        ? 'bg-blue-600 text-white'
                        : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 pl-2">
                <button
                  onClick={() => setIsDrawerPinned(!isDrawerPinned)}
                  title={isDrawerPinned ? 'Unpin Drawer' : 'Keep Drawer Pinned'}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs ${
                    isDrawerPinned ? 'text-blue-400 bg-blue-500/10' : 'text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {isDrawerPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Asset Thumbnail Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {filteredAssets.map((asset) => {
                const Icon = ASSET_TYPE_ICONS[asset.type] || Box
                const isSelected = selectedAssetId === asset.id

                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`group relative flex flex-col rounded-xl border p-2.5 cursor-pointer transition-all hover:scale-[1.02] ${
                      isSelected
                        ? 'border-blue-500/80 bg-blue-950/20 shadow-lg shadow-blue-500/10'
                        : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)]/60 hover:bg-[var(--aethel-surface-secondary)]'
                    }`}
                  >
                    {/* Thumbnail Icon Preview */}
                    <div className="flex h-16 w-full items-center justify-center rounded-lg bg-[var(--aethel-surface-tertiary)] group-hover:bg-slate-800 transition-colors">
                      <Icon className="h-7 w-7 text-[var(--aethel-text-tertiary)] group-hover:text-blue-400 transition-colors" />
                    </div>

                    {/* Name & Type Tag */}
                    <div className="mt-2">
                      <span className="font-mono text-xs font-semibold text-[var(--aethel-text-primary)] truncate block">
                        {asset.name}
                      </span>
                      <span className="text-[10px] text-[var(--aethel-text-tertiary)] capitalize block truncate">
                        {asset.type} • {(asset.fileSizeKb / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Aethel Studio Command Center & User Reference Manual (? / F1) ── */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900/98 p-6 shadow-2xl backdrop-blur-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Aethel Studio • Central de Comandos & Manual
                    <span className="rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 text-[10px] font-mono">
                      v1.0 GA
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Padrão de Mercado AAA (Unreal Engine 5.4 / Adobe Creative Cloud)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowShortcutsModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Tabs & Quick Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
              {/* Tab Switcher */}
              <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setHelpActiveTab('shortcuts')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    helpActiveTab === 'shortcuts'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Move className="h-3.5 w-3.5" />
                  <span>Atalhos de Teclado</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('commands')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    helpActiveTab === 'commands'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Comandos do Console</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('about')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    helpActiveTab === 'about'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>Sobre o Motor</span>
                </button>

                <button
                  onClick={() => setHelpActiveTab('guide')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    helpActiveTab === 'guide'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Guia de Uso</span>
                </button>
              </div>

              {/* Filter Search Input */}
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={helpSearchQuery}
                  onChange={(e) => setHelpSearchQuery(e.target.value)}
                  placeholder="Filtrar comandos..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body / Tab Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              {/* ── TAB 1: SHORTCUTS ── */}
              {helpActiveTab === 'shortcuts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Section 1: Navigation & Simulation */}
                  <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                      Simulação & Viewport
                    </span>
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Play in Editor (PIE)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-cyan-300">Alt + P</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Stop Simulation</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-slate-400">Esc</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Game View (Ocultar UI)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-amber-300">G</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Frame / Focus Seleção</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-cyan-300">F</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Transform Tools */}
                  <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                      Ferramentas de Gizmo & Edição
                    </span>
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Modo Translação</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-blue-300">W</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Modo Rotação Angular</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-blue-300">E</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Modo Escala 3D</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-blue-300">R</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Duplicar Ator (+2m)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-emerald-300">Ctrl + D</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Deletar Seleção</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-red-300">Del / Backspace</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Navigation & Mouse Flight */}
                  <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                      Navegação de Câmera & Mouse
                    </span>
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Fly Cam (Voo 3D)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-cyan-300">RMB + WASD</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Orbitar Seleção</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-cyan-300">Alt + LMB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Dolly Zoom Câmera</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-cyan-300">Alt + RMB</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Ajuste Direção Sol</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-amber-300">Ctrl + L + Drag</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Content, History & Profiler */}
                  <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      Drawer, Histórico & Telemetria
                    </span>
                    <div className="space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Content Drawer</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-amber-300">Ctrl + Space</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Desfazer / Refazer</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-slate-300">Ctrl + Z / Y</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Salvar Cena (Yjs)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-emerald-300">Ctrl + S</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Stat FPS Profiler</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-emerald-300">Ctrl + Shift + P</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Camera Bookmarks */}
                  <div className="space-y-2 rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 md:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Marcadores de Câmera 3D
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Salvar Posição (Slots 1 a 9)</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-emerald-300">Ctrl + 1..9</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Teleportar para Marcador</span>
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-emerald-300">1..9</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 2: CONSOLE COMMANDS ── */}
              {helpActiveTab === 'commands' && (
                <div className="space-y-2.5">
                  {[
                    // Profiling & Performance
                    { cmd: 'stat fps', desc: 'Ativa o contador de FPS, frametime milissegundos e VRAM em tempo real.', cat: 'Profiler' },
                    { cmd: 'stat unit', desc: 'Decompõe o tempo de quadro entre CPU Game Tick, CPU Render e GPU Draw Calls.', cat: 'Profiler' },
                    { cmd: 'stat gpu', desc: 'Exibe o tempo de execução por passe (GBuffer, ShadowMap, Radiance, PostProcess).', cat: 'Profiler' },
                    { cmd: 'stat memory', desc: 'Monitora alocação de memória RAM do processo e VRAM de texturas/malhas.', cat: 'Profiler' },

                    // Rendering & Shading
                    { cmd: 'r.Nanite.Clusters 1', desc: 'Renderiza o mapa de densidade de micro-polígonos gerados diretamente na GPU.', cat: 'Rendering' },
                    { cmd: 'r.Lumen.Radiance 1', desc: 'Ativa probes de iluminação global e rebatimento dinâmico em tempo real.', cat: 'Lighting' },
                    { cmd: 'r.Lumen.Reflections 1', desc: 'Calcula reflexos dinâmicos baseados em traçado de raio PBR em tempo real.', cat: 'Lighting' },
                    { cmd: 'r.ShadowQuality 3', desc: 'Ajusta a resolução e filtragem dos mapas de sombra virtual (1 a 4).', cat: 'Rendering' },
                    { cmd: 'r.VolumetricFog 1', desc: 'Ativa neblina volumétrica raymarched e dispersão de raios solares (God Rays).', cat: 'Atmosphere' },
                    { cmd: 'r.PostProcessing.ACES 1', desc: 'Aplica a curva de mapeamento de tom cinematográfico de referência ACES 1.3.', cat: 'Color' },
                    { cmd: 'r.ScreenPercentage 100', desc: 'Ajusta a escala de resolução interna do renderizador (50% a 200%).', cat: 'Rendering' },
                    { cmd: 'r.SetViewMode wireframe', desc: 'Muda o passe de renderização ativo (lit, unlit, wireframe, nanite, collision).', cat: 'Rendering' },

                    // Physics & Euphoria (Law III)
                    { cmd: 'p.Chaos.Debug 1', desc: 'Desenha os volumes de colisão física e juntas XPBD Euphoria no viewport.', cat: 'Physics' },
                    { cmd: 'p.Ragdoll.ActiveMuscle 1', desc: 'Ativa atuadores de músculo e equilíbrio dinâmico para Active Ragdolls (Lei III).', cat: 'Physics' },
                    { cmd: 'p.Gravity -9.81', desc: 'Configura a aceleração gravitacional no eixo vertical do mundo (m/s²).', cat: 'Physics' },
                    { cmd: 'p.Cloth.Simulate 1', desc: 'Executa a simulação física de tecidos e malhas flexíveis baseadas em XPBD.', cat: 'Physics' },
                    { cmd: 'physics.reset', desc: 'Reinicia todos os corpos rígidos, forças e ragdolls para as posições iniciais.', cat: 'Physics' },

                    // Audio & MetaSounds (Law IV)
                    { cmd: 'a.SpatialAudio.Debug 1', desc: 'Renderiza raios de oclusão acústica e emissores 3D HRTF no espaço.', cat: 'Audio' },
                    { cmd: 'a.MasterVolume 1.0', desc: 'Define o ganho mestre de saída do barramento de áudio (0.0 a 1.0).', cat: 'Audio' },
                    { cmd: 'a.MetaSounds.Recompile', desc: 'Força a recompilação a quente do grafo de nós de síntese sonora.', cat: 'Audio' },

                    // Gameplay, GAS & AI
                    { cmd: 'gas.DebugTags 1', desc: 'Exibe na tela as tags e estados de jogabilidade (Stunned, Buffs, Debuffs).', cat: 'Gameplay' },
                    { cmd: 'ai.BehaviorTree.Debug 1', desc: 'Ativa a visualização da árvore de decisão de IA e chaves do Blackboard.', cat: 'AI' },
                    { cmd: 'game.TimeDilation 1.0', desc: 'Altera a escala de tempo da simulação (0.1 para Slow-Mo, 1.0 normal).', cat: 'Simulation' },

                    // World Partition & LiveOps
                    { cmd: 'wp.GridBounds 1', desc: 'Exibe os limites das células de streaming espacial do mundo aberto.', cat: 'World' },
                    { cmd: 'telemetry.flush', desc: 'Envia imediatamente os logs e métricas locais para o pipeline de análise.', cat: 'LiveOps' },
                  ]
                    .filter((c) =>
                      helpSearchQuery
                        ? c.cmd.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                          c.desc.toLowerCase().includes(helpSearchQuery.toLowerCase()) ||
                          c.cat.toLowerCase().includes(helpSearchQuery.toLowerCase())
                        : true
                    )
                    .map((item) => (
                      <div
                        key={item.cmd}
                        className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {item.cmd}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/60 px-1.5 py-0.2 rounded">
                              {item.cat}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.desc}</p>
                        </div>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.cmd)
                            setCopiedCommand(item.cmd)
                            setTimeout(() => setCopiedCommand(null), 1500)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          title="Copiar Comando"
                        >
                          {copiedCommand === item.cmd ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {/* ── TAB 3: ABOUT ENGINE ── */}
              {helpActiveTab === 'about' && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-2">
                    <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                      <Cpu className="h-4 w-4" /> Arquitetura do Kernel Nativo (Rust 60Hz XPBD)
                    </h4>
                    <p className="text-slate-400 leading-relaxed">
                      A Aethel Engine opera sob um modelo Data-Oriented Design estrito. O solver de física e dinâmicas corporais utiliza estruturas de memória contígua alinhadas a 64 bytes (<code className="font-mono text-cyan-300">PhysicsRagdollSoA</code>) com <strong>0 bytes de alocação dinâmica no hot loop</strong>, garantindo estabilidade milimétrica em 60Hz.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                        Áudio Espacial MetaSounds
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Processamento de áudio 3D puramente via Web Audio API + HRTF e oclusão por raycast de física, compilando grafos nodais diretamente para buffers de áudio.
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                        Micro-Poly GPU Nanite
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Culling geométrico e streaming de clusters de malha executados 100% na GPU através de Indirect Draw, liberando a CPU para lógica e IA.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: CREATOR WORKFLOW GUIDE ── */}
              {helpActiveTab === 'guide' && (
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 border border-cyan-500/40 text-[10px]">
                        1
                      </span>
                      Edição Direta in-Viewport & Content Drawer
                    </div>
                    <p className="text-slate-400 text-[11px] pl-7">
                      Pressione <strong className="text-slate-200">Ctrl + Space</strong> para abrir a gaveta de assets no rodapé. Arraste malhas ou clique em qualquer asset para inspecionar parâmetros PBR no painel flutuante à direita sem perder o 3D de vista.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px]">
                        2
                      </span>
                      Simulação Instantânea (Play-In-Editor)
                    </div>
                    <p className="text-slate-400 text-[11px] pl-7">
                      Pressione <strong className="text-slate-200">Alt + P</strong> para ativar a simulação física imediata. Teste colisões e mecânicas e pressione <strong className="text-slate-200">Esc</strong> para sair de volta para a edição exata da cena.
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-950 border border-amber-500/40 text-[10px]">
                        3
                      </span>
                      Inspeção Cinematográfica (Game View)
                    </div>
                    <p className="text-slate-400 text-[11px] pl-7">
                      Pressione <strong className="text-slate-200">G</strong> para ocultar 100% dos gizmos e menus e avaliar luz, pós-processamento ACES e atmosfera como o jogador verá.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
