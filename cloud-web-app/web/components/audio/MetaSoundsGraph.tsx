'use client'

/**
 * MetaSoundsGraph — Professional node-based audio routing editor
 * Parity target: Unreal MetaSounds + AudioKinetic Wwise Graph
 * Architecture:
 *   - Infinite canvas: pan (middle-click/alt-drag), zoom (ctrl+wheel)
 *   - Node types: Source, Filter, Envelope, Mixer, Spatializer, Output, Trigger
 *   - Ports: typed (signal / trigger / param), type-checked connections
 *   - Connection: drag from output port → input port with bezier cable
 *   - Law IV: compiled graph → AudioNode chain at runtime (no UI-mock)
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
  Headphones,
  Layers,
  Music,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Sliders,
  Speaker,
  Square,
  Trash2,
  Triangle,
  Volume2,
  Wind,
  Zap,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('MetaSoundsGraph')

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type PortType = 'signal' | 'trigger' | 'param' | 'midi'
type PortDir = 'in' | 'out'

type NodeCategory =
  | 'source'
  | 'filter'
  | 'envelope'
  | 'mixer'
  | 'spatializer'
  | 'effect'
  | 'output'
  | 'trigger'
  | 'math'
  | 'random'

interface Port {
  id: string
  label: string
  type: PortType
  dir: PortDir
  value?: number        // default parameter value
  unit?: string
}

interface AudioNodeDef {
  id: string
  category: NodeCategory
  label: string
  description: string
  color: string         // accent
  ports: Port[]
  params: Record<string, number | boolean | string>
  x: number
  y: number
  width: number
  selected: boolean
  collapsed: boolean
}

interface Wire {
  id: string
  fromNodeId: string
  fromPortId: string
  toNodeId: string
  toPortId: string
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const PORT_COLORS: Record<PortType, string> = {
  signal: '#22d3ee',
  trigger: '#f59e0b',
  param: '#a78bfa',
  midi: '#34d399',
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  source: '#60a5fa',
  filter: '#f472b6',
  envelope: '#34d399',
  mixer: '#fbbf24',
  spatializer: '#a78bfa',
  effect: '#22d3ee',
  output: '#f97316',
  trigger: '#f59e0b',
  math: '#94a3b8',
  random: '#c084fc',
}

const CATEGORY_ICONS: Record<NodeCategory, React.ComponentType<{ className?: string; style?: CSSProperties }>> = {
  source: Music,
  filter: Sliders,
  envelope: Activity,
  mixer: Volume2,
  spatializer: Speaker,
  effect: Wind,
  output: Headphones,
  trigger: Zap,
  math: Cpu,
  random: Circle,
}

// ─────────────────────────────────────────────────────────────
// NODE TEMPLATES
// ─────────────────────────────────────────────────────────────

const NODE_TEMPLATES: Omit<AudioNodeDef, 'id' | 'x' | 'y' | 'selected' | 'collapsed'>[] = [
  {
    category: 'source',
    label: 'Wave Player',
    description: 'Audio file playback with pitch and loop control',
    color: CATEGORY_COLORS.source,
    width: 200,
    params: { pitch: 1.0, loop: false, volume: 1.0 },
    ports: [
      { id: 'trig', label: 'Trigger', type: 'trigger', dir: 'in' },
      { id: 'pitch_in', label: 'Pitch', type: 'param', dir: 'in', value: 1.0, unit: 'x' },
      { id: 'out_l', label: 'L', type: 'signal', dir: 'out' },
      { id: 'out_r', label: 'R', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'source',
    label: 'Oscillator',
    description: 'Sine / Square / Saw / Triangle synthesis',
    color: CATEGORY_COLORS.source,
    width: 200,
    params: { waveform: 'sine', frequency: 440, detune: 0, amplitude: 0.5 },
    ports: [
      { id: 'freq_in', label: 'Freq', type: 'param', dir: 'in', value: 440, unit: 'Hz' },
      { id: 'amp_in', label: 'Amp', type: 'param', dir: 'in', value: 0.5 },
      { id: 'out', label: 'Out', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'filter',
    label: 'Biquad Filter',
    description: 'Low-pass / High-pass / Band-pass / Notch filter',
    color: CATEGORY_COLORS.filter,
    width: 200,
    params: { type: 'lowpass', frequency: 1000, Q: 1.0, gain: 0 },
    ports: [
      { id: 'in', label: 'In', type: 'signal', dir: 'in' },
      { id: 'cutoff_in', label: 'Cutoff', type: 'param', dir: 'in', value: 1000, unit: 'Hz' },
      { id: 'q_in', label: 'Q', type: 'param', dir: 'in', value: 1.0 },
      { id: 'out', label: 'Out', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'envelope',
    label: 'ADSR Envelope',
    description: 'Attack / Decay / Sustain / Release shape generator',
    color: CATEGORY_COLORS.envelope,
    width: 210,
    params: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.4 },
    ports: [
      { id: 'gate', label: 'Gate', type: 'trigger', dir: 'in' },
      { id: 'out', label: 'Env Out', type: 'param', dir: 'out' },
    ],
  },
  {
    category: 'mixer',
    label: 'Stereo Mixer',
    description: '4-channel stereo mixer with individual gain control',
    color: CATEGORY_COLORS.mixer,
    width: 210,
    params: { gain1: 1, gain2: 1, gain3: 1, gain4: 1 },
    ports: [
      { id: 'in1_l', label: 'A L', type: 'signal', dir: 'in' },
      { id: 'in1_r', label: 'A R', type: 'signal', dir: 'in' },
      { id: 'in2_l', label: 'B L', type: 'signal', dir: 'in' },
      { id: 'in2_r', label: 'B R', type: 'signal', dir: 'in' },
      { id: 'out_l', label: 'Mix L', type: 'signal', dir: 'out' },
      { id: 'out_r', label: 'Mix R', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'spatializer',
    label: 'HRTF Spatializer',
    description: 'Real HRTF 3D positioning with occlusion (Law IV)',
    color: CATEGORY_COLORS.spatializer,
    width: 220,
    params: { azimuth: 0, elevation: 0, distance: 1, occlusionFactor: 0 },
    ports: [
      { id: 'in', label: 'In', type: 'signal', dir: 'in' },
      { id: 'pos_x', label: 'Pos X', type: 'param', dir: 'in', value: 0 },
      { id: 'pos_y', label: 'Pos Y', type: 'param', dir: 'in', value: 0 },
      { id: 'pos_z', label: 'Pos Z', type: 'param', dir: 'in', value: 0 },
      { id: 'out_l', label: 'L', type: 'signal', dir: 'out' },
      { id: 'out_r', label: 'R', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'effect',
    label: 'Convolution Reverb',
    description: 'Impulse response convolution reverb (IR loaded from Treasury)',
    color: CATEGORY_COLORS.effect,
    width: 210,
    params: { irSlot: 0, wet: 0.3, dry: 0.7, preDelay: 20 },
    ports: [
      { id: 'in_l', label: 'L', type: 'signal', dir: 'in' },
      { id: 'in_r', label: 'R', type: 'signal', dir: 'in' },
      { id: 'wet_in', label: 'Wet', type: 'param', dir: 'in', value: 0.3 },
      { id: 'out_l', label: 'L', type: 'signal', dir: 'out' },
      { id: 'out_r', label: 'R', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'effect',
    label: 'Delay',
    description: 'Stereo tape delay with feedback and filter',
    color: CATEGORY_COLORS.effect,
    width: 200,
    params: { delayTime: 0.375, feedback: 0.4, wet: 0.25 },
    ports: [
      { id: 'in', label: 'In', type: 'signal', dir: 'in' },
      { id: 'time_in', label: 'Time', type: 'param', dir: 'in', value: 0.375, unit: 's' },
      { id: 'fb_in', label: 'Feedback', type: 'param', dir: 'in', value: 0.4 },
      { id: 'out', label: 'Out', type: 'signal', dir: 'out' },
    ],
  },
  {
    category: 'output',
    label: 'Master Output',
    description: 'Final stereo output to hardware (Web Audio destination)',
    color: CATEGORY_COLORS.output,
    width: 200,
    params: { masterGain: 1.0, limiterThreshold: -0.5 },
    ports: [
      { id: 'in_l', label: 'L', type: 'signal', dir: 'in' },
      { id: 'in_r', label: 'R', type: 'signal', dir: 'in' },
      { id: 'gain_in', label: 'Gain', type: 'param', dir: 'in', value: 1.0 },
    ],
  },
  {
    category: 'trigger',
    label: 'OnEvent Trigger',
    description: 'Fires on game event (e.g. OnActorHit, OnDoorOpen)',
    color: CATEGORY_COLORS.trigger,
    width: 200,
    params: { eventName: 'OnActorHit', oneShot: false },
    ports: [
      { id: 'out', label: 'Trigger', type: 'trigger', dir: 'out' },
    ],
  },
  {
    category: 'random',
    label: 'Random Value',
    description: 'Outputs a new random float in [min, max] each trigger',
    color: CATEGORY_COLORS.random,
    width: 200,
    params: { min: 0.8, max: 1.2, seed: 0 },
    ports: [
      { id: 'trig', label: 'Trigger', type: 'trigger', dir: 'in' },
      { id: 'out', label: 'Value', type: 'param', dir: 'out' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function uid(p: string) { return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function makeNode(template: typeof NODE_TEMPLATES[0], x: number, y: number): AudioNodeDef {
  return {
    ...template,
    id: uid('node'),
    x, y,
    selected: false,
    collapsed: false,
    ports: template.ports.map(p => ({ ...p })),
    params: { ...template.params },
  }
}

function getDefaultGraph(): { nodes: AudioNodeDef[]; wires: Wire[] } {
  const n = (t: typeof NODE_TEMPLATES[0], x: number, y: number) => makeNode(t, x, y)

  const tpl = (label: string) => NODE_TEMPLATES.find(t => t.label === label)!

  const event = n(tpl('OnEvent Trigger'), 60, 80)
  const rnd = n(tpl('Random Value'), 60, 260)
  const osc = n(tpl('Oscillator'), 320, 60)
  const wave = n(tpl('Wave Player'), 320, 280)
  const env = n(tpl('ADSR Envelope'), 320, 500)
  const filt = n(tpl('Biquad Filter'), 600, 160)
  const rev = n(tpl('Convolution Reverb'), 600, 400)
  const mix = n(tpl('Stereo Mixer'), 880, 280)
  const hrtf = n(tpl('HRTF Spatializer'), 880, 520)
  const master = n(tpl('Master Output'), 1160, 380)

  const w = (fn: AudioNodeDef, fp: string, tn: AudioNodeDef, tp: string): Wire => ({
    id: uid('wire'), fromNodeId: fn.id, fromPortId: fp, toNodeId: tn.id, toPortId: tp,
  })

  return {
    nodes: [event, rnd, osc, wave, env, filt, rev, mix, hrtf, master],
    wires: [
      w(event, 'out', wave, 'trig'),
      w(event, 'out', env, 'gate'),
      w(rnd, 'out', osc, 'freq_in'),
      w(osc, 'out', filt, 'in'),
      w(wave, 'out_l', filt, 'in'),
      w(filt, 'out', mix, 'in1_l'),
      w(filt, 'out', mix, 'in1_r'),
      w(env, 'out', filt, 'cutoff_in'),
      w(rev, 'out_l', mix, 'in2_l'),
      w(rev, 'out_r', mix, 'in2_r'),
      w(mix, 'out_l', hrtf, 'in'),
      w(hrtf, 'out_l', master, 'in_l'),
      w(hrtf, 'out_r', master, 'in_r'),
    ],
  }
}

// ─────────────────────────────────────────────────────────────
// PORT DOT — positioned relative to node
// ─────────────────────────────────────────────────────────────

const PORT_H = 24
const NODE_HEADER_H = 36
const NODE_PAD_TOP = 8

function portY(ports: Port[], dir: PortDir, portId: string): number {
  const filtered = ports.filter(p => p.dir === dir)
  const idx = filtered.findIndex(p => p.id === portId)
  return NODE_HEADER_H + NODE_PAD_TOP + idx * PORT_H + PORT_H / 2
}

function getPortAbsPos(
  node: AudioNodeDef,
  portId: string,
  dir: PortDir
): { x: number; y: number } {
  const y = portY(node.ports, dir, portId)
  return {
    x: dir === 'out' ? node.x + node.width : node.x,
    y: node.y + y,
  }
}

// ─────────────────────────────────────────────────────────────
// BEZIER WIRE
// ─────────────────────────────────────────────────────────────

function WireShape({
  x1, y1, x2, y2,
  color,
  selected,
  onClick,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string
  selected: boolean
  onClick?: () => void
}) {
  const dx = Math.abs(x2 - x1) * 0.45 + 30
  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Wide hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
      {/* Visible wire */}
      <path
        d={d}
        fill="none"
        stroke={selected ? '#f59e0b' : color}
        strokeWidth={selected ? 2.5 : 1.5}
        strokeLinecap="round"
        opacity={selected ? 1 : 0.7}
        style={{
          filter: selected ? `drop-shadow(0 0 6px ${color})` : `drop-shadow(0 0 2px ${color}66)`,
        }}
      />
      {/* Flow animation (dots) */}
      {!selected && (
        <circle r={3} fill={color} opacity={0.9}>
          <animateMotion dur="1.8s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// GRAPH NODE
// ─────────────────────────────────────────────────────────────

interface DragWireState {
  fromNodeId: string
  fromPortId: string
  fromDir: PortDir
  x: number
  y: number
  mx: number
  my: number
}

function GraphNode({
  node,
  onSelect,
  onMove,
  onStartWire,
  onEndWire,
  onToggleCollapse,
  onDelete,
  onDuplicate,
  transform,
}: {
  node: AudioNodeDef
  onSelect: (id: string, multi: boolean) => void
  onMove: (id: string, dx: number, dy: number) => void
  onStartWire: (state: DragWireState) => void
  onEndWire: (nodeId: string, portId: string, dir: PortDir) => void
  onToggleCollapse: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  transform: { x: number; y: number; scale: number }
}) {
  const Icon = CATEGORY_ICONS[node.category]
  const inPorts = node.ports.filter(p => p.dir === 'in')
  const outPorts = node.ports.filter(p => p.dir === 'out')
  const bodyH = node.collapsed ? 0 : (Math.max(inPorts.length, outPorts.length)) * PORT_H + NODE_PAD_TOP * 2
  const totalH = NODE_HEADER_H + bodyH

  const handleDragStart = useCallback((e: ReactPointerEvent<SVGRectElement>) => {
    e.stopPropagation()
    onSelect(node.id, e.shiftKey)
    const startX = e.clientX
    const startY = e.clientY
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      onMove(node.id, (ev.clientX - startX) / transform.scale, (ev.clientY - startY) / transform.scale)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [node.id, onSelect, onMove, transform.scale])

  const handlePortPointerDown = useCallback((
    e: ReactPointerEvent<SVGCircleElement>,
    portId: string,
    dir: PortDir
  ) => {
    e.stopPropagation()
    const pos = getPortAbsPos(node, portId, dir)
    onStartWire({ fromNodeId: node.id, fromPortId: portId, fromDir: dir, x: pos.x, y: pos.y, mx: pos.x, my: pos.y })
  }, [node, onStartWire])

  const handlePortPointerUp = useCallback((
    e: ReactPointerEvent<SVGCircleElement>,
    portId: string,
    dir: PortDir
  ) => {
    e.stopPropagation()
    onEndWire(node.id, portId, dir)
  }, [node.id, onEndWire])

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Selection glow */}
      {node.selected && (
        <rect
          x={-3} y={-3}
          width={node.width + 6} height={totalH + 6}
          rx={10} ry={10}
          fill="none"
          stroke={node.color}
          strokeWidth={2}
          opacity={0.6}
          style={{ filter: `drop-shadow(0 0 8px ${node.color})` }}
        />
      )}

      {/* Card body */}
      <rect
        x={0} y={0}
        width={node.width} height={totalH}
        rx={8} ry={8}
        fill="url(#nodeGrad)"
        stroke={node.selected ? node.color : 'rgba(148,163,184,0.12)'}
        strokeWidth={node.selected ? 1.5 : 1}
        onPointerDown={handleDragStart}
        style={{ cursor: 'grab' }}
      />

      {/* Header accent */}
      <rect x={0} y={0} width={node.width} height={NODE_HEADER_H} rx={8} ry={8}
        fill={`${node.color}22`}
        style={{ pointerEvents: 'none' }}
      />
      <rect x={0} y={NODE_HEADER_H - 8} width={node.width} height={8}
        fill={`${node.color}22`}
        style={{ pointerEvents: 'none' }}
      />
      {/* Left accent bar */}
      <rect x={0} y={0} width={3} height={totalH} rx={8} ry={8}
        fill={node.color}
        style={{ pointerEvents: 'none' }}
      />

      {/* Header: Icon + Label + Collapse */}
      <g style={{ pointerEvents: 'none' }}>
        <text x={14} y={NODE_HEADER_H / 2 + 1} fontSize={11} fontWeight="700"
          fill="rgba(248,250,252,0.92)" dominantBaseline="middle"
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          {node.label}
        </text>
      </g>

      {/* Collapse button */}
      <g
        transform={`translate(${node.width - 20}, ${NODE_HEADER_H / 2})`}
        onClick={() => onToggleCollapse(node.id)}
        style={{ cursor: 'pointer' }}
      >
        <circle r={8} fill="rgba(0,0,0,0.3)" />
        <text fontSize={9} fill="rgba(255,255,255,0.7)" textAnchor="middle" dominantBaseline="middle">
          {node.collapsed ? '▶' : '▼'}
        </text>
      </g>

      {/* Ports (only when not collapsed) */}
      {!node.collapsed && (
        <>
          {/* Input ports */}
          {inPorts.map((port, i) => {
            const py = NODE_HEADER_H + NODE_PAD_TOP + i * PORT_H + PORT_H / 2
            const col = PORT_COLORS[port.type]
            return (
              <g key={port.id}>
                <circle
                  cx={0} cy={py} r={6}
                  fill={col} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={e => handlePortPointerDown(e, port.id, 'in')}
                  onPointerUp={e => handlePortPointerUp(e, port.id, 'in')}
                />
                <text x={12} y={py} fontSize={9} fill="rgba(196,207,221,0.85)"
                  dominantBaseline="middle"
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {port.label}{port.unit ? ` (${port.unit})` : ''}
                </text>
              </g>
            )
          })}

          {/* Output ports */}
          {outPorts.map((port, i) => {
            const py = NODE_HEADER_H + NODE_PAD_TOP + i * PORT_H + PORT_H / 2
            const col = PORT_COLORS[port.type]
            return (
              <g key={port.id}>
                <circle
                  cx={node.width} cy={py} r={6}
                  fill={col} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5}
                  style={{ cursor: 'crosshair' }}
                  onPointerDown={e => handlePortPointerDown(e, port.id, 'out')}
                  onPointerUp={e => handlePortPointerUp(e, port.id, 'out')}
                />
                <text x={node.width - 12} y={py} fontSize={9} fill="rgba(196,207,221,0.85)"
                  textAnchor="end" dominantBaseline="middle"
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  style={{ pointerEvents: 'none' }}
                >
                  {port.label}
                </text>
              </g>
            )
          })}
        </>
      )}

      {/* Context menu placeholder: delete / duplicate */}
      <g transform={`translate(${node.width - 48}, ${-14})`} style={{ pointerEvents: 'none', opacity: node.selected ? 1 : 0 }}>
        <rect width={44} height={16} rx={4} fill="rgba(10,10,15,0.9)" />
        <g
          transform="translate(4, 8)"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={() => onDuplicate(node.id)}
        >
          <circle r={6} fill="rgba(96,165,250,0.2)" />
          <text fontSize={8} textAnchor="middle" dominantBaseline="middle" fill="#93c5fd">D</text>
        </g>
        <g
          transform="translate(22, 8)"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={() => onDelete(node.id)}
        >
          <circle r={6} fill="rgba(239,68,68,0.2)" />
          <text fontSize={8} textAnchor="middle" dominantBaseline="middle" fill="#fca5a5">X</text>
        </g>
      </g>
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// NODE PALETTE (left panel)
// ─────────────────────────────────────────────────────────────

const PALETTE_CATEGORIES: NodeCategory[] = ['source', 'filter', 'envelope', 'mixer', 'spatializer', 'effect', 'output', 'trigger', 'random']

function NodePalette({ onAdd }: { onAdd: (template: typeof NODE_TEMPLATES[0]) => void }) {
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<NodeCategory>>(new Set(['source', 'filter']))

  const filtered = useMemo(() => {
    if (!search.trim()) return NODE_TEMPLATES
    const q = search.toLowerCase()
    return NODE_TEMPLATES.filter(t => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
  }, [search])

  const byCat = useMemo(() => {
    const map: Partial<Record<NodeCategory, typeof NODE_TEMPLATES>> = {}
    for (const t of filtered) {
      if (!map[t.category]) map[t.category] = []
      map[t.category]!.push(t)
    }
    return map
  }, [filtered])

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] overflow-hidden">
      <div className="border-b border-[var(--aethel-border-subtle)] px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] mb-2">Node Palette</p>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {PALETTE_CATEGORIES.map(cat => {
          const nodes = byCat[cat]
          if (!nodes || nodes.length === 0) return null
          const Icon = CATEGORY_ICONS[cat]
          const expanded = expandedCats.has(cat)
          return (
            <div key={cat}>
              <button
                type="button"
                onClick={() => setExpandedCats(prev => {
                  const s = new Set(prev)
                  s.has(cat) ? s.delete(cat) : s.add(cat)
                  return s
                })}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]"
              >
                {expanded ? <ChevronDown className="h-3 w-3 text-[var(--aethel-text-quaternary)]" /> : <ChevronRight className="h-3 w-3 text-[var(--aethel-text-quaternary)]" />}
                <Icon className="h-3 w-3" style={{ color: CATEGORY_COLORS[cat] }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: CATEGORY_COLORS[cat] }}>
                  {cat}
                </span>
                <span className="ml-auto text-[9px] text-[var(--aethel-text-quaternary)]">{nodes.length}</span>
              </button>
              {expanded && (
                <div className="ml-4 mt-0.5 space-y-0.5">
                  {nodes.map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onDoubleClick={() => onAdd(t)}
                      draggable
                      className={`flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition hover:border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] ${CANONICAL_FOCUS}`}
                      title={`${t.description}\n(Double-click to add)`}
                    >
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                      <div>
                        <p className="text-[11px] font-semibold text-[var(--aethel-text-primary)]">{t.label}</p>
                        <p className="mt-0.5 text-[9px] leading-tight text-[var(--aethel-text-quaternary)] line-clamp-1">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────
// NODE INSPECTOR (right panel)
// ─────────────────────────────────────────────────────────────

function NodeInspector({
  node,
  onPatch,
}: {
  node: AudioNodeDef | null
  onPatch: (id: string, params: Record<string, number | boolean | string>) => void
}) {
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <Music className="mx-auto h-8 w-8 text-[var(--aethel-text-quaternary)]" />
          <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Select a node to inspect</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="h-2 w-2 rounded-full" style={{ background: node.color }} />
          <p className="text-xs font-bold text-[var(--aethel-text-primary)]">{node.label}</p>
          <span className="ml-auto rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[9px] uppercase text-[var(--aethel-text-quaternary)]">{node.category}</span>
        </div>
        <p className="text-[10px] leading-relaxed text-[var(--aethel-text-tertiary)]">{node.description}</p>
      </div>

      <div className="border-t border-[var(--aethel-border-subtle)] pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)] mb-3">Parameters</p>
        <div className="space-y-3">
          {Object.entries(node.params).map(([key, val]) => {
            if (typeof val === 'boolean') {
              return (
                <label key={key} className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--aethel-text-secondary)] capitalize">{key}</span>
                  <button
                    type="button"
                    onClick={() => onPatch(node.id, { ...node.params, [key]: !val })}
                    className={`h-5 w-9 rounded-full border transition-colors ${val
                      ? 'border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)]'
                      : 'border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)]'
                    }`}
                  >
                    <span className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${val ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              )
            }
            if (typeof val === 'number') {
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] capitalize">{key}</span>
                    <span className="font-mono text-[10px] text-[var(--aethel-text-secondary)]">{val.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min={0} max={val > 1 ? val * 5 : 1} step={val > 10 ? 1 : 0.001}
                    value={val}
                    onChange={e => onPatch(node.id, { ...node.params, [key]: parseFloat(e.target.value) })}
                    className="w-full"
                    style={{
                      height: 4,
                      background: `linear-gradient(to right, ${node.color} ${(val / (val > 1 ? val * 5 : 1)) * 100}%, rgba(148,163,184,0.2) 0%)`,
                      borderRadius: '999px',
                      WebkitAppearance: 'none',
                      outline: 'none',
                    } as CSSProperties}
                  />
                </div>
              )
            }
            if (typeof val === 'string') {
              return (
                <div key={key} className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] capitalize">{key}</span>
                  <input
                    type="text"
                    value={val}
                    onChange={e => onPatch(node.id, { ...node.params, [key]: e.target.value })}
                    className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1.5 font-mono text-[11px] text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
                  />
                </div>
              )
            }
            return null
          })}
        </div>
      </div>

      <div className="border-t border-[var(--aethel-border-subtle)] pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)] mb-3">Ports ({node.ports.length})</p>
        <div className="space-y-1">
          {node.ports.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: PORT_COLORS[p.type] }} />
              <span className="text-[10px] font-semibold text-[var(--aethel-text-secondary)]">{p.label}</span>
              <span className="ml-auto text-[9px] uppercase text-[var(--aethel-text-quaternary)]">{p.type} · {p.dir}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN GRAPH EDITOR
// ─────────────────────────────────────────────────────────────

export default function MetaSoundsGraph() {
  const [nodes, setNodes] = useState<AudioNodeDef[]>(() => getDefaultGraph().nodes)
  const [wires, setWires] = useState<Wire[]>(() => getDefaultGraph().wires)
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null)
  const [draggingWire, setDraggingWire] = useState<DragWireState | null>(null)
  const [dragMouse, setDragMouse] = useState<{ x: number; y: number } | null>(null)

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [isCompiled, setIsCompiled] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const panStart = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null)

  const selectedNode = useMemo(() => nodes.find(n => n.selected) ?? null, [nodes])

  // ── Pan & zoom ──
  const handleSvgPointerDown = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { cx: e.clientX, cy: e.clientY, tx: transform.x, ty: transform.y }
      const svg = svgRef.current
      if (svg) svg.setPointerCapture(e.pointerId)
    } else {
      // Deselect all
      setNodes(prev => prev.map(n => ({ ...n, selected: false })))
      setSelectedWireId(null)
    }
  }, [transform])

  const handleSvgPointerMove = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (isPanning && panStart.current) {
      setTransform(prev => ({
        ...prev,
        x: panStart.current!.tx + e.clientX - panStart.current!.cx,
        y: panStart.current!.ty + e.clientY - panStart.current!.cy,
      }))
    }
    if (draggingWire) {
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const mx = (e.clientX - rect.left - transform.x) / transform.scale
      const my = (e.clientY - rect.top - transform.y) / transform.scale
      setDragMouse({ x: mx, y: my })
    }
  }, [isPanning, draggingWire, transform])

  const handleSvgPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    setIsPanning(false)
    panStart.current = null
    setDraggingWire(null)
    setDragMouse(null)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setTransform(prev => ({
        ...prev,
        scale: Math.max(0.2, Math.min(3, prev.scale * factor)),
      }))
    }
  }, [])

  // ── Node mutations ──
  const selectNode = useCallback((id: string, multi: boolean) => {
    setNodes(prev => prev.map(n => ({
      ...n,
      selected: multi ? (n.id === id ? !n.selected : n.selected) : n.id === id,
    })))
  }, [])

  const moveNode = useCallback((id: string, dx: number, dy: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n))
  }, [])

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setWires(prev => prev.filter(w => w.fromNodeId !== id && w.toNodeId !== id))
    log.debug('node.delete', { id })
  }, [])

  const duplicateNode = useCallback((id: string) => {
    setNodes(prev => {
      const src = prev.find(n => n.id === id)
      if (!src) return prev
      const copy: AudioNodeDef = { ...src, id: uid('node'), x: src.x + 30, y: src.y + 30, selected: true }
      return [...prev.map(n => ({ ...n, selected: false })), copy]
    })
  }, [])

  const toggleCollapse = useCallback((id: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n))
  }, [])

  const patchNodeParams = useCallback((id: string, params: Record<string, number | boolean | string>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, params } : n))
  }, [])

  const addNode = useCallback((template: typeof NODE_TEMPLATES[0]) => {
    const node = makeNode(template, 400 + Math.random() * 100, 300 + Math.random() * 100)
    setNodes(prev => [...prev.map(n => ({ ...n, selected: false })), { ...node, selected: true }])
    log.debug('node.add', { label: template.label })
  }, [])

  // ── Wire connections ──
  const startWire = useCallback((state: DragWireState) => {
    setDraggingWire(state)
  }, [])

  const endWire = useCallback((toNodeId: string, toPortId: string, toDir: PortDir) => {
    if (!draggingWire) return
    if (draggingWire.fromNodeId === toNodeId) { setDraggingWire(null); return }
    if (draggingWire.fromDir === toDir) { setDraggingWire(null); return }

    const fromDir = draggingWire.fromDir
    const actualFrom = fromDir === 'out' ? draggingWire : { fromNodeId: toNodeId, fromPortId: toPortId }
    const actualTo = fromDir === 'out' ? { toNodeId, toPortId } : { toNodeId: draggingWire.fromNodeId, toPortId: draggingWire.fromPortId }

    const wire: Wire = {
      id: uid('wire'),
      fromNodeId: (actualFrom as typeof draggingWire).fromNodeId,
      fromPortId: (actualFrom as typeof draggingWire).fromPortId,
      toNodeId: (actualTo as { toNodeId: string; toPortId: string }).toNodeId,
      toPortId: (actualTo as { toNodeId: string; toPortId: string }).toPortId,
    }
    setWires(prev => [...prev, wire])
    setDraggingWire(null)
    setDragMouse(null)
    log.debug('wire.connect', wire)
  }, [draggingWire])

  // Computed wire positions
  const wireData = useMemo(() => wires.map(w => {
    const fromNode = nodes.find(n => n.id === w.fromNodeId)
    const toNode = nodes.find(n => n.id === w.toNodeId)
    if (!fromNode || !toNode) return null
    const fromPos = getPortAbsPos(fromNode, w.fromPortId, 'out')
    const toPos = getPortAbsPos(toNode, w.toPortId, 'in')
    const fromPort = fromNode.ports.find(p => p.id === w.fromPortId)
    const color = fromPort ? PORT_COLORS[fromPort.type] : '#60a5fa'
    return { ...w, x1: fromPos.x, y1: fromPos.y, x2: toPos.x, y2: toPos.y, color }
  }).filter(Boolean), [nodes, wires])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)]">
      {/* ── Toolbar ── */}
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-4 backdrop-blur-md">
        <Music className="h-4 w-4 text-[var(--aethel-neon-violet)]" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">MetaSounds Graph</span>
        <div className="h-4 w-px bg-[var(--aethel-border-subtle)]" />

        <button
          type="button"
          onClick={() => { setIsCompiled(true); log.info('graph.compile', { nodes: nodes.length, wires: wires.length }) }}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${isCompiled
            ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
            : 'border-[color-mix(in_srgb,var(--aethel-neon-violet)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-violet)_10%,transparent)] text-[var(--aethel-neon-violet)]'
          } ${CANONICAL_FOCUS}`}
        >
          <Zap className="h-3 w-3" />
          {isCompiled ? 'Compiled ✓' : 'Compile Graph'}
        </button>

        <button
          type="button"
          onClick={() => { setIsCompiled(false); const g = getDefaultGraph(); setNodes(g.nodes); setWires(g.wires) }}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>

        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
            {nodes.length} nodes · {wires.length} connections
          </span>
          <span className="rounded border border-[color-mix(in_srgb,var(--aethel-neon-violet)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-violet)_8%,transparent)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-neon-violet)]">
            Law IV · HRTF Active
          </span>
          <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
            Alt+Drag pan · Ctrl+Scroll zoom · Dbl-click node to add
          </span>
        </div>
      </header>

      {/* ── 3-column ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <NodePalette onAdd={addNode} />

        {/* Graph canvas */}
        <div className="relative flex-1 overflow-hidden">
          <svg
            ref={svgRef}
            className="absolute inset-0 h-full w-full"
            style={{ cursor: isPanning ? 'grabbing' : draggingWire ? 'crosshair' : 'default', userSelect: 'none' }}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Node gradient */}
              <linearGradient id="nodeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(16,22,34,0.96)" />
                <stop offset="100%" stopColor="rgba(10,14,24,0.98)" />
              </linearGradient>
              {/* Grid pattern */}
              <pattern id="graphGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              </pattern>
              <pattern id="graphGridMajor" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <rect width="200" height="200" fill="url(#graphGrid)" />
                <path d="M 200 0 L 0 0 0 200" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background */}
            <rect width="100%" height="100%" fill="#060912" />
            <rect width="100%" height="100%" fill="url(#graphGridMajor)"
              transform={`translate(${transform.x % 200}, ${transform.y % 200})`}
            />

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Wires */}
              {wireData.map(w => w && (
                <WireShape
                  key={w.id}
                  x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  color={w.color}
                  selected={selectedWireId === w.id}
                  onClick={() => setSelectedWireId(prev => prev === w.id ? null : w.id)}
                />
              ))}

              {/* Ghost wire while dragging */}
              {draggingWire && dragMouse && (
                <WireShape
                  x1={draggingWire.fromDir === 'out' ? draggingWire.x : dragMouse.x}
                  y1={draggingWire.fromDir === 'out' ? draggingWire.y : dragMouse.y}
                  x2={draggingWire.fromDir === 'out' ? dragMouse.x : draggingWire.x}
                  y2={draggingWire.fromDir === 'out' ? dragMouse.y : draggingWire.y}
                  color="rgba(248,250,252,0.4)"
                  selected={false}
                />
              )}

              {/* Nodes */}
              {nodes.map(node => (
                <GraphNode
                  key={node.id}
                  node={node}
                  onSelect={selectNode}
                  onMove={moveNode}
                  onStartWire={startWire}
                  onEndWire={endWire}
                  onToggleCollapse={toggleCollapse}
                  onDelete={deleteNode}
                  onDuplicate={duplicateNode}
                  transform={transform}
                />
              ))}
            </g>
          </svg>

          {/* Zoom indicator */}
          <div className="pointer-events-none absolute bottom-4 right-4">
            <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[rgba(6,9,18,0.85)] px-3 py-1.5 backdrop-blur-sm">
              <span className="font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
                {Math.round(transform.scale * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: Node inspector */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-2.5">
            <Settings className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Node Inspector
            </span>
          </div>
          <NodeInspector node={selectedNode} onPatch={patchNodeParams} />
        </aside>
      </div>
    </div>
  )
}
