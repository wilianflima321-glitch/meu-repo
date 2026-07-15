/**
 * Letter cg — Sequencer IDE panel scaffold (Film Studio / IDE only).
 * Types + panel model — not a new marketing surface.
 */

import type { SequencerPlayhead, SequencerSelection, SequencerTimeline } from '@/lib/sequencer/core/types'
import { buildDemoCutsceneTimeline } from '@/lib/sequencer/sequencer-apply-deepen'

export const SEQUENCER_IDE_PANEL_WIRED = true as const

export interface SequencerIdePanelModel {
  schema: 'aethel.sequencer.ide.v1'
  title: string
  timeline: SequencerTimeline
  playhead: SequencerPlayhead
  selection: SequencerSelection
  /** IDE-only — never claim shipped final render. */
  finalFootageClaimAllowed: false
  directorModeGpuSoakHeld: true
  notes: string[]
}

export function createSequencerIdePanelScaffold(
  timeline?: SequencerTimeline,
): SequencerIdePanelModel {
  const tl = timeline ?? buildDemoCutsceneTimeline()
  return {
    schema: 'aethel.sequencer.ide.v1',
    title: 'Sequencer',
    timeline: tl,
    playhead: {
      timeMs: 0,
      isPlaying: false,
      playbackRate: 1,
      loop: tl.loop,
    },
    selection: {
      trackIds: [],
      clipIds: [],
      keyframeIds: [],
    },
    finalFootageClaimAllowed: false,
    directorModeGpuSoakHeld: true,
    notes: [
      'Sequencer IDE panel scrub/play CLOSED (letter cl)',
      'Cutscene timeline: camera / lights / events apply to viewport',
      'UE Sequencer maturity / final footage HELD',
    ],
  }
}
