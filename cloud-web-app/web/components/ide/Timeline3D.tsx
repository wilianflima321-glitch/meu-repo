'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Scissors, Plus, Layers, Clock, KeyRound } from 'lucide-react'

interface TimelineProps {
  duration?: number
  currentTime?: number
  onTimeChange?: (time: number) => void
  onPlay?: () => void
  onPause?: () => void
}

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
    { id: '1', time: 0, track: 'position', value: { x: 0, y: 0, z: 0 } },
    { id: '2', time: 2, track: 'position', value: { x: 10, y: 5, z: 0 } },
    { id: '3', time: 4, track: 'rotation', value: { x: 0, y: 90, z: 0 } },
    { id: '4', time: 6, track: 'scale', value: { x: 1, y: 1, z: 1 } },
  ])
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        onTimeChange(Math.min(currentTime + 0.1, duration))
        if (currentTime >= duration) {
          setIsPlaying(false)
        }
      }, 100)
    }
    return () => clearInterval(interval)
  }, [isPlaying, currentTime, duration, onTimeChange])

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
        {/* Track Names */}
        <div className="w-32 border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
          {tracks.map((track) => (
            <div
              key={track}
              className={`h-8 flex items-center px-3 text-xs cursor-pointer transition-colors ${
                selectedTrack === track ?
                   'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
              onClick={() => setSelectedTrack(track)}
            >
              {track}
            </div>
          ))}
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
            {/* Playhead Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--aethel-error)] z-10"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[var(--aethel-error)] transform rotate-45" />
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div key={track} className="h-8 border-b border-[var(--aethel-border-secondary)] relative">
                {/* Keyframes for this track */}
                {keyframes
                  .filter(kf => kf.track === track)
                  .map((kf) => (
                    <div
                      key={kf.id}
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[var(--aethel-primary)] rounded-sm cursor-pointer hover:brightness-110"
                      style={{ left: `${(kf.time / duration) * 100}%` }}
                      title={`${track}: ${JSON.stringify(kf.value)}`}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { Timeline3D as Timeline }
