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

/**
 * Map Fusion cinematic intent → Sequencer timeline (scaffold).
 * Does not call video APIs — engine timeline is the shoot path.
 */
export function planCinematicDirectorShoot(input: {
  intent: CinematicDirectorIntent
  timeline?: SequencerTimeline
}): CinematicDirectorPlan {
  const timeline = input.timeline ?? buildDemoCutsceneTimeline()
  return {
    intent: input.intent,
    timeline,
    shootBackend: 'engine_sequencer',
    notes: [
      'Cinematic Director #63: Fusion directs; Sequencer + engine capture shoot',
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
