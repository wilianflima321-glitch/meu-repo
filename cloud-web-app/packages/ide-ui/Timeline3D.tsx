'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, Scissors, Plus, Layers, Clock, KeyRound } from 'lucide-react'

interface TimelineProps {
  duration?: number
  currentTime?: number
  onTimeChange?: (time: number) => void
  onPlay?: () => void
  onPause?: () => void
}

// Semantic track colors — same convention as DaVinci Resolve / Unreal Sequencer.
// Each track type gets a persistent, recognizable hue so users build muscle memory.
const TRACK_COLORS: Record<string, string> = {
  position:   '#60a5fa', // Blue — spatial movement
  rotation:   '#c084fc', // Purple — angular change
  scale:      '#4ade80', // Green — size change
  visibility: '#facc15', // Amber — show/hide
  material:   '#fb923c', // Orange — surface / shader
}
const DEFAULT_TRACK_COLOR = 'var(--aethel-primary-light)'

interface KeyframeData {
  id: string
  time: number
  track: string
  value: unknown
}

export function Timeline3D({
  duration = 10,
  currentTime = 0,
  onTimeChange = () => undefined,
  onPlay = () => undefined,
  onPause = () => undefined,
}: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [keyframes, setKeyframes] = useState<KeyframeData[]>([
    { id: '1', time: 0, track: 'position',   value: { x: 0,  y: 0, z: 0 } },
    { id: '2', time: 2, track: 'position',   value: { x: 10, y: 5, z: 0 } },
    { id: '3', time: 4, track: 'rotation',   value: { x: 0,  y: 90, z: 0 } },
    { id: '4', time: 6, track: 'scale',      value: { x: 1,  y: 1, z: 1 } },
  ])
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)

  // ── Playhead via ref — zero React re-renders during playback ──────────────
  // We write directly to the DOM node's style.left so the 3D viewport's
  // React tree is completely untouched while the timeline is scrubbing.
  const playheadRef       = useRef<HTMLDivElement>(null)
  const timelineRef       = useRef<HTMLDivElement>(null)
  const rafRef            = useRef<number | null>(null)
  const startTimeRef      = useRef<number>(0)   // performance.now() when play started
  const startPositionRef  = useRef<number>(currentTime) // time value when play started
  const isPlayingRef      = useRef(false)

  // Keep isPlayingRef in sync with state so the RAF closure reads the latest value.
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const updatePlayhead = useCallback((t: number) => {
    if (playheadRef.current && duration > 0) {
      playheadRef.current.style.left = `${Math.min((t / duration) * 100, 100)}%`
    }
  }, [duration])

  // Sync playhead when currentTime prop changes from outside (e.g. scrub).
  useEffect(() => { updatePlayhead(currentTime) }, [currentTime, updatePlayhead])

  // requestAnimationFrame loop — runs only while playing, off the React tree.
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }
    startTimeRef.current     = performance.now()
    startPositionRef.current = currentTime

    const tick = (now: number) => {
      if (!isPlayingRef.current) return
      const elapsed = (now - startTimeRef.current) / 1000
      const t = startPositionRef.current + elapsed
      updatePlayhead(t)
      if (t >= duration) {
        setIsPlaying(false)
        onTimeChange(duration)
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    onTimeChange(percentage * duration)
  }

  const tracks = ['position', 'rotation', 'scale', 'visibility', 'material']

  return (
    <div className="flex h-40 flex-col bg-[var(--aethel-surface-primary)] border-t border-[var(--aethel-border-primary)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-1.5 rounded-lg transition-colors ${
              isPlaying ?
                 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
                : 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onTimeChange(0)}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onTimeChange(duration)}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Fim"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-[var(--aethel-border-primary)]" />

          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Add Keyframe"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Cortar"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Add Track"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
            <Clock className="w-3 h-3" />
            <span className="font-mono">{currentTime.toFixed(2)}s / {duration.toFixed(2)}s</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
            <Layers className="w-3 h-3" />
            <span>{keyframes.length} keyframes</span>
          </div>
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="flex-1 flex overflow-auto">
        {/* Track Labels with semantic color dots */}
        <div className="w-32 border-r flex-shrink-0" style={{ borderColor: 'var(--aethel-border-primary)', background: 'color-mix(in srgb, var(--aethel-surface-secondary) 50%, transparent)' }}>
          {/* Spacer for ruler row */}
          <div className="h-6 border-b" style={{ borderColor: 'var(--aethel-border-primary)' }} />
          {tracks.map((track) => {
            const trackColor = TRACK_COLORS[track] ?? DEFAULT_TRACK_COLOR
            const isSelected = selectedTrack === track
            return (
              <div
                key={track}
                className="h-8 flex items-center gap-2 px-3 text-xs cursor-pointer transition-colors"
                style={{
                  background: isSelected
                    ? `color-mix(in srgb, ${trackColor} 15%, transparent)`
                    : 'transparent',
                  color: isSelected ? 'var(--aethel-text-primary)' : 'var(--aethel-text-secondary)',
                }}
                onClick={() => setSelectedTrack(track)}
              >
                {/* Semantic color dot */}
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: trackColor,
                    flexShrink: 0,
                    boxShadow: isSelected ? `0 0 6px ${trackColor}` : 'none',
                  }}
                />
                <span className="truncate">{track}</span>
              </div>
            )
          })}
        </div>

        {/* Timeline Area */}
        <div className="flex-1 relative">
          {/* Time Ruler */}
          <div className="h-6 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] flex">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="flex-1 border-l border-[var(--aethel-border-secondary)]">
                <span className="text-xs text-[var(--aethel-text-quaternary)] ml-1">{(i * 0.5).toFixed(1)}s</span>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            ref={timelineRef}
            className="absolute inset-0 cursor-pointer"
            onClick={handleTimelineClick}
          >
            {/* Playhead Line — positioned by ref, never by React state */}
            <div
              ref={playheadRef}
              aria-label="Playhead"
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{
                left: `${(currentTime / duration) * 100}%`,
                background: 'var(--aethel-error)',
                pointerEvents: 'none',
              }}
            >
              <div
                className="absolute -top-0.5 -left-1.5"
                style={{
                  width: 12,
                  height: 12,
                  background: 'var(--aethel-error)',
                  clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                }}
              />
            </div>

            {/* Tracks with semantic colors */}
            {tracks.map((track) => {
              const trackColor = TRACK_COLORS[track] ?? DEFAULT_TRACK_COLOR
              return (
                <div key={track} className="h-8 border-b relative" style={{ borderColor: 'var(--aethel-border-secondary)' }}>
                  {/* Track tint */}
                  <div
                    className="absolute inset-0"
                    style={{ background: trackColor, opacity: selectedTrack === track ? 0.07 : 0.03 }}
                  />
                  {/* Keyframes */}
                  {keyframes
                    .filter(kf => kf.track === track)
                    .map((kf) => (
                      <div
                        key={kf.id}
                        title={`${track}: ${JSON.stringify(kf.value)}`}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translate(-50%, -50%) rotate(45deg)',
                          left: `${(kf.time / duration) * 100}%`,
                          width: 10,
                          height: 10,
                          background: trackColor,
                          borderRadius: 2,
                          cursor: 'pointer',
                          boxShadow: `0 0 6px ${trackColor}88`,
                        }}
                      />
                    ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Timeline3D as Timeline }
