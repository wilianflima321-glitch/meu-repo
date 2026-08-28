'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import {
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Move,
  Maximize2,
  Grid,
  Check,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Zap,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────

export type TangentMode = 'linear' | 'bezier' | 'step' | 'constant'

export interface CurveKeyframe {
  id: string
  timeSec: number // Time in seconds
  value: number
  inTangent?: { dx: number; dy: number }
  outTangent?: { dx: number; dy: number }
  tangentMode: TangentMode
  selected?: boolean
}

export interface AnimationChannel {
  id: string
  name: string
  category: 'Transform' | 'Camera' | 'Lighting' | 'Material'
  color: string
  visible: boolean
  locked: boolean
  minVal: number
  maxVal: number
  keyframes: CurveKeyframe[]
}

const INITIAL_CHANNELS: AnimationChannel[] = [
  {
    id: 'ch-pos-x',
    name: 'Translation X (Meters)',
    category: 'Transform',
    color: '#ef4444', // Red
    visible: true,
    locked: false,
    minVal: -10,
    maxVal: 50,
    keyframes: [
      { id: 'k1', timeSec: 0.0, value: 0.0, tangentMode: 'bezier', inTangent: { dx: -0.2, dy: 0 }, outTangent: { dx: 0.3, dy: 2 } },
      { id: 'k2', timeSec: 1.5, value: 18.5, tangentMode: 'bezier', inTangent: { dx: -0.3, dy: 0 }, outTangent: { dx: 0.4, dy: 0 } },
      { id: 'k3', timeSec: 3.0, value: 32.0, tangentMode: 'bezier', inTangent: { dx: -0.2, dy: -1 }, outTangent: { dx: 0.2, dy: 0 } },
      { id: 'k4', timeSec: 5.0, value: 45.0, tangentMode: 'bezier', inTangent: { dx: -0.3, dy: 0 }, outTangent: { dx: 0.2, dy: 0 } },
    ],
  },
  {
    id: 'ch-pos-y',
    name: 'Translation Y / Height',
    category: 'Transform',
    color: '#22c55e', // Green
    visible: true,
    locked: false,
    minVal: 0,
    maxVal: 20,
    keyframes: [
      { id: 'k5', timeSec: 0.0, value: 1.0, tangentMode: 'bezier' },
      { id: 'k6', timeSec: 1.0, value: 8.5, tangentMode: 'bezier' },
      { id: 'k7', timeSec: 2.2, value: 14.0, tangentMode: 'bezier' },
      { id: 'k8', timeSec: 3.8, value: 2.0, tangentMode: 'bezier' },
      { id: 'k9', timeSec: 5.0, value: 1.0, tangentMode: 'bezier' },
    ],
  },
  {
    id: 'ch-pos-z',
    name: 'Translation Z (Forward)',
    category: 'Transform',
    color: '#3b82f6', // Blue
    visible: true,
    locked: false,
    minVal: -50,
    maxVal: 100,
    keyframes: [
      { id: 'k10', timeSec: 0.0, value: 0.0, tangentMode: 'bezier' },
      { id: 'k11', timeSec: 2.5, value: 65.0, tangentMode: 'bezier' },
      { id: 'k12', timeSec: 5.0, value: 90.0, tangentMode: 'bezier' },
    ],
  },
  {
    id: 'ch-cam-fov',
    name: 'Camera FOV (Degrees)',
    category: 'Camera',
    color: '#f59e0b', // Amber
    visible: true,
    locked: false,
    minVal: 20,
    maxVal: 90,
    keyframes: [
      { id: 'k13', timeSec: 0.0, value: 35.0, tangentMode: 'bezier' },
      { id: 'k14', timeSec: 2.0, value: 75.0, tangentMode: 'bezier' },
      { id: 'k15', timeSec: 4.0, value: 40.0, tangentMode: 'bezier' },
      { id: 'k16', timeSec: 5.0, value: 35.0, tangentMode: 'bezier' },
    ],
  },
]

export default function CurveEditorStudio() {
  const [channels, setChannels] = useState<AnimationChannel[]>(INITIAL_CHANNELS)
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ch-pos-x')
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(1.2)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [zoomX, setZoomX] = useState<number>(140) // pixels per second
  const [zoomY, setZoomY] = useState<number>(4) // pixels per unit
  const [pan, setPan] = useState({ x: 60, y: 220 })

  const maxDurationSec = 5.0

  const toggleChannelVisibility = (channelId: string) => {
    setChannels(channels.map((c) => (c.id === channelId ? { ...c, visible: !c.visible } : c)))
  }

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) || channels[0],
    [channels, selectedChannelId],
  )

  return (
    <div className="flex h-full w-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] select-none">
      {/* ── Top Main Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
              Cinematic Animation Curve Editor (F-Curve / Graph Editor)
            </h1>
            <p className="text-[11px] text-[var(--aethel-text-tertiary)]">
              Multi-Channel Bézier Tangents, Hermite Spline Interpolation & Dope Sheet Controls
            </p>
          </div>
        </div>

        {/* Playback & Key Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] px-2.5 py-1 text-xs font-mono text-[var(--aethel-text-primary)]">
            <span className="text-[var(--aethel-text-tertiary)]">Time:</span>
            <span className="font-bold text-amber-300">{currentTimeSec.toFixed(2)}s</span>
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all ${
              isPlaying
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </header>

      {/* ── Main Studio Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Channel List Tree */}
        <aside className="w-64 flex flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)]">
              Animation Curves ({channels.length})
            </span>
          </div>

          <div className="space-y-1 overflow-y-auto">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
                    : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: channel.color }} />
                  <span className="font-medium truncate">{channel.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleChannelVisibility(channel.id)
                    }}
                    className="text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    {channel.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-40" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Center: Interactive Bézier Spline Graph Canvas */}
        <main className="relative flex-1 overflow-hidden bg-slate-950">
          {/* Time & Value Grid Lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: `${zoomX}px 40px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />

          {/* SVG F-Curve Splines Layer */}
          <svg className="absolute inset-0 h-full w-full">
            {channels
              .filter((c) => c.visible)
              .map((channel) => {
                const kfs = [...channel.keyframes].sort((a, b) => a.timeSec - b.timeSec)
                if (kfs.length < 2) return null

                let pathD = ''
                for (let i = 0; i < kfs.length; i++) {
                  const x = pan.x + kfs[i].timeSec * zoomX
                  const y = pan.y - kfs[i].value * zoomY

                  if (i === 0) {
                    pathD += `M ${x} ${y}`
                  } else {
                    const prevX = pan.x + kfs[i - 1].timeSec * zoomX
                    const prevY = pan.y - kfs[i - 1].value * zoomY
                    const cp1x = prevX + (x - prevX) * 0.45
                    const cp1y = prevY
                    const cp2x = x - (x - prevX) * 0.45
                    const cp2y = y
                    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`
                  }
                }

                return (
                  <g key={channel.id}>
                    {/* Shadow / Glow line */}
                    <path d={pathD} fill="none" stroke={channel.color} strokeWidth={4} opacity={0.25} />
                    {/* Main Spline line */}
                    <path d={pathD} fill="none" stroke={channel.color} strokeWidth={2} />

                    {/* Keyframe Diamond Points */}
                    {kfs.map((kf) => {
                      const kx = pan.x + kf.timeSec * zoomX
                      const ky = pan.y - kf.value * zoomY

                      return (
                        <g key={kf.id}>
                          <rect
                            x={kx - 4}
                            y={ky - 4}
                            width={8}
                            height={8}
                            transform={`rotate(45 ${kx} ${ky})`}
                            fill={channel.color}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            className="cursor-pointer transition-transform hover:scale-150"
                          />
                        </g>
                      )
                    })}
                  </g>
                )
              })}

            {/* Playhead Scrubbing Vertical Line */}
            <line
              x1={pan.x + currentTimeSec * zoomX}
              y1={0}
              x2={pan.x + currentTimeSec * zoomX}
              y2="100%"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </svg>
        </main>

        {/* Right: Keyframe Inspector */}
        <aside className="w-72 flex flex-col border-l border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-4 overflow-y-auto space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-text-secondary)] flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" /> Channel Properties
          </h2>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] p-3">
              <span className="text-[10px] text-[var(--aethel-text-tertiary)] uppercase font-semibold block">Channel Name</span>
              <span className="font-semibold text-sm text-[var(--aethel-text-primary)]">{selectedChannel.name}</span>
              <span className="text-[11px] text-[var(--aethel-text-secondary)] block mt-0.5">
                Keyframes: {selectedChannel.keyframes.length} Points
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[var(--aethel-text-secondary)] block mb-1.5">
                Keyframe Tangent Modes
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['bezier', 'linear', 'step', 'constant'] as const).map((mode) => (
                  <button
                    key={mode}
                    className="rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-tertiary)] py-1.5 text-center font-mono text-xs capitalize text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-quaternary)] hover:text-[var(--aethel-text-primary)]"
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
