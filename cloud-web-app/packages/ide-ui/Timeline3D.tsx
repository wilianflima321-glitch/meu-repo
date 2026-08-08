'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { drawTimelineCanvas } from './Timeline3D.canvas'
import { TimelineHonestyBadges, TimelineToolbar } from './Timeline3D.toolbar'
import {
  DEFAULT_HEIGHT,
  DEMO_TRACKS,
  LABEL_WIDTH,
  MIN_HEIGHT,
  MUTED_ICON,
  PANEL_BORDER,
  PANEL_BORDER_SUBTLE,
  PANEL_SURFACE,
  RESIZE_GRIP,
  RULER_HEIGHT,
  SHADOW_TOOLTIP,
  TEXT_PRIMARY,
  TRACK_HEIGHT,
  formatTimecode,
  trackBorder,
  trackConfig,
  trackRgba,
} from './Timeline3D.styles'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineKeyframeData {
  id: string
  time: number
  track: string
  value: unknown
}

/** @deprecated Use TimelineKeyframeData */
type KeyframeData = TimelineKeyframeData

interface TimelineProps {
  duration?: number
  currentTime?: number
  onTimeChange?: (time: number) => void
  onPlay?: () => void
  onPause?: () => void
  /**
   * Explicit demo/fixture path only. When true, seeds fixture keyframes and
   * shows the honesty badge. Live / empty project paths must pass false.
   */
  demoMode?: boolean
  /** Real (or empty) keyframes from ITimelineService — ignored when demoMode. */
  keyframes?: TimelineKeyframeData[]
  /** Track lane ids to render. Empty + !demoMode = honest empty timeline. */
  tracks?: string[]
}

/** Fixture keyframes — only used when demoMode={true}. */
export const TIMELINE3D_DEMO_KEYFRAMES: TimelineKeyframeData[] = [
  { id: '1', time: 0, track: 'position', value: { x: 0, y: 0, z: 0 } },
  { id: '2', time: 2, track: 'position', value: { x: 10, y: 5, z: 0 } },
  { id: '3', time: 4, track: 'rotation', value: { x: 0, y: 90, z: 0 } },
  { id: '4', time: 6, track: 'scale', value: { x: 1.5, y: 1.5, z: 1.5 } },
  { id: '5', time: 3, track: 'material', value: { opacity: 0.5 } },
]

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
      style={{ background: PANEL_SURFACE, borderTop: `1px solid ${PANEL_BORDER}` }}
      onMouseDown={handleMouseDown}
      aria-label="Drag to resize timeline panel"
      role="separator"
      aria-orientation="horizontal"
    >
      <div
        className="h-[3px] w-12 rounded-full transition-all duration-200 group-hover:w-20"
        style={{ background: RESIZE_GRIP }}
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
  demoMode = false,
  keyframes: keyframesProp,
  tracks: tracksProp,
}: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT)
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const [fps, setFps] = useState(24)
  const [showFpsMenu, setShowFpsMenu] = useState(false)
  const [localKeyframes, setLocalKeyframes] = useState<KeyframeData[]>([])

  const trackList: string[] = demoMode
    ? [...DEMO_TRACKS]
    : (tracksProp && tracksProp.length > 0
        ? tracksProp
        : [...new Set((keyframesProp ?? []).map((kf) => kf.track))])

  const keyframes: KeyframeData[] = demoMode
    ? TIMELINE3D_DEMO_KEYFRAMES
    : (keyframesProp ?? localKeyframes)

  const safeDuration = Math.max(duration, 0.001)
  const isEmptyLive = !demoMode && trackList.length === 0

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [hoveredKf, setHoveredKf] = useState<{ x: number; y: number; kf: KeyframeData } | null>(null)
  const [selectedKfId, setSelectedKfId] = useState<string | null>(null)

  const isPlayingRef = useRef(isPlaying)
  const timeRef = useRef(currentTime)
  const isLoopingRef = useRef(isLooping)

  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { timeRef.current = currentTime }, [currentTime])
  useEffect(() => { isLoopingRef.current = isLooping }, [isLooping])

  const handlePlayPause = () => {
    if (isPlaying) { setIsPlaying(false); onPause() }
    else { setIsPlaying(true); onPlay() }
  }

  const addKeyframeAtCurrentTime = () => {
    if (!selectedTrack || demoMode || keyframesProp) return
    const id = crypto.randomUUID()
    setLocalKeyframes(prev => [...prev, { id, time: currentTime, track: selectedTrack, value: { x: 0, y: 0, z: 0 } }])
  }

  const handleResize = useCallback((delta: number) => {
    setPanelHeight(h => Math.max(MIN_HEIGHT, h + delta))
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return
    drawTimelineCanvas({
      canvas,
      wrapper,
      safeDuration,
      fps,
      drawTime: timeRef.current,
      trackList,
      keyframes,
      selectedTrack,
      hoveredKfId: hoveredKf?.kf.id ?? null,
      selectedKfId,
      resolveTrack: trackConfig,
    })
  }, [safeDuration, trackList, keyframes, selectedTrack, hoveredKf, selectedKfId, fps])

  useEffect(() => {
    let animationFrameId: number
    let lastTime = performance.now()

    const render = (now: number) => {
      if (isPlayingRef.current) {
        const delta = (now - lastTime) / 1000
        timeRef.current += delta
        if (timeRef.current >= safeDuration) {
          if (isLoopingRef.current) {
            timeRef.current = 0
            onTimeChange(0)
          } else {
            timeRef.current = safeDuration
            setIsPlaying(false)
            onTimeChange(safeDuration)
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
  }, [safeDuration, onTimeChange, drawCanvas])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!wrapperRef.current) return
    wrapperRef.current.setPointerCapture(e.pointerId)

    const rect = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (let i = trackList.length - 1; i >= 0; i--) {
      const track = trackList[i]
      const trackY = RULER_HEIGHT + i * TRACK_HEIGHT
      const trackKfs = keyframes.filter(k => k.track === track)
      for (const kf of trackKfs) {
        const kfX = (kf.time / safeDuration) * rect.width
        const kfY = trackY + TRACK_HEIGHT / 2
        if (Math.abs(x - kfX) < 10 && Math.abs(y - kfY) < 10) {
          setSelectedKfId(kf.id)
          return
        }
      }
    }

    setSelectedKfId(null)

    const updateTime = (evt: { clientX: number }) => {
      const r = wrapperRef.current!.getBoundingClientRect()
      const nx = Math.max(0, Math.min(evt.clientX - r.left, r.width))
      const newTime = (nx / r.width) * safeDuration
      timeRef.current = newTime
      onTimeChange(newTime)
      if (!isPlayingRef.current) drawCanvas()
    }
    updateTime(e)

    const onPointerMove = (evt: PointerEvent) => updateTime(evt)
    const onPointerUp = () => {
      wrapperRef.current?.removeEventListener('pointermove', onPointerMove)
      wrapperRef.current?.removeEventListener('pointerup', onPointerUp)
    }
    wrapperRef.current.addEventListener('pointermove', onPointerMove)
    wrapperRef.current.addEventListener('pointerup', onPointerUp)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let found: typeof hoveredKf = null
    for (let i = trackList.length - 1; i >= 0; i--) {
      const track = trackList[i]
      const trackY = RULER_HEIGHT + i * TRACK_HEIGHT
      const trackKfs = keyframes.filter(k => k.track === track)
      for (const kf of trackKfs) {
        const kfX = (kf.time / safeDuration) * rect.width
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

  const selectedCfg = selectedTrack ? trackConfig(selectedTrack) : null

  return (
    <div
      className="flex flex-col relative"
      style={{
        height: panelHeight,
        background: PANEL_SURFACE,
        borderTop: `1px solid ${PANEL_BORDER}`,
      }}
    >
      <ResizeHandle onResize={handleResize} />
      <TimelineHonestyBadges demoMode={demoMode} isEmptyLive={isEmptyLive} />
      <TimelineToolbar
        isPlaying={isPlaying}
        isLooping={isLooping}
        currentTime={currentTime}
        duration={duration}
        fps={fps}
        showFpsMenu={showFpsMenu}
        keyframeCount={keyframes.length}
        selectedTrack={selectedTrack}
        selectedCfg={selectedCfg}
        onSeekStart={() => { timeRef.current = 0; onTimeChange(0) }}
        onSeekEnd={() => { timeRef.current = safeDuration; onTimeChange(safeDuration) }}
        onPlayPause={handlePlayPause}
        onToggleLoop={() => setIsLooping(v => !v)}
        onAddKeyframe={addKeyframeAtCurrentTime}
        onToggleFpsMenu={() => setShowFpsMenu(v => !v)}
        onSelectFps={(next) => { setFps(next); setShowFpsMenu(false) }}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden relative">
        <div
          className="shrink-0 z-10"
          style={{
            width: LABEL_WIDTH,
            background: PANEL_SURFACE,
            borderRight: `1px solid ${PANEL_BORDER_SUBTLE}`,
          }}
        >
          <div style={{ height: RULER_HEIGHT, borderBottom: `1px solid ${PANEL_BORDER_SUBTLE}` }} />

          {isEmptyLive && (
            <div
              className="flex items-center px-3 text-[11px] text-[var(--aethel-text-tertiary)]"
              style={{ height: TRACK_HEIGHT * 2 }}
              data-timeline-empty-tracks="true"
            >
              No tracks bound to this project sequence.
            </div>
          )}
          {trackList.map(track => {
            const cfg = trackConfig(track)
            const isSelected = selectedTrack === track
            const kfCount = keyframes.filter(k => k.track === track).length

            return (
              <div
                key={track}
                className="flex items-center gap-2 px-3 cursor-pointer transition-all duration-100"
                style={{
                  height: TRACK_HEIGHT,
                  background: isSelected ? trackRgba(cfg, 0.08) : 'transparent',
                  borderBottom: `1px solid ${PANEL_BORDER_SUBTLE}`,
                  borderLeft: `2px solid ${isSelected ? cfg.color : 'transparent'}`,
                }}
                onClick={() => setSelectedTrack(isSelected ? null : track)}
              >
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
                  style={{ color: isSelected ? TEXT_PRIMARY : MUTED_ICON }}
                >
                  {cfg.label}
                </span>
                {kfCount > 0 && (
                  <span
                    className="text-[9px] font-mono rounded px-1"
                    style={{ color: cfg.color, background: trackRgba(cfg, 0.12) }}
                  >
                    {kfCount}
                  </span>
                )}
              </div>
            )
          })}
        </div>

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

          {hoveredKf && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2"
              style={{ left: hoveredKf.x, top: hoveredKf.y - 8, transform: 'translate(-50%, -100%)' }}
            >
              <div
                className="px-3 py-2 rounded-lg"
                style={{
                  background: PANEL_SURFACE,
                  border: trackBorder(trackConfig(hoveredKf.kf.track), 0.25),
                  boxShadow: SHADOW_TOOLTIP,
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: trackConfig(hoveredKf.kf.track).color }}
                >
                  {hoveredKf.kf.track}
                </div>
                <div className="text-[10px] font-mono" style={{ color: TEXT_PRIMARY }}>
                  t = {formatTimecode(hoveredKf.kf.time, fps)}
                </div>
                {hoveredKf.kf.value !== null && typeof hoveredKf.kf.value === 'object' && (
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: MUTED_ICON }}>
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

export { Timeline3D as Timeline }
