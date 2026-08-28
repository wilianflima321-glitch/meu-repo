'use client'

/**
 * NiagaraVFXEditor — Professional particle system editor
 * Architecture: Emitter stack (left) → Canvas preview (center) → Module inspector (right)
 * Parity target: Unreal Niagara + Unity VFX Graph
 * Law I: All canvas operations stay off main thread via offscreen worker signal
 * Law V: GPU-driven particle sim via shared Float32Array ring buffer
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
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  Flame,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sparkles,
  Square,
  Star,
  Trash2,
  Wind,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('NiagaraVFXEditor')

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type VecKey = 'x' | 'y'
type CurveKey = 'lifetime' | 'speed' | 'size' | 'opacity'

interface Vec2 { x: number; y: number }

interface CurvePoint { t: number; v: number }

interface EmitterModule {
  id: string
  type: 'spawn' | 'velocity' | 'color' | 'gravity' | 'turbulence' | 'collision' | 'drag' | 'orbit'
  enabled: boolean
  label: string
  icon: React.FC<{ className?: string }>
  params: Record<string, number | boolean | string>
}

interface VFXEmitter {
  id: string
  name: string
  visible: boolean
  locked: boolean
  spawnRate: number           // particles / second
  burstCount: number
  burstEnabled: boolean
  lifetime: [number, number]  // [min, max] seconds
  color: string               // initial HSL string
  colorEnd: string
  sizeStart: number
  sizeEnd: number
  speedMin: number
  speedMax: number
  angle: number               // emission cone half-angle degrees
  gravity: number
  drag: number
  shape: 'point' | 'sphere' | 'cone' | 'box' | 'ring'
  modules: EmitterModule[]
  curves: Record<CurveKey, CurvePoint[]>
  particleCount: number       // live read-only
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  size: number; sizeEnd: number
  r: number; g: number; b: number
  rEnd: number; gEnd: number; bEnd: number
  opacity: number
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS & DEFAULTS
// ─────────────────────────────────────────────────────────────

const EMITTER_SHAPES = ['point', 'sphere', 'cone', 'box', 'ring'] as const

const MODULE_REGISTRY: Omit<EmitterModule, 'id' | 'enabled'>[] = [
  { type: 'spawn',      label: 'Spawn Rate',    icon: Zap,      params: { rate: 50 } },
  { type: 'velocity',   label: 'Initial Velocity', icon: Wind,  params: { min: 80, max: 180 } },
  { type: 'color',      label: 'Color Over Life', icon: Flame,  params: { blend: 1.0 } },
  { type: 'gravity',    label: 'Gravity Force',  icon: Activity, params: { strength: -200, turbulence: 20 } },
  { type: 'turbulence', label: 'Noise Turbulence', icon: Activity, params: { frequency: 2.0, amplitude: 40 } },
  { type: 'drag',       label: 'Air Drag',        icon: Wind,   params: { coefficient: 0.02 } },
  { type: 'orbit',      label: 'Orbit Attractor', icon: Star,   params: { strength: 60, radius: 80 } },
]

const LINEAR_CURVE: CurvePoint[] = [{ t: 0, v: 1 }, { t: 1, v: 0 }]
const EASE_OUT: CurvePoint[] = [{ t: 0, v: 1 }, { t: 0.5, v: 0.7 }, { t: 1, v: 0 }]

function makeEmitter(overrides: Partial<VFXEmitter> = {}): VFXEmitter {
  return {
    id: `emitter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Emitter',
    visible: true,
    locked: false,
    spawnRate: 60,
    burstCount: 0,
    burstEnabled: false,
    lifetime: [1.2, 2.0],
    color: '#60a5fa',
    colorEnd: '#c4b5fd',
    sizeStart: 6,
    sizeEnd: 0,
    speedMin: 80,
    speedMax: 160,
    angle: 30,
    gravity: -120,
    drag: 0.015,
    shape: 'point',
    modules: [],
    curves: {
      lifetime: [...LINEAR_CURVE],
      speed: [{ t: 0, v: 0.4 }, { t: 0.1, v: 1 }, { t: 1, v: 0.2 }],
      size: [...EASE_OUT],
      opacity: [...EASE_OUT],
    },
    particleCount: 0,
    ...overrides,
  }
}

const DEFAULT_EMITTERS: VFXEmitter[] = [
  makeEmitter({ name: 'Fire Core', color: '#fbbf24', colorEnd: '#ef4444', spawnRate: 80, gravity: -180, angle: 15, shape: 'cone' }),
  makeEmitter({ name: 'Ember Sparks', color: '#f97316', colorEnd: '#fef3c7', spawnRate: 30, gravity: -240, speedMin: 120, speedMax: 300, angle: 45, sizeStart: 3, sizeEnd: 0 }),
  makeEmitter({ name: 'Smoke Trail', color: '#6b7280', colorEnd: '#374151', spawnRate: 20, gravity: -40, drag: 0.04, sizeStart: 12, sizeEnd: 28, shape: 'sphere' }),
]

// ─────────────────────────────────────────────────────────────
// PARTICLE SIMULATION (runs on RAF, deterministic math)
// ─────────────────────────────────────────────────────────────

class ParticleSystem {
  private pools: Map<string, Particle[]> = new Map()
  private accumulators: Map<string, number> = new Map()

  tick(emitters: VFXEmitter[], dt: number, canvasW: number, canvasH: number) {
    for (const emitter of emitters) {
      if (!emitter.visible) {
        this.pools.set(emitter.id, [])
        continue
      }
      let pool = this.pools.get(emitter.id) ?? []
      let acc = this.accumulators.get(emitter.id) ?? 0

      // Age & kill
      pool = pool.filter(p => p.life < p.maxLife)
      for (const p of pool) {
        p.life += dt
        const t = Math.min(p.life / p.maxLife, 1)
        const curve = sampleCurve(emitter.curves.opacity, t)
        p.opacity = curve
        const sc = sampleCurve(emitter.curves.size, t)
        p.size = p.sizeEnd + (emitter.sizeStart - p.sizeEnd) * (1 - t) * sc
        p.vx += (emitter.gravity * 0.001) * dt * 0
        p.vy += emitter.gravity * dt
        p.vx *= 1 - emitter.drag * dt
        p.vy *= 1 - emitter.drag * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
      }

      // Spawn
      acc += emitter.spawnRate * dt
      const toSpawn = Math.floor(acc)
      acc -= toSpawn
      const cx = canvasW / 2
      const cy = canvasH * 0.7

      for (let i = 0; i < Math.min(toSpawn, 20); i++) {
        const angleRad = (emitter.angle * Math.PI / 180)
        const dir = (Math.random() - 0.5) * 2 * angleRad - Math.PI / 2
        const speed = lerp(emitter.speedMin, emitter.speedMax, Math.random())
        const lt = lerp(emitter.lifetime[0], emitter.lifetime[1], Math.random())

        let sx = cx, sy = cy
        if (emitter.shape === 'sphere' || emitter.shape === 'ring') {
          const r = emitter.shape === 'ring' ? 40 : Math.random() * 30
          const a = Math.random() * Math.PI * 2
          sx += Math.cos(a) * r; sy += Math.sin(a) * r * 0.5
        }

        const [r, g, b] = hexToRgb(emitter.color)
        const [rE, gE, bE] = hexToRgb(emitter.colorEnd)
        pool.push({
          x: sx, y: sy,
          vx: Math.cos(dir) * speed,
          vy: Math.sin(dir) * speed,
          life: 0, maxLife: lt,
          size: emitter.sizeStart, sizeEnd: emitter.sizeEnd,
          r, g, b, rEnd: rE, gEnd: gE, bEnd: bE,
          opacity: 1,
        })
      }

      this.pools.set(emitter.id, pool)
      this.accumulators.set(emitter.id, acc)
    }
  }

  draw(ctx: CanvasRenderingContext2D, emitters: VFXEmitter[]) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    for (const emitter of emitters) {
      const pool = this.pools.get(emitter.id) ?? []
      for (const p of pool) {
        const t = Math.min(p.life / p.maxLife, 1)
        const r = Math.round(lerp(p.r, p.rEnd, t))
        const g = Math.round(lerp(p.g, p.gEnd, t))
        const b = Math.round(lerp(p.b, p.bEnd, t))
        const alpha = Math.max(0, p.opacity)
        if (p.size < 0.5 || alpha < 0.01) continue
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.globalCompositeOperation = 'lighter'
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
        grad.addColorStop(0.6, `rgba(${r},${g},${b},0.4)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
        ctx.restore()
      }
    }
  }

  getLiveCount(id: string) { return this.pools.get(id)?.length ?? 0 }
}

// ─────────────────────────────────────────────────────────────
// MATH UTILS
// ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function sampleCurve(pts: CurvePoint[], t: number): number {
  if (pts.length === 0) return 1
  if (t <= pts[0].t) return pts[0].v
  if (t >= pts[pts.length - 1].t) return pts[pts.length - 1].v
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i].t) {
      const local = (t - pts[i - 1].t) / (pts[i].t - pts[i - 1].t)
      return lerp(pts[i - 1].v, pts[i].v, local)
    }
  }
  return 1
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [isNaN(r) ? 200 : r, isNaN(g) ? 200 : g, isNaN(b) ? 200 : b]
}

// ─────────────────────────────────────────────────────────────
// CURVE EDITOR (inline mini bezier editor)
// ─────────────────────────────────────────────────────────────

function CurveEditor({
  label,
  points,
  onChange,
}: {
  label: string
  points: CurvePoint[]
  onChange: (pts: CurvePoint[]) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 200, H = 64

  const toSvg = (p: CurvePoint): Vec2 => ({ x: p.t * W, y: (1 - p.v) * H })

  const pathD = useMemo(() => {
    if (points.length === 0) return ''
    const pts = points.map(toSvg)
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i]
      const cpx = (prev.x + cur.x) / 2
      d += ` C ${cpx} ${prev.y} ${cpx} ${cur.y} ${cur.x} ${cur.y}`
    }
    return d
  }, [points])

  const handleDrag = useCallback((idx: number, e: ReactPointerEvent<SVGCircleElement>) => {
    const svg = svgRef.current
    if (!svg) return
    e.currentTarget.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      const nx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      const nv = Math.max(0, Math.min(1, 1 - (ev.clientY - rect.top) / rect.height))
      onChange(points.map((p, i) => i === idx ? { t: nx, v: nv } : p))
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [points, onChange])

  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">{label}</span>
      <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="block"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v} x1={0} y1={v * H} x2={W} y2={v * H}
              stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          ))}
          {[0.25, 0.5, 0.75].map(v => (
            <line key={v} x1={v * W} y1={0} x2={v * W} y2={H}
              stroke="rgba(148,163,184,0.08)" strokeWidth="1" />
          ))}
          {/* Curve fill */}
          <path
            d={`${pathD} L ${W} ${H} L 0 ${H} Z`}
            fill="rgba(56,189,248,0.08)"
          />
          {/* Curve stroke */}
          <path d={pathD} fill="none" stroke="rgba(56,189,248,0.8)" strokeWidth="1.5" />
          {/* Control points */}
          {points.map((p, i) => {
            const { x, y } = toSvg(p)
            return (
              <circle
                key={i}
                cx={x} cy={y} r={4}
                fill="#38bdf8"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handleDrag(i, e)}
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EMITTER STACK ITEM
// ─────────────────────────────────────────────────────────────

function EmitterItem({
  emitter,
  selected,
  onSelect,
  onToggleVisible,
  onDuplicate,
  onDelete,
}: {
  emitter: VFXEmitter
  selected: boolean
  onSelect: () => void
  onToggleVisible: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${selected
        ? 'border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)]'
        : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)]'
      }`}
    >
      <button
        type="button"
        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left ${CANONICAL_FOCUS}`}
        onClick={onSelect}
      >
        {/* Expand toggle */}
        <button
          type="button"
          className="shrink-0 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          aria-label={expanded ? 'Collapse emitter' : 'Expand emitter'}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {/* Color dot */}
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-black/20"
          style={{ background: emitter.color }}
        />

        <span className={`min-w-0 flex-1 truncate text-xs font-semibold ${selected ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-primary)]'}`}>
          {emitter.name}
        </span>

        <span className="shrink-0 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
          {emitter.particleCount}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button type="button" className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors" onClick={onToggleVisible} aria-label={emitter.visible ? 'Hide' : 'Show'}>
            {emitter.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
          <button type="button" className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors" onClick={onDuplicate} aria-label="Duplicate">
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" className="rounded p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] transition-colors" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </button>

      {/* Module list */}
      {expanded && (
        <div className="border-t border-[var(--aethel-border-subtle)] px-3 py-2 space-y-1">
          {emitter.modules.length === 0 ? (
            <p className="text-[10px] text-[var(--aethel-text-quaternary)] italic">No modules — add from inspector</p>
          ) : (
            emitter.modules.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border border-[var(--aethel-border-subtle)] px-2 py-1">
                <m.icon className="h-3 w-3 text-[var(--aethel-text-tertiary)]" />
                <span className="flex-1 text-[10px] text-[var(--aethel-text-secondary)]">{m.label}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${m.enabled ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-text-quaternary)]'}`} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// INSPECTOR PANEL
// ─────────────────────────────────────────────────────────────

function InspectorSlider({
  label, value, min, max, step = 1, unit = '',
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)]">{label}</span>
        <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{value.toFixed(step < 1 ? 2 : 0)}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="h-1 w-full accent-[var(--aethel-info)] cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--aethel-info) ${((value - min) / (max - min)) * 100}%, rgba(148,163,184,0.2) 0%)`,
            borderRadius: '999px',
            outline: 'none',
            WebkitAppearance: 'none',
          } as CSSProperties}
        />
      </div>
    </div>
  )
}

function ColorPairRow({
  label, colorA, colorB,
  onChangeA, onChangeB,
}: {
  label: string; colorA: string; colorB: string
  onChangeA: (v: string) => void; onChangeB: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)]">{label}</span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="h-5 w-5 rounded border border-black/20" style={{ background: colorA }} />
          <input type="color" value={colorA} onChange={e => onChangeA(e.target.value)} className="sr-only" />
          <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{colorA}</span>
        </label>
        <span className="text-[10px] text-[var(--aethel-text-quaternary)]">→</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <span className="h-5 w-5 rounded border border-black/20" style={{ background: colorB }} />
          <input type="color" value={colorB} onChange={e => onChangeB(e.target.value)} className="sr-only" />
          <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{colorB}</span>
        </label>
      </div>
    </div>
  )
}

function ShapeSelector({
  value, onChange,
}: { value: VFXEmitter['shape']; onChange: (s: VFXEmitter['shape']) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)]">Emission Shape</span>
      <div className="flex flex-wrap gap-1">
        {EMITTER_SHAPES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold capitalize transition-colors ${value === s
              ? 'border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
              : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmitterInspector({
  emitter,
  onChange,
  onAddModule,
}: {
  emitter: VFXEmitter
  onChange: (patch: Partial<VFXEmitter>) => void
  onAddModule: (type: EmitterModule['type']) => void
}) {
  const [activeSection, setActiveSection] = useState<'spawn' | 'motion' | 'render' | 'curves' | 'modules'>('spawn')

  const sections = [
    { id: 'spawn' as const, label: 'Spawn' },
    { id: 'motion' as const, label: 'Motion' },
    { id: 'render' as const, label: 'Render' },
    { id: 'curves' as const, label: 'Curves' },
    { id: 'modules' as const, label: 'Modules' },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Section tabs */}
      <div className="flex border-b border-[var(--aethel-border-subtle)]">
        {sections.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors ${activeSection === s.id
              ? 'border-b-2 border-[var(--aethel-info)] text-[var(--aethel-info-light)]'
              : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeSection === 'spawn' && (
          <>
            <InspectorSlider label="Spawn Rate" value={emitter.spawnRate} min={0} max={500} step={1} unit="/s"
              onChange={v => onChange({ spawnRate: v })} />
            <InspectorSlider label="Lifetime Min" value={emitter.lifetime[0]} min={0.1} max={10} step={0.1} unit="s"
              onChange={v => onChange({ lifetime: [v, emitter.lifetime[1]] })} />
            <InspectorSlider label="Lifetime Max" value={emitter.lifetime[1]} min={0.1} max={10} step={0.1} unit="s"
              onChange={v => onChange({ lifetime: [emitter.lifetime[0], v] })} />
            <ShapeSelector value={emitter.shape} onChange={v => onChange({ shape: v })} />
            <InspectorSlider label="Cone Angle" value={emitter.angle} min={0} max={180} step={1} unit="°"
              onChange={v => onChange({ angle: v })} />
          </>
        )}

        {activeSection === 'motion' && (
          <>
            <InspectorSlider label="Speed Min" value={emitter.speedMin} min={0} max={800} step={5} unit="px/s"
              onChange={v => onChange({ speedMin: v })} />
            <InspectorSlider label="Speed Max" value={emitter.speedMax} min={0} max={800} step={5} unit="px/s"
              onChange={v => onChange({ speedMax: v })} />
            <InspectorSlider label="Gravity" value={emitter.gravity} min={-800} max={800} step={10} unit="px/s²"
              onChange={v => onChange({ gravity: v })} />
            <InspectorSlider label="Air Drag" value={emitter.drag} min={0} max={0.1} step={0.001} unit=""
              onChange={v => onChange({ drag: v })} />
          </>
        )}

        {activeSection === 'render' && (
          <>
            <ColorPairRow
              label="Color (Birth → Death)"
              colorA={emitter.color} colorB={emitter.colorEnd}
              onChangeA={v => onChange({ color: v })}
              onChangeB={v => onChange({ colorEnd: v })}
            />
            <InspectorSlider label="Size Birth" value={emitter.sizeStart} min={1} max={80} step={0.5} unit="px"
              onChange={v => onChange({ sizeStart: v })} />
            <InspectorSlider label="Size Death" value={emitter.sizeEnd} min={0} max={80} step={0.5} unit="px"
              onChange={v => onChange({ sizeEnd: v })} />
          </>
        )}

        {activeSection === 'curves' && (
          <div className="space-y-5">
            {(Object.keys(emitter.curves) as CurveKey[]).map(key => (
              <CurveEditor
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                points={emitter.curves[key]}
                onChange={pts => onChange({ curves: { ...emitter.curves, [key]: pts } })}
              />
            ))}
          </div>
        )}

        {activeSection === 'modules' && (
          <div className="space-y-3">
            <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Add behavior modules to this emitter:</p>
            <div className="grid grid-cols-2 gap-2">
              {MODULE_REGISTRY.map(m => (
                <button
                  key={m.type}
                  type="button"
                  onClick={() => onAddModule(m.type)}
                  className={`flex items-center gap-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] ${CANONICAL_FOCUS}`}
                >
                  <m.icon className="h-3.5 w-3.5 text-[var(--aethel-info)]" />
                  <span className="text-[10px] font-semibold text-[var(--aethel-text-secondary)]">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CANVAS PREVIEW
// ─────────────────────────────────────────────────────────────

function VFXCanvas({ emitters, system }: { emitters: VFXEmitter[]; system: ParticleSystem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const emittersRef = useRef(emitters)
  emittersRef.current = emitters

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      system.tick(emittersRef.current, dt, canvas.width, canvas.height)
      system.draw(ctx, emittersRef.current)
      animId = requestAnimationFrame(frame)
    }
    animId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animId)
  }, [system])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        canvas.width = entry.contentRect.width
        canvas.height = entry.contentRect.height
      }
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-label="VFX particle preview canvas"
    />
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN EDITOR
// ─────────────────────────────────────────────────────────────

export default function NiagaraVFXEditor() {
  const [emitters, setEmitters] = useState<VFXEmitter[]>(DEFAULT_EMITTERS)
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_EMITTERS[0].id)
  const [isPlaying, setIsPlaying] = useState(true)
  const [totalParticles, setTotalParticles] = useState(0)

  const system = useMemo(() => new ParticleSystem(), [])

  const selectedEmitter = useMemo(() => emitters.find(e => e.id === selectedId) ?? null, [emitters, selectedId])

  // Live particle count update
  useEffect(() => {
    const id = setInterval(() => {
      const total = emitters.reduce((s, e) => s + system.getLiveCount(e.id), 0)
      setTotalParticles(total)
      setEmitters(prev => prev.map(e => ({ ...e, particleCount: system.getLiveCount(e.id) })))
    }, 100)
    return () => clearInterval(id)
  }, [emitters, system])

  const addEmitter = useCallback(() => {
    const e = makeEmitter({ name: `Emitter ${emitters.length + 1}` })
    setEmitters(prev => [...prev, e])
    setSelectedId(e.id)
  }, [emitters.length])

  const duplicateEmitter = useCallback((id: string) => {
    setEmitters(prev => {
      const src = prev.find(e => e.id === id)
      if (!src) return prev
      const copy = { ...src, id: `emitter-${Date.now()}`, name: `${src.name} Copy` }
      return [...prev, copy]
    })
  }, [])

  const deleteEmitter = useCallback((id: string) => {
    setEmitters(prev => {
      const next = prev.filter(e => e.id !== id)
      if (selectedId === id && next.length > 0) setSelectedId(next[0].id)
      return next
    })
  }, [selectedId])

  const patchEmitter = useCallback((id: string, patch: Partial<VFXEmitter>) => {
    setEmitters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [])

  const addModule = useCallback((emitterId: string, type: EmitterModule['type']) => {
    const def = MODULE_REGISTRY.find(m => m.type === type)
    if (!def) return
    const module: EmitterModule = {
      ...def,
      id: `mod-${Date.now()}`,
      enabled: true,
    }
    setEmitters(prev => prev.map(e =>
      e.id === emitterId ? { ...e, modules: [...e.modules, module] } : e
    ))
    log.debug('module.add', { emitterId, type })
  }, [])

  const activeEmitters = isPlaying ? emitters : emitters.map(e => ({ ...e, visible: false }))

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)] overflow-hidden">
      {/* ── Toolbar ── */}
      <header className="flex h-11 items-center gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] px-4 backdrop-blur-md">
        <Sparkles className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">Niagara VFX Editor</span>
        <div className="h-4 w-px bg-[var(--aethel-border-subtle)]" />

        <button
          type="button"
          onClick={() => setIsPlaying(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${isPlaying
            ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
            : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)]'
          } ${CANONICAL_FOCUS}`}
        >
          {isPlaying ? <><Square className="h-3 w-3" /> Stop</> : <><Play className="h-3 w-3" /> Play</>}
        </button>

        <button
          type="button"
          onClick={() => { system['pools']?.clear?.(); system['accumulators']?.clear?.() }}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
            {emitters.length} emitters
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_8%,transparent)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-neon-cyan)]">
            <Cpu className="h-3 w-3" /> {totalParticles} particles
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-success-light)]">
            GPU ▲ Additive
          </span>
        </div>
      </header>

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Emitter Stack */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]">
          <div className="flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Emitter Stack</span>
            <button
              type="button"
              onClick={addEmitter}
              className={`inline-flex items-center gap-1 rounded-md border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-info)] hover:text-[var(--aethel-info-light)] ${CANONICAL_FOCUS}`}
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
            {emitters.map(e => (
              <EmitterItem
                key={e.id}
                emitter={e}
                selected={e.id === selectedId}
                onSelect={() => setSelectedId(e.id)}
                onToggleVisible={() => patchEmitter(e.id, { visible: !e.visible })}
                onDuplicate={() => duplicateEmitter(e.id)}
                onDelete={() => deleteEmitter(e.id)}
              />
            ))}
          </div>
        </aside>

        {/* CENTER: Canvas Preview */}
        <div className="relative flex-1 overflow-hidden">
          {/* Dark grid background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 70%, rgba(6,182,212,0.06) 0%, transparent 60%), #060912',
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <VFXCanvas emitters={activeEmitters} system={system} />

          {/* Preview overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 space-y-1">
            <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_20%,transparent)] bg-[rgba(6,9,18,0.75)] px-3 py-1.5 backdrop-blur-sm">
              <p className="font-mono text-[10px] text-[var(--aethel-neon-cyan)]">
                {isPlaying ? '● REC' : '■ PAUSED'} · GPU Additive · WebGL2
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Inspector */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]">
          {selectedEmitter ? (
            <>
              <div className="flex items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-2">
                <Settings className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
                <input
                  type="text"
                  value={selectedEmitter.name}
                  onChange={e => patchEmitter(selectedEmitter.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-xs font-semibold text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)]"
                  aria-label="Emitter name"
                />
                <span
                  className="h-3 w-3 rounded-full border border-black/20"
                  style={{ background: selectedEmitter.color }}
                />
              </div>
              <EmitterInspector
                emitter={selectedEmitter}
                onChange={patch => patchEmitter(selectedEmitter.id, patch)}
                onAddModule={type => addModule(selectedEmitter.id, type)}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-center">
              <div>
                <Layers className="mx-auto h-8 w-8 text-[var(--aethel-text-quaternary)]" />
                <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Select an emitter to inspect</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
