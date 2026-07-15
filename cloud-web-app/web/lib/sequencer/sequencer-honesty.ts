/**
 * Letter cg — Sequencer / Cinematic Director honesty.
 * Letter cl — soak-gated sequencerPlayReady (play + viewport apply).
 */

import {
  SEQUENCER_APPLY_DEEPEN_WIRED,
  SEQUENCER_DELTA_LETTER,
  proveSequencerApplyDeepen,
} from '@/lib/sequencer/sequencer-apply-deepen'
import { CINEMATIC_DIRECTOR_BRIDGE_WIRED } from '@/lib/sequencer/cinematic-director-bridge'
import { SEQUENCER_IDE_PANEL_WIRED, createSequencerIdePanelScaffold } from '@/lib/sequencer/ide-panel-scaffold'
import {
  SEQUENCER_PLAY_WIRE_WIRED,
  proveSequencerPlaySoak,
} from '@/lib/sequencer/sequencer-play-wire'
import { SEQUENCER_VIEWPORT_WIRE_WIRED } from '@/lib/sequencer/sequencer-viewport-wire'

export const SEQUENCER_DELTA_WIRED = true as const

let cachedPlaySoak: boolean | undefined

export interface SequencerDeltaHonestyReport {
  letter: typeof SEQUENCER_DELTA_LETTER | 'cl'
  wired: boolean
  applyDeepenReady: boolean
  /** Soak-gated (cl) — playhead tick + viewport camera/light apply. */
  sequencerPlayReady: boolean
  cinematicDirectorBridgeReady: boolean
  idePanelScaffoldReady: boolean
  ueSequencerParityAllowed: false
  finalFootageClaimAllowed: false
  notes: string[]
}

export function proveSequencerPlayReady(force = false): boolean {
  if (!force && cachedPlaySoak === true) return true
  const r = proveSequencerPlaySoak()
  cachedPlaySoak = r.passed
  return r.passed
}

export function probeSequencerDeltaHonesty(input?: {
  applyPassed?: boolean
  playSoakPassed?: boolean
}): SequencerDeltaHonestyReport {
  const apply = input?.applyPassed ?? proveSequencerApplyDeepen().passed
  const sequencerPlayReady =
    input?.playSoakPassed ?? proveSequencerPlayReady()
  const panel = createSequencerIdePanelScaffold()
  const letter = sequencerPlayReady ? ('cl' as const) : SEQUENCER_DELTA_LETTER
  return {
    letter,
    wired:
      SEQUENCER_DELTA_WIRED &&
      SEQUENCER_APPLY_DEEPEN_WIRED &&
      CINEMATIC_DIRECTOR_BRIDGE_WIRED &&
      SEQUENCER_IDE_PANEL_WIRED &&
      SEQUENCER_PLAY_WIRE_WIRED &&
      SEQUENCER_VIEWPORT_WIRE_WIRED,
    applyDeepenReady: apply,
    sequencerPlayReady,
    cinematicDirectorBridgeReady: CINEMATIC_DIRECTOR_BRIDGE_WIRED,
    idePanelScaffoldReady: SEQUENCER_IDE_PANEL_WIRED && panel.schema === 'aethel.sequencer.ide.v1',
    ueSequencerParityAllowed: false,
    finalFootageClaimAllowed: false,
    notes: [
      sequencerPlayReady
        ? 'Sequencer play/scrub + viewport apply CLOSED (letter cl)'
        : 'Sequencer camera/light/event apply + IDE panel + #63 bridge CLOSED (letter cg); play soak pending',
      'Honest competitor: Unreal Sequencer still more mature',
      'Final footage / Director Mode GPU shoot HELD',
      'Zero-UI in game runtime — Studio IDE panel only',
    ],
  }
}
