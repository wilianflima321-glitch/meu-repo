/**
 * Letter cg — Sequencer IDE panel scaffold.
 * Letter cl — usable scrub/play applying camera/lights/events to viewport.
 * IDE-only; final footage claim forbidden. Zero-UI in game runtime.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createSequencerIdePanelScaffold,
  createSequencerPlayController,
  createSequencerViewportMockTargets,
  planCinematicDirectorShoot,
  proveSequencerPlayReady,
} from '@/lib/sequencer'

export function SequencerIdePanel() {
  const scaffold = useMemo(() => createSequencerIdePanelScaffold(), [])
  const mock = useMemo(() => createSequencerViewportMockTargets(), [])
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

  const director = useMemo(
    () =>
      planCinematicDirectorShoot({
        intent: 'establishing',
        timeline: scaffold.timeline,
      }),
    [scaffold.timeline],
  )

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

  return (
    <div
      className="flex h-full flex-col gap-3 p-4"
      data-testid="sequencer-ide-panel-cl"
      data-letter="cl"
      data-sequencer-play-ready={playReady ? 'true' : 'false'}
    >
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--aethel-text-primary)]">
          {scaffold.title}
        </h2>
        <p className="text-xs text-[var(--aethel-text-secondary)]">
          Cutscene timeline — scrub/play applies camera / lights / events.
          Cinematic Director #63 engine shoot. Final footage [HELD].
        </p>
      </header>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayPause}
          className="rounded border border-[var(--aethel-border)] px-3 py-1 text-xs text-[var(--aethel-text-primary)]"
          data-testid="sequencer-play-toggle"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            const r = controller.stop()
            syncFromTick(r)
            setIsPlaying(false)
          }}
          className="rounded border border-[var(--aethel-border)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]"
          data-testid="sequencer-stop"
        >
          Stop
        </button>
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
          {playReady ? 'play ready' : 'play soak pending'} · viewport apply
        </span>
      </div>

      <label className="flex flex-col gap-1 text-xs text-[var(--aethel-text-secondary)]">
        Playhead ({Math.round(timeMs)} ms)
        <input
          type="range"
          min={0}
          max={scaffold.timeline.durationMs}
          value={timeMs}
          onChange={(e) => onScrub(Number(e.target.value))}
          className="w-full"
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
