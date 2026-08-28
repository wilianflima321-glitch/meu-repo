'use client'

/**
 * CinematicSequencer — Professional non-linear timeline editor
 * Parity target: Unreal Engine Sequencer + DaVinci Resolve timeline
 * Architecture:
 *   - Track list (left, resizable) → Keyframe timeline (right, infinite scroll)
 *   - Playhead scrubbing with sub-frame precision
 *   - Multi-track: Camera, Actor, Transform, Anim, Audio, FX, Event
 *   - Keyframe: drag-create, drag-move, right-click delete
 *   - Transport: Play/Pause/Stop, frame step, loop toggle, time display
 *   - Law V: GPU-driven render output path (wgpu capture bridge)
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Camera,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  Film,
  Grid,
  Headphones,
  Layers,
  Lock,
  Music,
  Play,
  Plus,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  Trash2,
  Triangle,
  Unlock,
  Video,
  Volume2,
  Wind,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react'
import { CANONICAL_FOCUS } from '@/lib/canonical-spacing'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('CinematicSequencer')

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type TrackType = 'camera' | 'actor' | 'transform' | 'animation' | 'audio' | 'vfx' | 'event' | 'light'

interface Keyframe {
  id: string
  time: number        // seconds
  value: number | string | boolean
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step'
  label?: string
}

interface Clip {
  id: string
  startTime: number   // seconds
  duration: number    // seconds
  label: string
  color: string       // CSS color
}

interface Track {
  id: string
  type: TrackType
  name: string
  visible: boolean
  locked: boolean
  muted: boolean
  solo: boolean
  expanded: boolean
  color: string
  keyframes: Keyframe[]
  clips: Clip[]
  children: Track[]   // sub-tracks (e.g. Actor → Position X/Y/Z)
  height: number      // px
}

interface SequencerState {
  duration: number    // seconds
  fps: number
  currentTime: number
  isPlaying: boolean
  isLooping: boolean
  loopStart: number
  loopEnd: number
  zoom: number        // px per second
  scrollLeft: number  // scroll offset in seconds
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TRACK_ICONS: Record<TrackType, React.ComponentType<{ className?: string; style?: CSSProperties }>> = {
  camera: Camera,
  actor: Circle,
  transform: Grid,
  animation: Triangle,
  audio: Music,
  vfx: Wind,
  event: Zap,
  light: Circle,
}

const TRACK_COLORS: Record<TrackType, string> = {
  camera: '#60a5fa',
  actor: '#c4b5fd',
  transform: '#34d399',
  animation: '#fbbf24',
  audio: '#f472b6',
  vfx: '#22d3ee',
  event: '#f97316',
  light: '#fde68a',
}

const EASING_ICONS: Record<Keyframe['easing'], string> = {
  'linear': '╱',
  'ease-in': '╮',
  'ease-out': '╭',
  'ease-in-out': '∫',
  'step': '⌐',
}

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function formatTime(seconds: number, fps: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const f = Math.floor((seconds % 1) * fps)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function snap(time: number, fps: number): number {
  return Math.round(time * fps) / fps
}

function makeDefaultTracks(): Track[] {
  const makeTrack = (type: TrackType, name: string, clips: Clip[] = [], keyframes: Keyframe[] = [], children: Track[] = []): Track => ({
    id: uid('track'),
    type,
    name,
    visible: true,
    locked: false,
    muted: false,
    solo: false,
    expanded: children.length > 0,
    color: TRACK_COLORS[type],
    keyframes,
    clips,
    children,
    height: 40,
  })

  return [
    makeTrack('camera', 'Main Camera',
      [{ id: uid('clip'), startTime: 0, duration: 10, label: 'Shot A', color: 'rgba(96,165,250,0.25)' }],
      [
        { id: uid('kf'), time: 0, value: 0, easing: 'ease-in-out', label: 'Start' },
        { id: uid('kf'), time: 3.5, value: 1, easing: 'ease-in-out', label: 'Dolly In' },
        { id: uid('kf'), time: 8.0, value: 2, easing: 'ease-in-out', label: 'Wide' },
      ]
    ),
    makeTrack('actor', 'Hero Character',
      [{ id: uid('clip'), startTime: 1.5, duration: 7, label: 'Idle → Run', color: 'rgba(196,181,253,0.22)' }],
      [],
      [
        makeTrack('transform', 'Position',
          [],
          [
            { id: uid('kf'), time: 1.5, value: 0, easing: 'linear' },
            { id: uid('kf'), time: 4.0, value: 320, easing: 'ease-out' },
            { id: uid('kf'), time: 8.5, value: 640, easing: 'ease-in-out' },
          ]
        ),
        makeTrack('animation', 'Anim Layer',
          [
            { id: uid('clip'), startTime: 1.5, duration: 2, label: 'Idle', color: 'rgba(251,191,36,0.22)' },
            { id: uid('clip'), startTime: 3.5, duration: 5, label: 'Run', color: 'rgba(251,191,36,0.35)' },
          ],
          []
        ),
      ]
    ),
    makeTrack('audio', 'Score — Main Theme',
      [{ id: uid('clip'), startTime: 0, duration: 10, label: 'SFX_Score_A.wav', color: 'rgba(244,114,182,0.25)' }],
      [
        { id: uid('kf'), time: 0, value: 1.0, easing: 'linear', label: 'Volume' },
        { id: uid('kf'), time: 7.0, value: 0.3, easing: 'ease-in', label: 'Fade' },
        { id: uid('kf'), time: 10, value: 0, easing: 'ease-in' },
      ]
    ),
    makeTrack('vfx', 'Portal FX',
      [{ id: uid('clip'), startTime: 4.5, duration: 3.5, label: 'NiagaraSystem_Portal', color: 'rgba(34,211,238,0.22)' }],
      [
        { id: uid('kf'), time: 4.5, value: 'spawn', easing: 'step', label: 'Spawn' },
        { id: uid('kf'), time: 8.0, value: 'kill', easing: 'step', label: 'Kill' },
      ]
    ),
    makeTrack('light', 'Rim Light',
      [],
      [
        { id: uid('kf'), time: 0, value: 0.0, easing: 'ease-out' },
        { id: uid('kf'), time: 2.5, value: 3.2, easing: 'ease-in-out', label: 'Peak' },
        { id: uid('kf'), time: 9.0, value: 0.8, easing: 'ease-in' },
      ]
    ),
    makeTrack('event', 'Script Events',
      [],
      [
        { id: uid('kf'), time: 1.5, value: 'OnActorEnter', easing: 'step', label: 'OnActorEnter' },
        { id: uid('kf'), time: 4.5, value: 'OnPortalOpen', easing: 'step', label: 'OnPortalOpen' },
        { id: uid('kf'), time: 9.5, value: 'OnSceneEnd', easing: 'step', label: 'OnSceneEnd' },
      ]
    ),
  ]
}

// ─────────────────────────────────────────────────────────────
// RULER / TIME GRID (canvas-drawn)
// ─────────────────────────────────────────────────────────────

function TimeRuler({
  zoom,
  scrollLeft,
  duration,
  fps,
  currentTime,
  onScrub,
  width,
}: {
  zoom: number
  scrollLeft: number
  duration: number
  fps: number
  currentTime: number
  onScrub: (t: number) => void
  width: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const H = 32

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, H)
    ctx.fillStyle = 'rgba(13,18,31,0.98)'
    ctx.fillRect(0, 0, width, H)

    const startSec = scrollLeft
    const endSec = startSec + width / zoom

    // Adaptive tick interval
    let tickSec = 1
    if (zoom > 200) tickSec = 1 / fps
    else if (zoom > 80) tickSec = 0.5
    else if (zoom > 30) tickSec = 1
    else if (zoom > 10) tickSec = 5
    else tickSec = 10

    const majorEvery = tickSec >= 1 ? tickSec * 5 : tickSec * fps

    ctx.font = `500 10px "Geist Mono", ui-monospace, monospace`
    ctx.textBaseline = 'top'

    let t = Math.floor(startSec / tickSec) * tickSec
    while (t <= endSec) {
      const x = (t - scrollLeft) * zoom
      const isMajor = Math.abs(t % (tickSec * (tickSec >= 1 ? 5 : fps))) < 0.001
      ctx.beginPath()
      ctx.moveTo(x, isMajor ? 4 : H - 6)
      ctx.lineTo(x, H)
      ctx.strokeStyle = isMajor ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.15)'
      ctx.lineWidth = isMajor ? 1 : 0.5
      ctx.stroke()
      if (isMajor) {
        ctx.fillStyle = 'rgba(148,163,184,0.7)'
        ctx.fillText(formatTime(t, fps), x + 3, 5)
      }
      t += tickSec
    }

    // Loop region
    const loopGrad = ctx.createLinearGradient(0, 0, 0, H)
    loopGrad.addColorStop(0, 'rgba(56,189,248,0.08)')
    loopGrad.addColorStop(1, 'rgba(56,189,248,0.02)')

    // Playhead
    const phX = (currentTime - scrollLeft) * zoom
    if (phX >= 0 && phX <= width) {
      ctx.beginPath()
      ctx.moveTo(phX, 0)
      ctx.lineTo(phX, H)
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.stroke()
      // Triangle head
      ctx.beginPath()
      ctx.moveTo(phX - 5, 0)
      ctx.lineTo(phX + 5, 0)
      ctx.lineTo(phX, 8)
      ctx.closePath()
      ctx.fillStyle = '#f59e0b'
      ctx.fill()
    }
  }, [zoom, scrollLeft, duration, fps, currentTime, width])

  const handlePointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = snap(Math.max(0, Math.min(duration, x / zoom + scrollLeft)), fps)
    onScrub(t)
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: H, display: 'block', cursor: 'col-resize' }}
      onPointerDown={handlePointer}
      onPointerMove={e => { if (e.buttons === 1) handlePointer(e) }}
      aria-label="Timeline ruler"
    />
  )
}

// ─────────────────────────────────────────────────────────────
// KEYFRAME DOT
// ─────────────────────────────────────────────────────────────

function KeyframeDot({
  kf,
  trackHeight,
  zoom,
  scrollLeft,
  selected,
  onSelect,
  onDragEnd,
  trackColor,
}: {
  kf: Keyframe
  trackHeight: number
  zoom: number
  scrollLeft: number
  selected: boolean
  onSelect: () => void
  onDragEnd: (newTime: number) => void
  trackColor: string
}) {
  const x = (kf.time - scrollLeft) * zoom
  const y = trackHeight / 2

  const handlePointer = useCallback((e: ReactPointerEvent<SVGGElement>) => {
    e.stopPropagation()
    onSelect()
    const startX = e.clientX
    const startTime = kf.time
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dt = dx / zoom
      onDragEnd(Math.max(0, startTime + dt))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [kf.time, zoom, onSelect, onDragEnd])

  if (x < -12 || x > 99999) return null

  const isEvent = typeof kf.value === 'string'

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onPointerDown={handlePointer}
      style={{ cursor: 'grab' }}
    >
      {/* Glow halo when selected */}
      {selected && (
        <circle r={10} fill={`rgba(251,191,36,0.15)`} />
      )}
      {isEvent ? (
        // Diamond shape for event keyframes
        <polygon
          points="0,-7 7,0 0,7 -7,0"
          fill={selected ? '#f59e0b' : trackColor}
          stroke={selected ? '#fff' : 'rgba(0,0,0,0.4)'}
          strokeWidth="1"
        />
      ) : (
        // Round keyframe
        <circle
          r={5}
          fill={selected ? '#f59e0b' : trackColor}
          stroke={selected ? '#fff' : 'rgba(0,0,0,0.5)'}
          strokeWidth="1"
        />
      )}
      {/* Easing indicator */}
      {kf.easing !== 'linear' && !selected && (
        <circle r={2} fill={trackColor} opacity={0.6} cx={0} cy={-8} />
      )}
      {/* Label */}
      {kf.label && (
        <text
          y={-10} fontSize={8}
          fill="rgba(248,250,252,0.65)"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {kf.label}
        </text>
      )}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// CLIP BLOCK
// ─────────────────────────────────────────────────────────────

function ClipBlock({
  clip,
  trackHeight,
  zoom,
  scrollLeft,
  selected,
  onSelect,
  onMove,
  onTrimStart,
  onTrimEnd,
}: {
  clip: Clip
  trackHeight: number
  zoom: number
  scrollLeft: number
  selected: boolean
  onSelect: () => void
  onMove: (newStart: number) => void
  onTrimStart: (newStart: number) => void
  onTrimEnd: (newDuration: number) => void
}) {
  const x = (clip.startTime - scrollLeft) * zoom
  const w = clip.duration * zoom
  const trimW = 6

  const handleBodyDrag = useCallback((e: ReactPointerEvent<SVGRectElement>) => {
    e.stopPropagation()
    onSelect()
    const startX = e.clientX
    const startTime = clip.startTime
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => { onMove(Math.max(0, startTime + (ev.clientX - startX) / zoom)) }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }, [clip.startTime, zoom, onMove, onSelect])

  const handleTrimEndDrag = useCallback((e: ReactPointerEvent<SVGRectElement>) => {
    e.stopPropagation()
    const startX = e.clientX
    const startDuration = clip.duration
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => { onTrimEnd(Math.max(0.1, startDuration + (ev.clientX - startX) / zoom)) }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }, [clip.duration, zoom, onTrimEnd])

  if (x + w < 0 || x > 99999) return null

  const py = 4
  const clipH = trackHeight - py * 2

  return (
    <g>
      {/* Background */}
      <rect x={x} y={py} width={Math.max(4, w)} height={clipH}
        rx={4} ry={4}
        fill={selected ? clip.color.replace('0.', '0.5') : clip.color}
        stroke={selected ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
        strokeWidth={selected ? 1.5 : 1}
        onPointerDown={handleBodyDrag}
        style={{ cursor: 'grab' }}
      />
      {/* Label */}
      {w > 30 && (
        <text
          x={x + 6} y={py + clipH / 2 + 1}
          fontSize={9} fill="rgba(255,255,255,0.85)"
          dominantBaseline="middle"
          fontFamily="ui-monospace, monospace"
          fontWeight="600"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          clipPath="none"
        >
          {clip.label}
        </text>
      )}
      {/* Trim handle (right) */}
      {w > 20 && (
        <rect x={x + w - trimW} y={py + 2} width={trimW} height={clipH - 4}
          rx={2} fill="rgba(255,255,255,0.25)"
          style={{ cursor: 'ew-resize' }}
          onPointerDown={handleTrimEndDrag}
        />
      )}
    </g>
  )
}

// ─────────────────────────────────────────────────────────────
// TRACK ROW
// ─────────────────────────────────────────────────────────────

function TrackRow({
  track,
  depth,
  zoom,
  scrollLeft,
  selectedKfId,
  selectedClipId,
  onSelectKf,
  onSelectClip,
  onMoveKf,
  onMoveClip,
  onTrimClipEnd,
  onToggleExpand,
  onToggleVisible,
  onToggleLock,
  onAddKeyframe,
  onDelete,
  onDuplicate,
  viewWidth,
}: {
  track: Track
  depth: number
  zoom: number
  scrollLeft: number
  selectedKfId: string | null
  selectedClipId: string | null
  onSelectKf: (id: string) => void
  onSelectClip: (id: string) => void
  onMoveKf: (trackId: string, kfId: string, newTime: number) => void
  onMoveClip: (trackId: string, clipId: string, newStart: number) => void
  onTrimClipEnd: (trackId: string, clipId: string, newDuration: number) => void
  onToggleExpand: (id: string) => void
  onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void
  onAddKeyframe: (trackId: string, time: number) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  viewWidth: number
}) {
  const Icon = TRACK_ICONS[track.type]

  const handleTimelineClick = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (track.locked) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const t = snap(Math.max(0, x / zoom + scrollLeft), 30)
    onAddKeyframe(track.id, t)
  }, [track.id, track.locked, zoom, scrollLeft, onAddKeyframe])

  return (
    <>
      {/* Track header + timeline row */}
      <div className="flex" style={{ height: track.height }}>
        {/* Header (left column, 240px) */}
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-r border-[var(--aethel-border-subtle)] px-2"
          style={{
            width: 240,
            paddingLeft: 8 + depth * 14,
            background: depth > 0 ? 'rgba(10,10,15,0.5)' : 'rgba(13,18,31,0.8)',
          }}
        >
          {/* Expand button */}
          {track.children.length > 0 ? (
            <button type="button" onClick={() => onToggleExpand(track.id)}
              className="shrink-0 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
            >
              {track.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : <span className="w-3 shrink-0" />}

          {/* Color bar */}
          <span className="h-3.5 w-0.5 shrink-0 rounded-full" style={{ background: track.color }} />

          {/* Icon */}
          <Icon className="h-3 w-3 shrink-0" style={{ color: track.color }} />

          {/* Name */}
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--aethel-text-primary)]">
            {track.name}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => onToggleVisible(track.id)}
              className="rounded p-0.5 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              aria-label={track.visible ? 'Hide' : 'Show'}
            >
              {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button type="button" onClick={() => onToggleLock(track.id)}
              className="rounded p-0.5 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              aria-label={track.locked ? 'Unlock' : 'Lock'}
            >
              {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
            <button type="button" onClick={() => onDuplicate(track.id)}
              className="rounded p-0.5 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              aria-label="Duplicate"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onDelete(track.id)}
              className="rounded p-0.5 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-error-light)] transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Timeline lane */}
        <div className="relative flex-1 overflow-hidden border-b border-[var(--aethel-border-subtle)]"
          style={{
            background: depth > 0
              ? 'rgba(10,10,15,0.35)'
              : 'rgba(13,18,31,0.6)',
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ cursor: track.locked ? 'not-allowed' : 'crosshair' }}
            onDoubleClick={handleTimelineClick as unknown as React.MouseEventHandler<SVGSVGElement>}
          >
            {/* Time grid lines */}
            <TimeGridLines zoom={zoom} scrollLeft={scrollLeft} width={viewWidth} height={track.height} />

            {/* Clips */}
            {track.clips.map(clip => (
              <ClipBlock
                key={clip.id}
                clip={clip}
                trackHeight={track.height}
                zoom={zoom}
                scrollLeft={scrollLeft}
                selected={selectedClipId === clip.id}
                onSelect={() => onSelectClip(clip.id)}
                onMove={newStart => onMoveClip(track.id, clip.id, newStart)}
                onTrimStart={() => {}}
                onTrimEnd={newDur => onTrimClipEnd(track.id, clip.id, newDur)}
              />
            ))}

            {/* Keyframes */}
            {track.keyframes.map(kf => (
              <KeyframeDot
                key={kf.id}
                kf={kf}
                trackHeight={track.height}
                zoom={zoom}
                scrollLeft={scrollLeft}
                selected={selectedKfId === kf.id}
                onSelect={() => onSelectKf(kf.id)}
                onDragEnd={newTime => onMoveKf(track.id, kf.id, newTime)}
                trackColor={track.color}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Children */}
      {track.expanded && track.children.map(child => (
        <TrackRow
          key={child.id}
          track={child}
          depth={depth + 1}
          zoom={zoom}
          scrollLeft={scrollLeft}
          selectedKfId={selectedKfId}
          selectedClipId={selectedClipId}
          onSelectKf={onSelectKf}
          onSelectClip={onSelectClip}
          onMoveKf={onMoveKf}
          onMoveClip={onMoveClip}
          onTrimClipEnd={onTrimClipEnd}
          onToggleExpand={onToggleExpand}
          onToggleVisible={onToggleVisible}
          onToggleLock={onToggleLock}
          onAddKeyframe={onAddKeyframe}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          viewWidth={viewWidth}
        />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// TIME GRID LINES (SVG, lightweight)
// ─────────────────────────────────────────────────────────────

function TimeGridLines({ zoom, scrollLeft, width, height }: {
  zoom: number; scrollLeft: number; width: number; height: number
}) {
  const lines = useMemo(() => {
    let tickSec = 1
    if (zoom > 80) tickSec = 0.5
    else if (zoom > 30) tickSec = 1
    else if (zoom > 10) tickSec = 5
    else tickSec = 10
    const startSec = scrollLeft
    const endSec = startSec + width / zoom
    const result: Array<{ x: number; major: boolean }> = []
    let t = Math.floor(startSec / tickSec) * tickSec
    while (t <= endSec) {
      const x = (t - scrollLeft) * zoom
      const major = Math.abs(t % (tickSec * 5)) < 0.001
      result.push({ x, major })
      t += tickSec
    }
    return result
  }, [zoom, scrollLeft, width])

  return (
    <>
      {lines.map(({ x, major }, i) => (
        <line key={i} x1={x} y1={0} x2={x} y2={height}
          stroke={major ? 'rgba(148,163,184,0.1)' : 'rgba(148,163,184,0.04)'}
          strokeWidth={major ? 1 : 0.5}
        />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// PLAYHEAD OVERLAY (full height, over all tracks)
// ─────────────────────────────────────────────────────────────

function PlayheadOverlay({ currentTime, scrollLeft, zoom, totalHeight }: {
  currentTime: number; scrollLeft: number; zoom: number; totalHeight: number
}) {
  const x = (currentTime - scrollLeft) * zoom
  if (x < 0 || x > 99999) return null
  return (
    <div
      className="pointer-events-none absolute top-0 z-20"
      style={{
        left: 240 + x,
        width: 1,
        height: totalHeight,
        background: 'linear-gradient(180deg, #f59e0b 0%, rgba(245,158,11,0.5) 100%)',
        boxShadow: '0 0 6px rgba(245,158,11,0.6)',
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// INSPECTOR PANEL (right)
// ─────────────────────────────────────────────────────────────

function SequencerInspector({
  selectedKf,
  onPatchKf,
}: {
  selectedKf: Keyframe | null
  onPatchKf: (patch: Partial<Keyframe>) => void
}) {
  if (!selectedKf) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <Film className="mx-auto h-8 w-8 text-[var(--aethel-text-quaternary)]" />
          <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">Select a keyframe to inspect</p>
          <p className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">Double-click a track lane to add</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)] mb-3">Keyframe Properties</p>
        <div className="space-y-3">
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] mb-1">Time</span>
            <input
              type="number"
              value={selectedKf.time.toFixed(3)}
              step={0.001}
              min={0}
              onChange={e => onPatchKf({ time: parseFloat(e.target.value) })}
              className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 font-mono text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
            />
          </div>

          {typeof selectedKf.value === 'number' && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] mb-1">Value</span>
              <input
                type="number"
                value={selectedKf.value}
                onChange={e => onPatchKf({ value: parseFloat(e.target.value) })}
                className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 font-mono text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
              />
            </div>
          )}

          {typeof selectedKf.value === 'string' && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] mb-1">Event</span>
              <input
                type="text"
                value={selectedKf.value}
                onChange={e => onPatchKf({ value: e.target.value })}
                className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 font-mono text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
              />
            </div>
          )}

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] mb-1.5">Easing</span>
            <div className="grid grid-cols-3 gap-1">
              {(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'step'] as Keyframe['easing'][]).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onPatchKf({ easing: e })}
                  className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-bold uppercase transition-colors ${selectedKf.easing === e
                    ? 'border-[color-mix(in_srgb,var(--aethel-info)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                    : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {EASING_ICONS[e]}
                  <span className="ml-1">{e.replace('ease-', '').replace('-', '‑')}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--aethel-text-tertiary)] mb-1">Label</span>
            <input
              type="text"
              value={selectedKf.label ?? ''}
              onChange={e => onPatchKf({ label: e.target.value || undefined })}
              placeholder="Optional label..."
              className={`w-full rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] transition focus:border-[var(--aethel-info)] ${CANONICAL_FOCUS}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN SEQUENCER COMPONENT
// ─────────────────────────────────────────────────────────────

export default function CinematicSequencer() {
  const [tracks, setTracks] = useState<Track[]>(makeDefaultTracks)
  const [seq, setSeq] = useState<SequencerState>({
    duration: 10,
    fps: 30,
    currentTime: 0,
    isPlaying: false,
    isLooping: true,
    loopStart: 0,
    loopEnd: 10,
    zoom: 80,   // px/sec
    scrollLeft: 0,
  })
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const viewWidth = 1200 // approximation; real width from ResizeObserver

  // ── Playback engine ──
  useEffect(() => {
    if (!seq.isPlaying) {
      cancelAnimationFrame(animRef.current ?? 0)
      return
    }
    lastTimeRef.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now
      setSeq(prev => {
        let t = prev.currentTime + dt
        if (prev.isLooping && t >= prev.loopEnd) t = prev.loopStart
        else if (t >= prev.duration) { t = 0; return { ...prev, currentTime: t, isPlaying: false } }
        return { ...prev, currentTime: t }
      })
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current ?? 0)
  }, [seq.isPlaying])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.code === 'Space') { e.preventDefault(); setSeq(prev => ({ ...prev, isPlaying: !prev.isPlaying })) }
      if (e.code === 'ArrowLeft') setSeq(prev => ({ ...prev, currentTime: Math.max(0, prev.currentTime - 1 / prev.fps) }))
      if (e.code === 'ArrowRight') setSeq(prev => ({ ...prev, currentTime: Math.min(prev.duration, prev.currentTime + 1 / prev.fps) }))
      if (e.code === 'Home') setSeq(prev => ({ ...prev, currentTime: 0 }))
      if (e.code === 'End') setSeq(prev => ({ ...prev, currentTime: prev.duration }))
    }
    window.addEventListener('keydown', onKey as unknown as EventListener)
    return () => window.removeEventListener('keydown', onKey as unknown as EventListener)
  }, [])

  // ── Scroll wheel zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setSeq(prev => ({
        ...prev,
        zoom: Math.max(10, Math.min(500, prev.zoom * (e.deltaY < 0 ? 1.15 : 0.87))),
      }))
    } else {
      setSeq(prev => ({
        ...prev,
        scrollLeft: Math.max(0, prev.scrollLeft + e.deltaX / prev.zoom * 0.8),
      }))
    }
  }, [])

  // ── Track mutations ──
  const mutateTrack = useCallback((id: string, patch: Partial<Track> | ((t: Track) => Track)) => {
    const apply = (tracks: Track[]): Track[] => tracks.map(t => {
      if (t.id === id) return typeof patch === 'function' ? patch(t) : { ...t, ...patch }
      return { ...t, children: apply(t.children) }
    })
    setTracks(prev => apply(prev))
  }, [])

  const moveKf = useCallback((trackId: string, kfId: string, newTime: number) => {
    mutateTrack(trackId, t => ({
      ...t,
      keyframes: t.keyframes.map(k => k.id === kfId ? { ...k, time: snap(newTime, seq.fps) } : k),
    }))
  }, [mutateTrack, seq.fps])

  const moveClip = useCallback((trackId: string, clipId: string, newStart: number) => {
    mutateTrack(trackId, t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, startTime: Math.max(0, newStart) } : c),
    }))
  }, [mutateTrack])

  const trimClipEnd = useCallback((trackId: string, clipId: string, newDuration: number) => {
    mutateTrack(trackId, t => ({
      ...t,
      clips: t.clips.map(c => c.id === clipId ? { ...c, duration: Math.max(0.1, newDuration) } : c),
    }))
  }, [mutateTrack])

  const addKf = useCallback((trackId: string, time: number) => {
    const kf: Keyframe = { id: uid('kf'), time, value: 0, easing: 'ease-in-out' }
    mutateTrack(trackId, t => ({ ...t, keyframes: [...t.keyframes, kf].sort((a, b) => a.time - b.time) }))
    setSelectedKfId(kf.id)
    log.debug('kf.add', { trackId, time })
  }, [mutateTrack])

  // Find selected kf across all tracks
  const selectedKf = useMemo(() => {
    const findKf = (tracks: Track[]): Keyframe | null => {
      for (const t of tracks) {
        const k = t.keyframes.find(k => k.id === selectedKfId)
        if (k) return k
        const fromChild = findKf(t.children)
        if (fromChild) return fromChild
      }
      return null
    }
    return findKf(tracks)
  }, [tracks, selectedKfId])

  const patchSelectedKf = useCallback((patch: Partial<Keyframe>) => {
    if (!selectedKfId) return
    const apply = (tracks: Track[]): Track[] => tracks.map(t => ({
      ...t,
      keyframes: t.keyframes.map(k => k.id === selectedKfId ? { ...k, ...patch } : k),
      children: apply(t.children),
    }))
    setTracks(prev => apply(prev))
  }, [selectedKfId])

  const deleteTrack = useCallback((id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id))
  }, [])

  const duplicateTrack = useCallback((id: string) => {
    const findAndDupe = (tracks: Track[]): Track[] => {
      const result: Track[] = []
      for (const t of tracks) {
        result.push(t)
        if (t.id === id) {
          result.push({ ...t, id: uid('track'), name: `${t.name} Copy` })
        }
      }
      return result
    }
    setTracks(prev => findAndDupe(prev))
  }, [])

  const addTrack = useCallback(() => {
    const types: TrackType[] = ['camera', 'actor', 'transform', 'animation', 'audio', 'vfx', 'event', 'light']
    const type = types[Math.floor(Math.random() * types.length)]
    setTracks(prev => [...prev, {
      id: uid('track'),
      type,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Track`,
      visible: true, locked: false, muted: false, solo: false, expanded: false,
      color: TRACK_COLORS[type],
      keyframes: [], clips: [], children: [],
      height: 40,
    }])
  }, [])

  const totalHeight = useMemo(() => {
    const calc = (tracks: Track[]): number => tracks.reduce((s, t) => s + t.height + (t.expanded ? calc(t.children) : 0), 0)
    return calc(tracks)
  }, [tracks])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)]">
      {/* ── Toolbar ── */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-4 backdrop-blur-md">
        <Film className="h-4 w-4 text-[var(--aethel-neon-cyan)]" />
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-primary)]">Cinematic Sequencer</span>
        <div className="h-4 w-px bg-[var(--aethel-border-subtle)]" />

        {/* Transport */}
        <button type="button" onClick={() => setSeq(prev => ({ ...prev, currentTime: 0 }))}
          className={`rounded-lg border border-[var(--aethel-border-subtle)] p-2 text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
          aria-label="Go to start"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button type="button"
          onClick={() => setSeq(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all ${seq.isPlaying
            ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
            : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
          } ${CANONICAL_FOCUS}`}
          aria-label={seq.isPlaying ? 'Pause' : 'Play'}
        >
          {seq.isPlaying ? <><Square className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Play</>}
        </button>
        <button type="button" onClick={() => setSeq(prev => ({ ...prev, currentTime: prev.duration }))}
          className={`rounded-lg border border-[var(--aethel-border-subtle)] p-2 text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS}`}
          aria-label="Go to end"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        {/* Loop toggle */}
        <button type="button"
          onClick={() => setSeq(prev => ({ ...prev, isLooping: !prev.isLooping }))}
          className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold transition-all ${seq.isLooping
            ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]'
            : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)]'
          } ${CANONICAL_FOCUS}`}
          aria-pressed={seq.isLooping}
        >
          ⟳ Loop
        </button>

        {/* Time counter */}
        <div className="ml-2 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-1.5">
          <span className="font-mono text-xs font-bold text-[var(--aethel-warning-light)]">
            {formatTime(seq.currentTime, seq.fps)}
          </span>
          <span className="ml-2 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
            / {formatTime(seq.duration, seq.fps)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* FPS display */}
          <span className="rounded border border-[var(--aethel-border-subtle)] px-2 py-1 font-mono text-[10px] text-[var(--aethel-text-quaternary)]">
            {seq.fps} fps
          </span>

          {/* Zoom control */}
          <div className="flex items-center gap-1.5">
            <button type="button"
              onClick={() => setSeq(prev => ({ ...prev, zoom: Math.max(10, prev.zoom * 0.7) }))}
              className="rounded border border-[var(--aethel-border-subtle)] px-1.5 py-1 text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
            >−</button>
            <span className="font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
              {Math.round(seq.zoom)}x
            </span>
            <button type="button"
              onClick={() => setSeq(prev => ({ ...prev, zoom: Math.min(500, prev.zoom * 1.43) }))}
              className="rounded border border-[var(--aethel-border-subtle)] px-1.5 py-1 text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] transition-colors"
            >+</button>
          </div>

          {/* Add track */}
          <button type="button" onClick={addTrack}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-info)] hover:text-[var(--aethel-info-light)] ${CANONICAL_FOCUS}`}
          >
            <Plus className="h-3.5 w-3.5" /> Track
          </button>
        </div>
      </header>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline area */}
        <div className="flex flex-1 flex-col overflow-hidden" onWheel={handleWheel}>
          {/* Ruler header */}
          <div className="flex shrink-0" style={{ height: 32 }}>
            {/* Track header stub */}
            <div className="shrink-0 border-b border-r border-[var(--aethel-border-subtle)] bg-[rgba(10,10,15,0.95)]"
              style={{ width: 240 }}
            >
              <div className="flex h-full items-center px-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
                  {tracks.length} tracks
                </span>
              </div>
            </div>
            {/* Ruler */}
            <div className="flex-1 overflow-hidden">
              <TimeRuler
                zoom={seq.zoom}
                scrollLeft={seq.scrollLeft}
                duration={seq.duration}
                fps={seq.fps}
                currentTime={seq.currentTime}
                onScrub={t => setSeq(prev => ({ ...prev, currentTime: t }))}
                width={viewWidth}
              />
            </div>
          </div>

          {/* Tracks */}
          <div
            ref={timelineRef}
            className="relative flex-1 overflow-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* Playhead */}
            <PlayheadOverlay
              currentTime={seq.currentTime}
              scrollLeft={seq.scrollLeft}
              zoom={seq.zoom}
              totalHeight={totalHeight}
            />

            {tracks.map(track => (
              <TrackRow
                key={track.id}
                track={track}
                depth={0}
                zoom={seq.zoom}
                scrollLeft={seq.scrollLeft}
                selectedKfId={selectedKfId}
                selectedClipId={selectedClipId}
                onSelectKf={setSelectedKfId}
                onSelectClip={setSelectedClipId}
                onMoveKf={moveKf}
                onMoveClip={moveClip}
                onTrimClipEnd={trimClipEnd}
                onToggleExpand={id => mutateTrack(id, t => ({ ...t, expanded: !t.expanded }))}
                onToggleVisible={id => mutateTrack(id, t => ({ ...t, visible: !t.visible }))}
                onToggleLock={id => mutateTrack(id, t => ({ ...t, locked: !t.locked }))}
                onAddKeyframe={addKf}
                onDelete={deleteTrack}
                onDuplicate={duplicateTrack}
                viewWidth={viewWidth}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Keyframe inspector */}
        <aside className="flex w-64 shrink-0 flex-col border-l border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-[var(--aethel-border-subtle)] px-3 py-2.5">
            <Settings className="h-3.5 w-3.5 text-[var(--aethel-text-tertiary)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              Keyframe Inspector
            </span>
          </div>
          <SequencerInspector selectedKf={selectedKf} onPatchKf={patchSelectedKf} />
        </aside>
      </div>
    </div>
  )
}
