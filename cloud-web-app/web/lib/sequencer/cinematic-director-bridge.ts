/**
 * Letter cg — Cinematic Director #63 bridge types.
 * Fusion directs set/camera; engine/GPU shoots — Veo demoted.
 * Spec align only; final footage / Director Mode GPU soak HELD.
 */

import type { SequencerTimeline } from '@/lib/sequencer/core/types'
import {
  applySequencerAtTime,
  buildDemoCutsceneTimeline,
  type SequencerApplySnapshot,
} from '@/lib/sequencer/sequencer-apply-deepen'

export const CINEMATIC_DIRECTOR_BRIDGE_WIRED = true as const
export const CINEMATIC_DIRECTOR_LETTER = 'cg' as const

export type CinematicDirectorIntent =
  | 'establishing'
  | 'dialogue'
  | 'action'
  | 'reveal'
  | 'custom'

export interface CinematicDirectorPlan {
  intent: CinematicDirectorIntent
  timeline: SequencerTimeline
  /** Engine shoot — not Veo default (#63). */
  shootBackend: 'engine_sequencer' | 'held_veo'
  notes: string[]
}

/** Intent → distinct camera/light scaffold (same schema; different shoot grammar). */
function buildTimelineForIntent(intent: CinematicDirectorIntent): SequencerTimeline {
  const base = buildDemoCutsceneTimeline()
  const cam = base.tracks.find((t) => t.id === 'trk-cam')?.clips[0]
  const light = base.tracks.find((t) => t.id === 'trk-light')?.clips[0]
  const fovCurve = cam?.curves.find((c) => c.property === 'camera.fov')
  const xCurve = cam?.curves.find((c) => c.property === 'camera.position.x')
  const intensity = light?.curves.find((c) => c.property === 'light.intensity')

  const stamp = (id: string, label: string, durationMs: number) => {
    base.id = id
    base.label = label
    base.durationMs = durationMs
    base.range = { startMs: 0, endMs: durationMs }
    if (cam) {
      cam.endMs = durationMs
      for (const curve of cam.curves) {
        for (const kf of curve.keyframes) {
          if (kf.timeMs > 0) kf.timeMs = durationMs
        }
      }
    }
    if (light) {
      light.endMs = durationMs
      for (const curve of light.curves) {
        for (const kf of curve.keyframes) {
          if (kf.timeMs > 0 && kf.timeMs !== 1500) kf.timeMs = durationMs
        }
      }
    }
  }

  switch (intent) {
    case 'establishing':
      stamp('director-establishing', 'Director · Establishing', 3000)
      if (fovCurve?.keyframes[1]) fovCurve.keyframes[1].value = 35
      if (xCurve?.keyframes[1]) xCurve.keyframes[1].value = 4
      break
    case 'dialogue':
      stamp('director-dialogue', 'Director · Dialogue', 2400)
      if (fovCurve?.keyframes[1]) fovCurve.keyframes[1].value = 42
      if (xCurve?.keyframes[1]) xCurve.keyframes[1].value = 1.2
      if (intensity?.keyframes[1]) intensity.keyframes[1].value = 1.1
      break
    case 'action':
      stamp('director-action', 'Director · Action', 1800)
      if (fovCurve?.keyframes[1]) fovCurve.keyframes[1].value = 28
      if (xCurve?.keyframes[1]) xCurve.keyframes[1].value = 6.5
      if (intensity?.keyframes[1]) intensity.keyframes[1].value = 2.2
      break
    case 'reveal':
      stamp('director-reveal', 'Director · Reveal', 3600)
      if (fovCurve?.keyframes[0]) fovCurve.keyframes[0].value = 28
      if (fovCurve?.keyframes[1]) fovCurve.keyframes[1].value = 55
      if (xCurve?.keyframes[1]) xCurve.keyframes[1].value = 2
      break
    case 'custom':
    default:
      stamp('director-custom', 'Director · Custom', 3000)
      break
  }

  return base
}

/**
 * Map Fusion cinematic intent → Sequencer timeline (scaffold).
 * Does not call video APIs — engine timeline is the shoot path.
 * Intent must change timeline identity/grammar when no override timeline is supplied.
 */
export function planCinematicDirectorShoot(input: {
  intent: CinematicDirectorIntent
  timeline?: SequencerTimeline
}): CinematicDirectorPlan {
  const timeline = input.timeline ?? buildTimelineForIntent(input.intent)
  return {
    intent: input.intent,
    timeline,
    shootBackend: 'engine_sequencer',
    notes: [
      'Cinematic Director #63: Fusion directs; Sequencer + engine capture shoot',
      `Intent=${input.intent} · timeline=${timeline.id}`,
      'Veo demoted — not default cutscene path',
      'Final footage export / Director Mode GPU soak HELD',
    ],
  }
}

export function sampleDirectorPlanAt(
  plan: CinematicDirectorPlan,
  timeMs: number,
  prevMs = -1,
): SequencerApplySnapshot {
  return applySequencerAtTime(plan.timeline, timeMs, prevMs)
}
