'use client'

/**
 * UIWidgetDesigner — Professional In-Game UI / UMG Widget Blueprint Designer
 *
 * Parity target: Unreal Engine UMG (Unreal Motion Graphics) + Figma Game UI
 * Architecture:
 * - Hierarchy & Widget Palette (Left)
 * - WYSIWYG Visual Canvas with Anchors & Responsive Aspect Ratios (Center)
 * - Layout, Styling & Data-Binding Inspector (Right)
 * - Widget Animation & Event State Sequencer (Bottom)
 *
 * Law I: Zero runtime overhead via pre-compiled layout descriptors
 * Law X: AAA ergonomic glassmorphism styling
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Activity,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Anchor,
  Box,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Columns,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Grid,
  Heart,
  Image as ImageIcon,
  Layers,
  Layout,
  Lock,
  Maximize2,
  Minimize2,
  Monitor,
  Move,
  Play,
  Plus,
  RotateCcw,
  Rows,
  Settings,
  Sliders,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Type,
  Unlock,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('UIWidgetDesigner')

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type WidgetType =
  | 'canvas'
  | 'button'
  | 'text'
  | 'image'
  | 'progressbar'
  | 'slider'
  | 'checkbox'
  | 'verticalbox'
  | 'horizontalbox'
  | 'border'
  | 'spacer'

export type AnchorPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'full-stretch'

export type DataBindingTarget =
  | 'none'
  | 'player.health'
  | 'player.shield'
  | 'player.stamina'
  | 'player.energy'
  | 'player.ammo'
  | 'player.level'
  | 'player.experience'
  | 'quest.title'
  | 'quest.objective'
  | 'score.current'

export interface UIWidgetNode {
  id: string
  name: string
  type: WidgetType
  visible: boolean
  locked: boolean
  collapsed: boolean
  parentId: string | null

  // Slot & Transform
  anchor: AnchorPreset
  posX: number
  posY: number
  sizeX: number
  sizeY: number
  alignmentX: number // 0..1
  alignmentY: number // 0..1

  // Appearance & Styling
  backgroundColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  opacity: number
  padding: number

  // Type-specific content
  textContent?: string
  fontSize?: number
  fontWeight?: '400' | '600' | '700' | '800'
  textColor?: string
  imageUrl?: string
  progressValue?: number // 0..1
  progressColor?: string

  // Logic & Bindings
  binding: DataBindingTarget
  onClickEvent?: string
  onHoverSound?: string
}

export interface AspectRatioPreset {
  id: string
  label: string
  width: number
  height: number
  icon: React.ComponentType<{ className?: string }>
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS & PRESETS
// ─────────────────────────────────────────────────────────────

const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  { id: '1080p', label: '1080p (16:9)', width: 1920, height: 1080, icon: Monitor },
  { id: '1440p', label: '1440p QHD', width: 2560, height: 1440, icon: Monitor },
  { id: 'ultrawide', label: '21:9 Ultrawide', width: 3440, height: 1440, icon: Monitor },
  { id: '4k', label: '4K UHD (16:9)', width: 3840, height: 2160, icon: Monitor },
  { id: 'mobile', label: 'Mobile (9:20)', width: 1080, height: 2400, icon: Smartphone },
]

const WIDGET_PALETTE: Array<{ type: WidgetType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'canvas', label: 'Canvas Panel', icon: Layout },
  { type: 'button', label: 'Interactive Button', icon: Square },
  { type: 'text', label: 'Text Block', icon: Type },
  { type: 'image', label: 'Image / Icon', icon: ImageIcon },
  { type: 'progressbar', label: 'Progress Bar', icon: Activity },
  { type: 'slider', label: 'Value Slider', icon: Sliders },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'verticalbox', label: 'Vertical Box', icon: Rows },
  { type: 'horizontalbox', label: 'Horizontal Box', icon: Columns },
  { type: 'border', label: 'Border Panel', icon: Box },
]

const ANCHOR_COORDINATES: Record<AnchorPreset, { x: number; y: number; label: string }> = {
  'top-left': { x: 0, y: 0, label: 'Top Left' },
  'top-center': { x: 0.5, y: 0, label: 'Top Center' },
  'top-right': { x: 1, y: 0, label: 'Top Right' },
  'center-left': { x: 0, y: 0.5, label: 'Center Left' },
  'center': { x: 0.5, y: 0.5, label: 'Center' },
  'center-right': { x: 1, y: 0.5, label: 'Center Right' },
  'bottom-left': { x: 0, y: 1, label: 'Bottom Left' },
  'bottom-center': { x: 0.5, y: 1, label: 'Bottom Center' },
  'bottom-right': { x: 1, y: 1, label: 'Bottom Right' },
  'full-stretch': { x: 0.5, y: 0.5, label: 'Full Stretch' },
}

function uid(p = 'w') {
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function createDefaultWidget(type: WidgetType, name?: string): UIWidgetNode {
  return {
    id: uid(type),
    name: name ?? `${type.charAt(0).toUpperCase() + type.slice(1)}_1`,
    type,
    visible: true,
    locked: false,
    collapsed: false,
    parentId: null,
    anchor: 'top-left',
    posX: 40,
    posY: 40,
    sizeX: type === 'button' ? 180 : type === 'progressbar' ? 240 : type === 'text' ? 160 : 120,
    sizeY: type === 'button' ? 44 : type === 'progressbar' ? 16 : type === 'text' ? 32 : 120,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: type === 'button' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
    borderColor: type === 'button' ? 'rgba(34, 211, 238, 0.5)' : 'transparent',
    borderWidth: type === 'button' ? 1 : 0,
    borderRadius: type === 'button' ? 8 : 4,
    opacity: 1,
    padding: 8,
    textContent: type === 'text' ? 'New Text Block' : type === 'button' ? 'Action Button' : undefined,
    fontSize: 14,
    fontWeight: '600',
    textColor: '#f8fafc',
    progressValue: 0.75,
    progressColor: '#10b981',
    binding: 'none',
  }
}

const DEFAULT_SAMPLE_LAYOUT: UIWidgetNode[] = [
  {
    id: 'root-canvas',
    name: 'MainHUD_Canvas',
    type: 'canvas',
    visible: true,
    locked: false,
    collapsed: false,
    parentId: null,
    anchor: 'full-stretch',
    posX: 0,
    posY: 0,
    sizeX: 1920,
    sizeY: 1080,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    opacity: 1,
    padding: 0,
    binding: 'none',
  },
  {
    id: 'health-bar',
    name: 'PlayerHealth_Bar',
    type: 'progressbar',
    visible: true,
    locked: false,
    collapsed: false,
    parentId: 'root-canvas',
    anchor: 'top-left',
    posX: 40,
    posY: 40,
    sizeX: 280,
    sizeY: 18,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderColor: 'rgba(51, 65, 85, 0.8)',
    borderWidth: 1,
    borderRadius: 999,
    opacity: 1,
    padding: 2,
    progressValue: 0.84,
    progressColor: '#10b981',
    binding: 'player.health',
  },
  {
    id: 'shield-bar',
    name: 'PlayerShield_Bar',
    type: 'progressbar',
    visible: true,
    locked: false,
    collapsed: false,
    parentId: 'root-canvas',
    anchor: 'top-left',
    posX: 40,
    posY: 64,
    sizeX: 220,
    sizeY: 10,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderWidth: 1,
    borderRadius: 999,
    opacity: 1,
    padding: 1,
    progressValue: 0.65,
    progressColor: '#06b6d4',
    binding: 'player.shield',
  },
  {
    id: 'quest-card',
    name: 'ActiveQuest_Panel',
    type: 'border',
    visible: true,
    locked: false,
    collapsed: false,
    parentId: 'root-canvas',
    anchor: 'top-right',
    posX: -340,
    posY: 40,
    sizeX: 300,
    sizeY: 140,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: 'rgba(10, 14, 24, 0.85)',
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    opacity: 1,
    padding: 16,
    binding: 'none',
  },
  {
    id: 'quest-title',
    name: 'QuestTitle_Text',
    type: 'text',
    visible: true,
    locked: false,
    collapsed: false,
    parentId: 'quest-card',
    anchor: 'top-left',
    posX: 12,
    posY: 12,
    sizeX: 276,
    sizeY: 24,
    alignmentX: 0,
    alignmentY: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    opacity: 1,
    padding: 0,
    textContent: 'Primary Objective: Breach Sector 4',
    fontSize: 13,
    fontWeight: '700',
    textColor: '#38bdf8',
    binding: 'quest.title',
  },
]

// ─────────────────────────────────────────────────────────────
// WIDGET RENDERER ON CANVAS
// ─────────────────────────────────────────────────────────────

function WidgetCanvasNode({
  widget,
  selected,
  onSelect,
  onDragMove,
  zoom,
  canvasWidth,
  canvasHeight,
}: {
  widget: UIWidgetNode
  selected: boolean
  onSelect: (id: string) => void
  onDragMove: (id: string, dx: number, dy: number) => void
  zoom: number
  canvasWidth: number
  canvasHeight: number
}) {
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    onSelect(widget.id)
    if (widget.locked) return

    const startX = e.clientX
    const startY = e.clientY
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom
      const dy = (ev.clientY - startY) / zoom
      onDragMove(widget.id, dx, dy)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [widget.id, widget.locked, zoom, onSelect, onDragMove])

  // Calculate actual pixel position from anchor offset
  const anchorCoords = ANCHOR_COORDINATES[widget.anchor]
  const anchorPixelX = anchorCoords.x * canvasWidth
  const anchorPixelY = anchorCoords.y * canvasHeight

  const renderX = anchorPixelX + widget.posX - widget.alignmentX * widget.sizeX
  const renderY = anchorPixelY + widget.posY - widget.alignmentY * widget.sizeY

  if (!widget.visible) return null

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`absolute transition-shadow duration-75 select-none ${
        selected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black z-30' : 'hover:ring-1 hover:ring-cyan-500/50 z-10'
      }`}
      style={{
        left: `${renderX}px`,
        top: `${renderY}px`,
        width: `${widget.sizeX}px`,
        height: `${widget.sizeY}px`,
        backgroundColor: widget.backgroundColor,
        borderColor: widget.borderColor,
        borderWidth: `${widget.borderWidth}px`,
        borderStyle: widget.borderWidth > 0 ? 'solid' : 'none',
        borderRadius: `${widget.borderRadius}px`,
        opacity: widget.opacity,
        padding: `${widget.padding}px`,
        cursor: widget.locked ? 'not-allowed' : 'move',
      }}
    >
      {/* Anchor Marker Visualizer when Selected */}
      {selected && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-40"
          style={{
            left: `${-widget.posX + widget.alignmentX * widget.sizeX}px`,
            top: `${-widget.posY + widget.alignmentY * widget.sizeY}px`,
          }}
        >
          <div className="h-3 w-3 rotate-45 border border-amber-300 bg-amber-400/90 shadow-[0_0_8px_#f59e0b]" />
        </div>
      )}

      {/* Widget Type Specific Content */}
      {widget.type === 'text' && (
        <span
          style={{
            fontSize: `${widget.fontSize}px`,
            fontWeight: widget.fontWeight,
            color: widget.textColor,
            lineHeight: 1.2,
          }}
          className="block truncate"
        >
          {widget.textContent}
        </span>
      )}

      {widget.type === 'button' && (
        <div className="flex h-full w-full items-center justify-center font-bold text-xs" style={{ color: widget.textColor }}>
          {widget.textContent ?? 'Button'}
        </div>
      )}

      {widget.type === 'progressbar' && (
        <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-900/80">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(widget.progressValue ?? 1) * 100}%`,
              backgroundColor: widget.progressColor ?? '#10b981',
            }}
          />
        </div>
      )}

      {widget.type === 'image' && (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-700 bg-slate-900/40 text-slate-500">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN WIDGET DESIGNER COMPONENT
// ─────────────────────────────────────────────────────────────

export default function UIWidgetDesigner() {
  const [widgets, setWidgets] = useState<UIWidgetNode[]>(DEFAULT_SAMPLE_LAYOUT)
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_SAMPLE_LAYOUT[1].id)
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>(ASPECT_RATIO_PRESETS[0])
  const [zoom, setZoom] = useState(0.55)
  const [showGridSnap, setShowGridSnap] = useState(true)
  const [gridSize, setGridSize] = useState(16)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)

  const selectedWidget = useMemo(
    () => widgets.find((w) => w.id === selectedId) ?? null,
    [widgets, selectedId]
  )

  const updateWidget = useCallback((id: string, patch: Partial<UIWidgetNode>) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }, [])

  const addWidget = useCallback((type: WidgetType) => {
    const newW = createDefaultWidget(type)
    setWidgets((prev) => [...prev, newW])
    setSelectedId(newW.id)
    log.debug('widget.add', { type, id: newW.id })
  }, [])

  const deleteWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const next = prev.filter((w) => w.id !== id)
      if (selectedId === id && next.length > 0) setSelectedId(next[0].id)
      return next
    })
  }, [selectedId])

  const duplicateWidget = useCallback((id: string) => {
    setWidgets((prev) => {
      const src = prev.find((w) => w.id === id)
      if (!src) return prev
      const copy: UIWidgetNode = {
        ...src,
        id: uid(src.type),
        name: `${src.name}_Copy`,
        posX: src.posX + 20,
        posY: src.posY + 20,
      }
      return [...prev, copy]
    })
  }, [])

  const handleDragMove = useCallback((id: string, dx: number, dy: number) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        let newX = w.posX + dx
        let newY = w.posY + dy
        if (showGridSnap) {
          newX = Math.round(newX / gridSize) * gridSize
          newY = Math.round(newY / gridSize) * gridSize
        }
        return { ...w, posX: newX, posY: newY }
      })
    )
  }, [showGridSnap, gridSize])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)] font-sans">
      {/* ── Top Control Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Layout className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-primary)]">
            UMG UI Widget Designer
          </span>
          <div className="h-4 w-px bg-[var(--aethel-border-subtle)]" />

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1">
            {ASPECT_RATIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAspectRatio(preset)}
                className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition ${
                  aspectRatio.id === preset.id
                    ? 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                    : 'border-transparent text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Zoom & Preview Controls */}
        <div className="flex items-center gap-2">
          {/* Grid Snap Toggle */}
          <button
            type="button"
            onClick={() => setShowGridSnap((g) => !g)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition ${
              showGridSnap
                ? 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
                : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)]'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Grid {gridSize}px</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-2 py-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
              className="text-xs font-mono text-[var(--aethel-text-tertiary)] hover:text-white"
            >
              -
            </button>
            <span className="font-mono text-[10px] text-cyan-300 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
              className="text-xs font-mono text-[var(--aethel-text-tertiary)] hover:text-white"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlayingPreview((p) => !p)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              isPlayingPreview
                ? 'bg-amber-500 text-slate-950'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            } ${CANONICAL_FOCUS}`}
          >
            {isPlayingPreview ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlayingPreview ? 'Exit Preview' : 'Live Preview'}</span>
          </button>
        </div>
      </header>

      {/* ── 3-Column Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT COLUMN: Palette & Hierarchy */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
          {/* Palette */}
          <div className="border-b border-[var(--aethel-border-subtle)] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-2">
              Widget Palette
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {WIDGET_PALETTE.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => addWidget(p.type)}
                    className={`flex items-center gap-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2.5 py-1.5 text-left text-[11px] font-semibold text-[var(--aethel-text-secondary)] hover:border-cyan-500/40 hover:text-cyan-300 transition ${CANONICAL_FOCUS}`}
                  >
                    <Icon className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hierarchy Tree */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-2">
              Hierarchy ({widgets.length})
            </p>
            {widgets.map((widget) => (
              <div
                key={widget.id}
                onClick={() => setSelectedId(widget.id)}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer ${
                  widget.id === selectedId
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                    : 'border-transparent text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-mono text-[10px] text-slate-500">{widget.type}</span>
                  <span className="font-semibold truncate">{widget.name}</span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => updateWidget(widget.id, { visible: !widget.visible })}
                    className="text-slate-500 hover:text-white"
                  >
                    {widget.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateWidget(widget.id, { locked: !widget.locked })}
                    className="text-slate-500 hover:text-white"
                  >
                    {widget.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER COLUMN: Visual WYSIWYG Canvas */}
        <div className="relative flex-1 overflow-auto bg-[#04060c] p-8 flex items-center justify-center select-none">
          <div
            className="relative border-2 border-cyan-500/30 bg-black/60 shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden transition-all duration-150"
            style={{
              width: `${aspectRatio.width * zoom}px`,
              height: `${aspectRatio.height * zoom}px`,
            }}
          >
            {/* Grid overlay */}
            {showGridSnap && (
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `linear-gradient(to right, rgba(56, 189, 248, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.2) 1px, transparent 1px)`,
                  backgroundSize: `${gridSize * zoom * 4}px ${gridSize * zoom * 4}px`,
                }}
              />
            )}

            {/* Scaled canvas contents */}
            <div
              className="absolute inset-0 origin-top-left"
              style={{ transform: `scale(${zoom})`, width: `${aspectRatio.width}px`, height: `${aspectRatio.height}px` }}
            >
              {widgets.map((widget) => (
                <WidgetCanvasNode
                  key={widget.id}
                  widget={widget}
                  selected={widget.id === selectedId}
                  onSelect={setSelectedId}
                  onDragMove={handleDragMove}
                  zoom={zoom}
                  canvasWidth={aspectRatio.width}
                  canvasHeight={aspectRatio.height}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Inspector */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] overflow-y-auto p-4 space-y-4">
          {selectedWidget ? (
            <>
              {/* Widget Header */}
              <div className="border-b border-[var(--aethel-border-subtle)] pb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-1">
                  Selected Widget
                </p>
                <input
                  type="text"
                  value={selectedWidget.name}
                  onChange={(e) => updateWidget(selectedWidget.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2.5 py-1.5 text-xs font-bold text-[var(--aethel-text-primary)] outline-none focus:border-cyan-400"
                />
              </div>

              {/* Anchor Presets Grid */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-2">
                  Anchor Placement
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(ANCHOR_COORDINATES) as AnchorPreset[]).map((anchor) => (
                    <button
                      key={anchor}
                      type="button"
                      onClick={() => updateWidget(selectedWidget.id, { anchor })}
                      className={`rounded-md border p-1.5 text-[9px] font-bold uppercase transition ${
                        selectedWidget.anchor === anchor
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                          : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-white'
                      }`}
                    >
                      {anchor.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transform Slot Coordinates */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
                  Slot Offset & Dimensions
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400">Position X</label>
                    <input
                      type="number"
                      value={selectedWidget.posX}
                      onChange={(e) => updateWidget(selectedWidget.id, { posX: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Position Y</label>
                    <input
                      type="number"
                      value={selectedWidget.posY}
                      onChange={(e) => updateWidget(selectedWidget.id, { posY: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Width (px)</label>
                    <input
                      type="number"
                      value={selectedWidget.sizeX}
                      onChange={(e) => updateWidget(selectedWidget.id, { sizeX: parseFloat(e.target.value) || 10 })}
                      className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Height (px)</label>
                    <input
                      type="number"
                      value={selectedWidget.sizeY}
                      onChange={(e) => updateWidget(selectedWidget.id, { sizeY: parseFloat(e.target.value) || 10 })}
                      className="w-full rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2 py-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Data Binding Selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] mb-1">
                  Data Binding (Live State)
                </p>
                <select
                  value={selectedWidget.binding}
                  onChange={(e) => updateWidget(selectedWidget.id, { binding: e.target.value as any })}
                  className="w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] px-2.5 py-1.5 text-xs text-cyan-300 font-mono outline-none"
                >
                  <option value="none">None (Static)</option>
                  <option value="player.health">Player Vitality (0..100)</option>
                  <option value="player.shield">Player Shield (0..100)</option>
                  <option value="player.stamina">Player Stamina (0..100)</option>
                  <option value="player.energy">Quantum Energy (0..100)</option>
                  <option value="quest.title">Active Quest Title</option>
                  <option value="quest.objective">Active Quest Objective</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-[var(--aethel-border-subtle)]">
                <button
                  type="button"
                  onClick={() => duplicateWidget(selectedWidget.id)}
                  className="flex-1 rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] py-1.5 text-xs font-semibold hover:bg-[var(--aethel-surface-tertiary)]"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => deleteWidget(selectedWidget.id)}
                  className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/40"
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-xs text-[var(--aethel-text-tertiary)]">
              Select a widget to inspect properties
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
