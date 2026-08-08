'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Clock,
  KeyRound,
  Layers,
  Pause,
  Play,
  Plus,
  Scissors,
  SkipBack,
  SkipForward,
  Repeat,
  ChevronDown,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineProps {
  duration?: number
  currentTime?: number
  onTimeChange?: (time: number) => void
  onPlay?: () => void
  onPause?: () => void
  /**
   * When true (default for static callers), show an honesty badge that this
   * timeline is demo/fixture data — not live scene/animation tracks.
   */
  demoMode?: boolean
}

interface KeyframeData {
  id: string
  time: number
  track: string
  value: unknown
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TRACK_CONFIGS: Record<string, { color: string; glow: string; label: string }> = {
  position:   { color: '#60a5fa', glow: 'rgba(96,165,250,0.5)',   label: 'Position' },
  rotation:   { color: '#c084fc', glow: 'rgba(192,132,252,0.5)', label: 'Rotation' },
  scale:      { color: '#4ade80', glow: 'rgba(74,222,128,0.5)',  label: 'Scale' },
  visibility: { color: '#facc15', glow: 'rgba(250,204,21,0.5)',  label: 'Visibility' },
  material:   { color: '#fb923c', glow: 'rgba(251,146,60,0.5)',  label: 'Material' },
}
const DEFAULT_TRACK_CONFIG = { color: '#6b7280', glow: 'rgba(107,114,128,0.5)', label: 'Unknown' }
const TRACKS = ['position', 'rotation', 'scale', 'visibility', 'material'] as const

const MIN_HEIGHT    = 140
const DEFAULT_HEIGHT = 200
const TRACK_HEIGHT   = 36
const RULER_HEIGHT   = 28
const LABEL_WIDTH    = 128

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimecode(seconds: number, fps = 24): string {
  const total  = Math.max(0, seconds)
  const m      = Math.floor(total / 60)
  const s      = Math.floor(total % 60)
  const frames = Math.floor((total % 1) * fps)
  const pad    = (n: number, d = 2) => String(n).padStart(d, '0')
  return `${pad(m)}:${pad(s)}:${pad(frames)}`
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  color: string, glow: string, hovered: boolean, selected: boolean
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)

  if (hovered || selected) {
    ctx.shadowColor = glow
    ctx.shadowBlur = hovered ? 14 : 8
  }

  // Outer glow ring
  if (selected) {
    ctx.fillStyle = color + '30'
    ctx.fillRect(-(size + 4) / 2, -(size + 4) / 2, size + 4, size + 4)
  }

  ctx.fillStyle = hovered ? '#ffffff' : color
  ctx.fillRect(-size / 2, -size / 2, size, size)
  ctx.restore()
}

// ─── ResizeHandle ─────────────────────────────────────────────────────────────

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const isDragging = useRef(false)
  const lastY = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastY.current = e.clientY
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = lastY.current - e.clientY
      lastY.current = e.clientY
      onResize(delta)
    }
    const onUp = () => { isDragging.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [onResize])

  return (
    <div
      className="group flex h-[5px] w-full cursor-ns-resize items-center justify-center transition-colors"
      style={{
        background: 'rgba(10,14,24,0.9)',
        borderTop: '1px solid rgba(148,163,184,0.1)',
      }}
      onMouseDown={handleMouseDown}
      aria-label="Drag to resize timeline panel"
      role="separator"
      aria-orientation="horizontal"
    >
      <div
        className="h-[3px] w-12 rounded-full transition-all duration-200 group-hover:w-20"
        style={{ background: 'rgba(148,163,184,0.2)' }}
      />
    </div>
  )
}

// ─── Timeline3D ──────────────────────────────────────────────────────────────

export function Timeline3D({
  duration = 10,
  currentTime = 0,
  onTimeChange = () => undefined,
  onPlay = () => undefined,
  onPause = () => undefined,
  demoMode = true,
}: TimelineProps) {
  const [isPlaying, setIsPlaying]       = useState(false)
  const [isLooping, setIsLooping]       = useState(false)
  const [panelHeight, setPanelHeight]   = useState(DEFAULT_HEIGHT)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [fps, setFps]                   = useState(24)
  const [showFpsMenu, setShowFpsMenu]   = useState(false)
  const [keyframes, setKeyframes]       = useState<KeyframeData[]>([
    { id: '1', time: 0,   track: 'position', value: { x: 0,   y: 0,  z: 0  } },
    { id: '2', time: 2,   track: 'position', value: { x: 10,  y: 5,  z: 0  } },
    { id: '3', time: 4,   track: 'rotation', value: { x: 0,   y: 90, z: 0  } },
    { id: '4', time: 6,   track: 'scale',    value: { x: 1.5, y: 1.5, z: 1.5 } },
    { id: '5', time: 3,   track: 'material', value: { opacity: 0.5 } },
  ])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [hoveredKf, setHoveredKf] = useState<{ x: number; y: number; kf: KeyframeData } | null>(null)
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null)

  const isPlayingRef = useRef(isPlaying)
  const timeRef      = useRef(currentTime)
  const isLoopingRef = useRef(isLooping)

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { timeRef.current = currentTime }, [currentTime])
  useEffect(() => { isLoopingRef.current = isLooping }, [isLooping])

  const handlePlayPause = () => {
    if (isPlaying) { setIsPlaying(false); onPause() }
    else           { setIsPlaying(true);  onPlay() }
  }

  const addKeyframeAtCurrentTime = () => {
    if (!selectedTrack) return
    const id = crypto.randomUUID()
    setKeyframes(prev => [...prev, { id, time: currentTime, track: selectedTrack, value: { x: 0, y: 0, z: 0 } }])
  }

  const handleResize = useCallback((delta: number) => {
    setPanelHeight(h => Math.max(MIN_HEIGHT, h + delta))
  }, [])

  // ─── Canvas Rendering Loop ─────────────────────────────────────────────────

  const drawCanvas = useCallback(() => {
    const canvas  = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr  = window.devicePixelRatio || 1
    const rect = wrapper.getBoundingClientRect()

    if (
      canvas.width  !== Math.floor(rect.width * dpr) ||
      canvas.height !== Math.floor(rect.height * dpr)
    ) {
      canvas.width  = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      canvas.style.width  = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const drawTime = timeRef.current

    // ── RULER ─────────────────────────────────────────────────────────────────
    // Background
    ctx.fillStyle = 'rgba(10,14,24,0.95)'
    ctx.fillRect(0, 0, rect.width, RULER_HEIGHT)
    // Bottom border
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, RULER_HEIGHT)
    ctx.lineTo(rect.width, RULER_HEIGHT)
    ctx.stroke()

    // Tick marks + labels
    ctx.font = '9px "SF Mono", "Cascadia Code", ui-monospace, monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'

    const interval  = duration > 30 ? 5 : duration > 15 ? 2 : 1
    const subInterval = interval / 4

    for (let t = 0; t <= duration; t += subInterval) {
      const x = (t / duration) * rect.width
      const isMajor = Math.abs(t % interval) < 0.001
      const isMinor = !isMajor && Math.abs(t % (subInterval * 2)) < 0.001

      ctx.beginPath()
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.moveTo(x, RULER_HEIGHT - (isMajor ? 10 : isMinor ? 6 : 3))
      ctx.lineTo(x, RULER_HEIGHT)
      ctx.stroke()

      if (isMajor) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fillText(formatTimecode(t, fps), x + 3, RULER_HEIGHT / 2)
      }
    }

    // ── TRACKS ────────────────────────────────────────────────────────────────
    TRACKS.forEach((track, i) => {
      const y    = RULER_HEIGHT + i * TRACK_HEIGHT
      const cfg  = TRACK_CONFIGS[track] ?? DEFAULT_TRACK_CONFIG
      const isSelected = selectedTrack === track

      // Row background
      ctx.fillStyle = isSelected
        ? `rgba(${hexToRgb(cfg.color)}, 0.06)`
        : i % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(0,0,0,0.1)'
      ctx.fillRect(0, y, rect.width, TRACK_HEIGHT)

      // Row bottom border
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + TRACK_HEIGHT)
      ctx.lineTo(rect.width, y + TRACK_HEIGHT)
      ctx.stroke()

      // ── Track bar / event strip (if keyframes exist, draw horizontal bar) ──
      const trackKfs = keyframes.filter(k => k.track === track)
      if (trackKfs.length >= 2) {
        const sorted = [...trackKfs].sort((a, b) => a.time - b.time)
        const x0 = (sorted[0].time / duration) * rect.width
        const x1 = (sorted[sorted.length - 1].time / duration) * rect.width
        ctx.fillStyle = cfg.color + '25'
        ctx.fillRect(x0, y + TRACK_HEIGHT / 2 - 3, x1 - x0, 6)
      }

      // ── Keyframe diamonds ──
      trackKfs.forEach(kf => {
        const kfX      = (kf.time / duration) * rect.width
        const kfY      = y + TRACK_HEIGHT / 2
        const isHovered  = hoveredKf?.kf.id === kf.id
        const isSelectedKf = selectedKfId === kf.id
        const size = isHovered ? 11 : isSelectedKf ? 10 : 8
        drawDiamond(ctx, kfX, kfY, size, cfg.color, cfg.glow, isHovered, isSelectedKf)
      })
    })

    // ── PLAYHEAD ──────────────────────────────────────────────────────────────
    const playheadX = (drawTime / duration) * rect.width

    // Glow
    ctx.save()
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur  = 12
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(playheadX, RULER_HEIGHT)
    ctx.lineTo(playheadX, rect.height)
    ctx.stroke()
    ctx.restore()

    // Playhead arrow head at top
    ctx.save()
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur  = 8
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(playheadX - 7, RULER_HEIGHT - 2)
    ctx.lineTo(playheadX + 7, RULER_HEIGHT - 2)
    ctx.lineTo(playheadX + 7, RULER_HEIGHT - 10)
    ctx.lineTo(playheadX, RULER_HEIGHT)
    ctx.lineTo(playheadX - 7, RULER_HEIGHT - 10)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }, [duration, keyframes, selectedTrack, hoveredKf, selectedKfId, fps])

  // Playback RAF loop
  useEffect(() => {
    let animationFrameId: number
    let lastTime = performance.now()

    const render = (now: number) => {
      if (isPlayingRef.current) {
        const delta = (now - lastTime) / 1000
        timeRef.current += delta
        if (timeRef.current >= duration) {
          if (isLoopingRef.current) {
            timeRef.current = 0
            onTimeChange(0)
          } else {
            timeRef.current = duration
            setIsPlaying(false)
            onTimeChange(duration)
          }
        } else {
          onTimeChange(timeRef.current)
        }
      }
      lastTime = now
      drawCanvas()
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animationFrameId)
  }, [duration, onTimeChange, drawCanvas])

  // ─── Pointer Handlers ─────────────────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!wrapperRef.current) return
    wrapperRef.current.setPointerCapture(e.pointerId)

    // Check if clicking on a keyframe
    const rect = wrapperRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const y    = e.clientY - rect.top

    for (let i = TRACKS.length - 1; i >= 0; i--) {
      const track  = TRACKS[i]
      const trackY = RULER_HEIGHT + i * TRACK_HEIGHT
      const trackKfs = keyframes.filter(k => k.track === track)
      for (const kf of trackKfs) {
        const kfX = (kf.time / duration) * rect.width
        const kfY = trackY + TRACK_HEIGHT / 2
        if (Math.abs(x - kfX) < 10 && Math.abs(y - kfY) < 10) {
          setSelectedKfId(kf.id)
          return
        }
      }
    }

    setSelectedKfId(null)

    // Scrub time
    const updateTime = (evt: { clientX: number }) => {
      const r    = wrapperRef.current!.getBoundingClientRect()
      const nx   = Math.max(0, Math.min(evt.clientX - r.left, r.width))
      const newTime = (nx / r.width) * duration
      timeRef.current = newTime
      onTimeChange(newTime)
      if (!isPlayingRef.current) drawCanvas()
    }
    updateTime(e)

    const onPointerMove = (evt: PointerEvent) => updateTime(evt)
    const onPointerUp   = () => {
      wrapperRef.current?.removeEventListener('pointermove', onPointerMove)
      wrapperRef.current?.removeEventListener('pointerup', onPointerUp)
    }
    wrapperRef.current.addEventListener('pointermove', onPointerMove)
    wrapperRef.current.addEventListener('pointerup', onPointerUp)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const x    = e.clientX - rect.left
    const y    = e.clientY - rect.top

    let found: typeof hoveredKf = null
    for (let i = TRACKS.length - 1; i >= 0; i--) {
      const track  = TRACKS[i]
      const trackY = RULER_HEIGHT + i * TRACK_HEIGHT
      const trackKfs = keyframes.filter(k => k.track === track)
      for (const kf of trackKfs) {
        const kfX = (kf.time / duration) * rect.width
        const kfY = trackY + TRACK_HEIGHT / 2
        if (Math.abs(x - kfX) < 10 && Math.abs(y - kfY) < 10) {
          found = { x: kfX, y: kfY, kf }
          break
        }
      }
      if (found) break
    }
    if (found?.kf.id !== hoveredKf?.kf.id) setHoveredKf(found)
  }

  const FPS_OPTIONS = [12, 24, 30, 60, 120]

  return (
    <div
      className="flex flex-col relative"
      style={{
        height: panelHeight,
        background: 'rgba(8,12,22,0.98)',
        borderTop: '1px solid rgba(148,163,184,0.1)',
      }}
    >
      <ResizeHandle onResize={handleResize} />

      {demoMode && (
        <div
          className="flex shrink-0 items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{
            height: 22,
            background: 'color-mix(in srgb, var(--aethel-warning) 12%, transparent)',
            color: 'var(--aethel-warning)',
            borderBottom: '1px solid color-mix(in srgb, var(--aethel-warning) 25%, transparent)',
          }}
          role="status"
          data-timeline-demo="true"
        >
          Demo timeline — fixture keyframes only (not wired to scene/animation data)
        </div>
      )}

      {/* ── Toolbar ── */}
      <div
        className="flex shrink-0 items-center justify-between px-3 z-20 relative"
        style={{
          height: 40,
          background: 'rgba(10,14,24,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
        }}
      >
        {/* Left controls */}
        <div className="flex items-center gap-1">
          {/* Skip Back */}
          <button
            type="button"
            onClick={() => { timeRef.current = 0; onTimeChange(0) }}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
            style={{ color: 'rgba(148,163,184,0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; e.currentTarget.style.color = '#f7f9fc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.6)' }}
            title="Return to start"
          >
            <SkipBack size={13} />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={handlePlayPause}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
            style={{
              background: isPlaying
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              boxShadow: isPlaying
                ? '0 0 12px rgba(245,158,11,0.4)'
                : '0 0 12px rgba(34,197,94,0.35)',
              color: 'white',
            }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>

          {/* Skip Forward */}
          <button
            type="button"
            onClick={() => { timeRef.current = duration; onTimeChange(duration) }}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
            style={{ color: 'rgba(148,163,184,0.6)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; e.currentTarget.style.color = '#f7f9fc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.6)' }}
            title="Jump to end"
          >
            <SkipForward size={13} />
          </button>

          {/* Loop */}
          <button
            type="button"
            onClick={() => setIsLooping(v => !v)}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100"
            style={{
              color: isLooping ? '#60a5fa' : 'rgba(148,163,184,0.5)',
              background: isLooping ? 'rgba(59,130,246,0.12)' : 'transparent',
            }}
            title="Toggle loop"
          >
            <Repeat size={12} />
          </button>

          <div style={{ width: 1, height: 18, background: 'rgba(148,163,184,0.12)' }} />

          {/* Add Keyframe */}
          <button
            type="button"
            onClick={addKeyframeAtCurrentTime}
            disabled={!selectedTrack}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'rgba(148,163,184,0.6)' }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(148,163,184,0.08)'; e.currentTarget.style.color = '#f7f9fc' } }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.6)' }}
            title={selectedTrack ? `Add keyframe to "${selectedTrack}"` : 'Select a track to add a keyframe'}
          >
            <KeyRound size={13} />
          </button>
        </div>

        {/* Center: Timecode */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-lg"
            style={{ background: 'rgba(16,22,36,0.8)', border: '1px solid rgba(148,163,184,0.1)' }}
          >
            <span
              className="font-mono text-sm font-bold tracking-widest tabular-nums"
              style={{ color: '#f7f9fc', letterSpacing: '0.08em' }}
            >
              {formatTimecode(currentTime, fps)}
            </span>
            <span style={{ color: 'rgba(148,163,184,0.3)', fontSize: 12 }}>/</span>
            <span
              className="font-mono text-xs tabular-nums"
              style={{ color: 'rgba(148,163,184,0.5)' }}
            >
              {formatTimecode(duration, fps)}
            </span>
          </div>

          {/* FPS Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFpsMenu(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all duration-100"
              style={{
                color: 'rgba(148,163,184,0.7)',
                background: 'rgba(16,22,36,0.6)',
                border: '1px solid rgba(148,163,184,0.08)',
              }}
            >
              <span className="font-mono">{fps}</span>
              <span style={{ fontSize: 9, opacity: 0.6 }}>fps</span>
              <ChevronDown size={10} style={{ opacity: 0.5 }} />
            </button>
            {showFpsMenu && (
              <div
                className="absolute bottom-full mb-1 right-0 rounded-lg overflow-hidden z-50"
                style={{
                  background: 'rgba(10,14,24,0.98)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                }}
              >
                {FPS_OPTIONS.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFps(f); setShowFpsMenu(false) }}
                    className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-xs transition-colors"
                    style={{
                      color: f === fps ? '#93c5fd' : 'rgba(148,163,184,0.7)',
                      background: f === fps ? 'rgba(59,130,246,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (f !== fps) e.currentTarget.style.background = 'rgba(148,163,184,0.06)' }}
                    onMouseLeave={e => { if (f !== fps) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span className="font-mono">{f}</span>
                    <span style={{ opacity: 0.4, fontSize: 10 }}>fps</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(148,163,184,0.4)' }}>
            <Layers size={11} />
            <span className="text-[10px] font-mono">{keyframes.length} kf</span>
          </div>
          {selectedTrack && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: `rgba(${hexToRgb(TRACK_CONFIGS[selectedTrack]?.color ?? '#6b7280')}, 0.12)`,
                color: TRACK_CONFIGS[selectedTrack]?.color ?? '#6b7280',
                border: `1px solid rgba(${hexToRgb(TRACK_CONFIGS[selectedTrack]?.color ?? '#6b7280')}, 0.2)`,
              }}
            >
              {selectedTrack}
            </div>
          )}
        </div>
      </div>

      {/* ── Body: Track Labels + Canvas ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        {/* Track label column */}
        <div
          className="shrink-0 z-10"
          style={{
            width: LABEL_WIDTH,
            background: 'rgba(10,14,24,0.98)',
            borderRight: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          {/* Ruler gutter */}
          <div style={{ height: RULER_HEIGHT, borderBottom: '1px solid rgba(148,163,184,0.08)' }} />

          {TRACKS.map(track => {
            const cfg        = TRACK_CONFIGS[track] ?? DEFAULT_TRACK_CONFIG
            const isSelected = selectedTrack === track
            const kfCount    = keyframes.filter(k => k.track === track).length

            return (
              <div
                key={track}
                className="flex items-center gap-2 px-3 cursor-pointer transition-all duration-100"
                style={{
                  height: TRACK_HEIGHT,
                  background: isSelected ? `rgba(${hexToRgb(cfg.color)}, 0.08)` : 'transparent',
                  borderBottom: '1px solid rgba(148,163,184,0.05)',
                  borderLeft: `2px solid ${isSelected ? cfg.color : 'transparent'}`,
                }}
                onClick={() => setSelectedTrack(isSelected ? null : track)}
              >
                {/* Color dot */}
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: cfg.color,
                    boxShadow: isSelected ? `0 0 8px ${cfg.glow}` : 'none',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="text-[11px] font-medium flex-1 truncate capitalize"
                  style={{ color: isSelected ? '#f7f9fc' : 'rgba(148,163,184,0.6)' }}
                >
                  {cfg.label}
                </span>
                {kfCount > 0 && (
                  <span
                    className="text-[9px] font-mono rounded px-1"
                    style={{
                      color: cfg.color,
                      background: `rgba(${hexToRgb(cfg.color)}, 0.12)`,
                    }}
                  >
                    {kfCount}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Canvas area */}
        <div
          ref={wrapperRef}
          className="relative min-w-0 flex-1 touch-none"
          style={{ cursor: hoveredKf ? 'pointer' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredKf(null)}
          onClick={() => setShowFpsMenu(false)}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block touch-none"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Keyframe tooltip */}
          {hoveredKf && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2"
              style={{ left: hoveredKf.x, top: hoveredKf.y - 8, transform: 'translate(-50%, -100%)' }}
            >
              <div
                className="px-3 py-2 rounded-lg"
                style={{
                  background: 'rgba(10,14,24,0.97)',
                  border: `1px solid ${TRACK_CONFIGS[hoveredKf.kf.track]?.color ?? '#6b7280'}40`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset`,
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: TRACK_CONFIGS[hoveredKf.kf.track]?.color ?? '#6b7280' }}
                >
                  {hoveredKf.kf.track}
                </div>
                <div className="text-[10px] font-mono" style={{ color: '#f7f9fc' }}>
                  t = {formatTimecode(hoveredKf.kf.time, fps)}
                </div>
                {hoveredKf.kf.value !== null && typeof hoveredKf.kf.value === 'object' && (
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(148,163,184,0.6)' }}>
                    {Object.entries(hoveredKf.kf.value as Record<string, number>)
                      .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`)
                      .join(' · ')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helper: hex color to "r,g,b" for rgba() ─────────────────────────────────

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const n     = parseInt(clean, 16)
  if (isNaN(n)) return '148,163,184'
  const r = (n >> 16) & 255
  const g = (n >>  8) & 255
  const b =  n        & 255
  return `${r},${g},${b}`
}

export { Timeline3D as Timeline }
