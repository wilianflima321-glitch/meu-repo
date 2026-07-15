/**
 * Letter cl — Sequencer IDE play / scrub deepen (Zero-MVP).
 * Playhead tick + keyframe apply into viewport targets.
 * Final footage / UE Sequencer maturity remain HELD.
 */

import type { SequencerPlayhead, SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  createSequencerPlayhead,
  seekSequencerPlayhead,
  stepSequencerPlayhead,
} from '@/lib/sequencer/core/playhead'
import {
  applySequencerAtTime,
  buildDemoCutsceneTimeline,
  type SequencerApplySnapshot,
} from '@/lib/sequencer/sequencer-apply-deepen'
import {
  SEQUENCER_VIEWPORT_WIRE_WIRED,
  applySequencerSnapshotToViewport,
  createSequencerViewportMockTargets,
  type SequencerViewportApplyResult,
  type SequencerViewportTargets,
} from '@/lib/sequencer/sequencer-viewport-wire'

export const SEQUENCER_PLAY_WIRE_LETTER = 'cl' as const
export const SEQUENCER_PLAY_WIRE_WIRED = true as const

export interface SequencerPlayTickResult {
  playhead: SequencerPlayhead
  snapshot: SequencerApplySnapshot
  apply: SequencerViewportApplyResult
  /** True when playback hit range end and stopped (non-loop). */
  ended: boolean
}

/**
 * IDE play controller — step/seek playhead and apply camera/lights/events.
 * Not a game-runtime UI surface.
 */
export class SequencerPlayController {
  readonly timeline: SequencerTimeline
  private playhead: SequencerPlayhead
  private prevTimeMs: number
  private targets: SequencerViewportTargets | null

  constructor(
    timeline: SequencerTimeline = buildDemoCutsceneTimeline(),
    targets: SequencerViewportTargets | null = null,
  ) {
    this.timeline = timeline
    this.playhead = createSequencerPlayhead(timeline)
    this.prevTimeMs = this.playhead.timeMs
    this.targets = targets
  }

  getPlayhead(): SequencerPlayhead {
    return this.playhead
  }

  setTargets(targets: SequencerViewportTargets | null): void {
    this.targets = targets
  }

  play(): void {
    this.playhead = { ...this.playhead, isPlaying: true }
  }

  pause(): void {
    this.playhead = { ...this.playhead, isPlaying: false }
  }

  stop(): SequencerPlayTickResult {
    this.playhead = {
      ...this.playhead,
      isPlaying: false,
      timeMs: this.timeline.range.startMs,
    }
    this.prevTimeMs = this.playhead.timeMs - 1
    return this.seek(this.playhead.timeMs)
  }

  seek(timeMs: number): SequencerPlayTickResult {
    const prev = this.prevTimeMs
    this.playhead = seekSequencerPlayhead(this.timeline, this.playhead, timeMs)
    const snapshot = applySequencerAtTime(this.timeline, this.playhead.timeMs, prev)
    const apply = applySequencerSnapshotToViewport(snapshot, this.targets)
    this.prevTimeMs = this.playhead.timeMs
    return {
      playhead: this.playhead,
      snapshot,
      apply,
      ended: false,
    }
  }

  /**
   * Advance playhead by deltaMs when playing; always re-apply at current time.
   */
  tick(deltaMs: number): SequencerPlayTickResult {
    const prev = this.playhead.timeMs
    let ended = false
    if (this.playhead.isPlaying) {
      const next = stepSequencerPlayhead(this.timeline, this.playhead, deltaMs)
      if (
        !this.playhead.loop &&
        next.timeMs >= this.timeline.range.endMs &&
        prev < this.timeline.range.endMs
      ) {
        ended = next.timeMs >= this.timeline.range.endMs
      }
      if (
        !this.playhead.loop &&
        next.timeMs >= this.timeline.range.endMs
      ) {
        this.playhead = { ...next, isPlaying: false, timeMs: this.timeline.range.endMs }
        ended = true
      } else {
        this.playhead = next
      }
    }
    const snapshot = applySequencerAtTime(
      this.timeline,
      this.playhead.timeMs,
      this.playhead.isPlaying || ended ? prev : this.prevTimeMs,
    )
    const apply = applySequencerSnapshotToViewport(snapshot, this.targets)
    this.prevTimeMs = this.playhead.timeMs
    return { playhead: this.playhead, snapshot, apply, ended }
  }
}

export function createSequencerPlayController(
  timeline?: SequencerTimeline,
  targets?: SequencerViewportTargets | null,
): SequencerPlayController {
  return new SequencerPlayController(timeline, targets ?? null)
}

export interface SequencerPlaySoakResult {
  letter: typeof SEQUENCER_PLAY_WIRE_LETTER
  passed: boolean
  libWired: boolean
  playAdvanced: boolean
  cameraApplied: boolean
  lightApplied: boolean
  eventsFired: boolean
  scrubSeekOk: boolean
  zeroUiWhenUnbound: boolean
  framesProven: number
  notes: string[]
}

/**
 * Play + scrub soak — gates `sequencerPlayReady`.
 * Proves playhead tick, curve interpolate, camera/light apply, events.
 */
export function proveSequencerPlaySoak(): SequencerPlaySoakResult {
  const notes: string[] = []
  const mock = createSequencerViewportMockTargets()
  const ctrl = createSequencerPlayController(buildDemoCutsceneTimeline(), mock.targets)

  // Zero-UI when unbound
  const unbound = createSequencerPlayController()
  unbound.play()
  const unboundTick = unbound.tick(100)
  const zeroUiWhenUnbound = unboundTick.apply.zeroUiUnavailable === true

  ctrl.seek(0)
  ctrl.play()
  let frames = 0
  let sawAdvance = false
  let lastTime = 0
  // ~16ms frames across 1.5s of cutscene
  for (let i = 0; i < 100; i++) {
    const r = ctrl.tick(16)
    frames += 1
    if (r.playhead.timeMs > lastTime) sawAdvance = true
    lastTime = r.playhead.timeMs
    if (r.ended) break
  }

  const mid = ctrl.seek(1500)
  const cameraApplied =
    mid.apply.cameraApplied &&
    mock.camera.position.x > 0 &&
    mock.camera.fov < 50
  const lightApplied = mid.apply.lightsApplied >= 1 && mock.light.intensity > 0.2
  const eventsFired =
    mock.events.some((e) => e.name === 'music_stinger') ||
    mid.snapshot.eventsFired.some((e) => e.name === 'music_stinger')

  const scrub = ctrl.seek(750)
  const scrubSeekOk =
    scrub.playhead.timeMs === 750 &&
    scrub.snapshot.camera != null &&
    scrub.snapshot.lights[0] != null &&
    scrub.snapshot.lights[0]!.intensity > 0.2 &&
    scrub.snapshot.lights[0]!.intensity < 1.5

  const passed =
    SEQUENCER_PLAY_WIRE_WIRED &&
    SEQUENCER_VIEWPORT_WIRE_WIRED &&
    sawAdvance &&
    cameraApplied &&
    lightApplied &&
    eventsFired &&
    scrubSeekOk &&
    zeroUiWhenUnbound &&
    frames >= 8

  if (passed) {
    notes.push(
      'sequencerPlayReady soak CLOSED (letter cl) — playhead tick + viewport camera/light apply proven',
    )
  } else {
    notes.push('sequencerPlayReady pending soak')
  }
  notes.push('UE Sequencer maturity / final footage / Director Mode GPU soak HELD')
  notes.push('Zero-UI in game runtime — IDE Studio panel only')

  return {
    letter: SEQUENCER_PLAY_WIRE_LETTER,
    passed,
    libWired: SEQUENCER_PLAY_WIRE_WIRED && SEQUENCER_VIEWPORT_WIRE_WIRED,
    playAdvanced: sawAdvance,
    cameraApplied,
    lightApplied,
    eventsFired,
    scrubSeekOk,
    zeroUiWhenUnbound,
    framesProven: frames,
    notes,
  }
}
