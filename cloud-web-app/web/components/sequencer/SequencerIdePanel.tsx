/**
 * Letter cg — Sequencer IDE panel scaffold.
 * Letter cl — usable scrub/play applying camera/lights/events to viewport.
 * IDE-only; final footage claim forbidden. Zero-UI in game runtime.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Square, Film, Clapperboard, RotateCcw, Clock } from 'lucide-react'
import {
  createSequencerIdePanelScaffold,
  createSequencerPlayController,
  createSequencerViewportMockTargets,
  planCinematicDirectorShoot,
  proveSequencerPlayReady,
  type CinematicDirectorIntent,
} from '@/lib/sequencer'

export type SequencerIdePanelProps = {
  /** Director Mode intent — must rebuild timeline/controller (not cosmetic chrome). */
  intent?: CinematicDirectorIntent
}

export function SequencerIdePanel({ intent = 'establishing' }: SequencerIdePanelProps = {}) {
  const mock = useMemo(() => createSequencerViewportMockTargets(), [])
  const director = useMemo(() => planCinematicDirectorShoot({ intent }), [intent])
  const scaffold = useMemo(
    () => createSequencerIdePanelScaffold(director.timeline),
    [director.timeline],
  )
  const controller = useMemo(
    () => createSequencerPlayController(scaffold.timeline, mock.targets),
    [scaffold.timeline, mock.targets],
  )

  const [timeMs, setTimeMs] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playReady, setPlayReady] = useState(false)
  const [snapFov, setSnapFov] = useState<number | null>(null)
  const [snapX, setSnapX] = useState<number | null>(null)
  const [snapLight, setSnapLight] = useState<number | null>(null)
  const [eventNames, setEventNames] = useState<string>('')
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  const syncFromTick = useCallback(
    (r: ReturnType<typeof controller.tick>) => {
      setTimeMs(r.playhead.timeMs)
      setIsPlaying(r.playhead.isPlaying)
      setSnapFov(r.snapshot.camera?.fov ?? null)
      setSnapX(r.snapshot.camera?.position.x ?? null)
      setSnapLight(r.snapshot.lights[0]?.intensity ?? null)
      setEventNames(
        r.snapshot.eventsFired.map((e) => e.name).join(', ') ||
          (mock.events.length
            ? mock.events.map((e) => e.name).slice(-3).join(', ')
            : ''),
      )
      if (r.ended) setIsPlaying(false)
    },
    [controller, mock.events],
  )

  useEffect(() => {
    const r = controller.seek(0)
    syncFromTick(r)
    setPlayReady(proveSequencerPlayReady())
  }, [controller, syncFromTick])

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
      return
    }
    const loop = (ts: number) => {
      const last = lastTsRef.current ?? ts
      const delta = Math.min(64, Math.max(0, ts - last))
      lastTsRef.current = ts
      const r = controller.tick(delta)
      syncFromTick(r)
      if (r.playhead.isPlaying) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        rafRef.current = null
        lastTsRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [isPlaying, controller, syncFromTick])

  const onScrub = (value: number) => {
    controller.pause()
    setIsPlaying(false)
    const r = controller.seek(value)
    syncFromTick(r)
  }

  const onPlayPause = () => {
    if (isPlaying) {
      controller.pause()
      setIsPlaying(false)
      return
    }
    if (timeMs >= scaffold.timeline.durationMs) {
      controller.seek(0)
    }
    controller.play()
    setIsPlaying(true)
  }

  // Helper to format ms as professional timecode 00:00.00
  const formatTimecode = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const milliseconds = Math.floor((ms % 1000) / 10)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`
  }

  return (
    <div
      className="flex h-full flex-col gap-3 p-4 bg-[var(--aethel-bg-base)] border border-[var(--aethel-glass-border)] rounded-xl"
      data-testid="sequencer-ide-panel-cl"
      data-letter="cl"
      data-director-intent={intent}
      data-timeline-id={scaffold.timeline.id}
      data-sequencer-play-ready={playReady ? 'true' : 'false'}
    >
      <header className="space-y-1 border-b border-[var(--aethel-glass-border)] pb-3">
        <h2 className="text-sm font-bold text-[var(--aethel-text-primary)] flex items-center gap-2 font-mono">
          <Clapperboard className="w-4 h-4 text-indigo-400" />
          {scaffold.timeline.label || scaffold.title}
        </h2>
        <p className="text-xs text-[var(--aethel-text-secondary)] leading-relaxed">
          Cutscene timeline — scrub/play applies camera / lights / events.
          Intent <strong className="text-[var(--aethel-neon-cyan)] uppercase font-mono">{intent}</strong>. Cinematic Director #63 engine shoot.
        </p>
      </header>

      {/* Transport Controls */}
      <div className="flex items-center gap-2 bg-[var(--aethel-surface-primary)] border border-[var(--aethel-glass-border)] rounded-lg p-1.5">
        <button
          type="button"
          onClick={onPlayPause}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
            isPlaying
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-[var(--aethel-neon-cyan)]/20 text-[var(--aethel-neon-cyan)] border border-[var(--aethel-neon-cyan)]/40 hover:bg-[var(--aethel-neon-cyan)]/30'
          }`}
          data-testid="sequencer-play-toggle"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            const r = controller.stop()
            syncFromTick(r)
            setIsPlaying(false)
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--aethel-border-subtle)] text-xs font-mono text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
          data-testid="sequencer-stop"
        >
          <Square className="w-3.5 h-3.5" />
          Stop
        </button>
        <button
          type="button"
          onClick={() => onScrub(0)}
          className="p-1.5 rounded-lg border border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
          title="Rewind to start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-2 font-mono text-xs text-[var(--aethel-neon-cyan)] bg-[var(--aethel-surface-secondary)] px-2.5 py-1 rounded-md border border-[var(--aethel-glass-border)]">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTimecode(timeMs)}</span>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-xs text-[var(--aethel-text-secondary)] font-mono">
        <span className="flex justify-between items-center text-[10px] text-[var(--aethel-text-tertiary)] uppercase tracking-wider">
          <span>Playhead Position</span>
          <span>{Math.round(timeMs)} ms / {scaffold.timeline.durationMs} ms</span>
        </span>
        <input
          type="range"
          min={0}
          max={scaffold.timeline.durationMs}
          value={timeMs}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="w-full accent-[var(--aethel-neon-cyan)] cursor-pointer h-1.5 bg-[var(--aethel-surface-tertiary)] rounded-lg"
          data-testid="sequencer-scrub"
        />
      </label>

      <dl className="grid grid-cols-2 gap-2 text-xs text-[var(--aethel-text-primary)]">
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Camera FOV</dt>
          <dd data-testid="sequencer-fov">{snapFov?.toFixed(1) ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Camera X</dt>
          <dd data-testid="sequencer-cam-x">{snapX?.toFixed(2) ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Light intensity</dt>
          <dd data-testid="sequencer-light">{snapLight?.toFixed(2) ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Applied intensity</dt>
          <dd>{mock.light.intensity.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Events</dt>
          <dd data-testid="sequencer-events">{eventNames || '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--aethel-text-secondary)]">Shoot backend</dt>
          <dd>{director.shootBackend}</dd>
        </div>
      </dl>

      <p className="mt-auto text-[10px] text-[var(--aethel-text-tertiary)]">
        UE Sequencer maturity / final footage / Director Mode GPU soak remain
        [HELD]. Honest: Unreal Sequencer still ahead. Game runtime: Zero-UI.
      </p>
    </div>
  )
}

export default SequencerIdePanel
