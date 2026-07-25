/**
 * Letter cg — Sequencer + Cinematic Director Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  applySequencerAtTime,
  buildDemoCutsceneTimeline,
  proveSequencerApplyDeepen,
  planCinematicDirectorShoot,
  sampleDirectorPlanAt,
  createSequencerIdePanelScaffold,
  probeSequencerDeltaHonesty,
} from '@/lib/sequencer'

describe('sequencer delta (cg)', () => {
  it('apply deepen samples camera / light / events', () => {
    const proved = proveSequencerApplyDeepen()
    expect(proved.passed).toBe(true)
    expect(proved.events).toBeGreaterThanOrEqual(1)

    const tl = buildDemoCutsceneTimeline()
    const mid = applySequencerAtTime(tl, 1500, 0)
    expect(mid.camera!.position.x).toBeCloseTo(2, 5)
    // Light keyframe lands exactly at 1500 → hold value 1.5
    expect(mid.lights[0]!.intensity).toBeCloseTo(1.5, 5)
    const quarter = applySequencerAtTime(tl, 750, 0)
    expect(quarter.lights[0]!.intensity).toBeCloseTo(0.85, 5)
    expect(mid.eventsFired.some((e) => e.name === 'music_stinger')).toBe(true)
  })

  it('Cinematic Director #63 plans engine_sequencer shoot (not Veo)', () => {
    const plan = planCinematicDirectorShoot({ intent: 'action' })
    expect(plan.shootBackend).toBe('engine_sequencer')
    const snap = sampleDirectorPlanAt(plan, 500, 0)
    expect(snap.camera).not.toBeNull()
  })

  it('Director intents produce distinct timeline grammars (not rename theater)', () => {
    const establishing = planCinematicDirectorShoot({ intent: 'establishing' })
    const action = planCinematicDirectorShoot({ intent: 'action' })
    const dialogue = planCinematicDirectorShoot({ intent: 'dialogue' })
    expect(establishing.timeline.id).not.toBe(action.timeline.id)
    expect(action.timeline.durationMs).toBeLessThan(establishing.timeline.durationMs)
    expect(dialogue.timeline.id).toBe('director-dialogue')
    const actionFovEnd = action.timeline.tracks
      .flatMap((t) => t.clips)
      .flatMap((c) => c.curves)
      .find((c) => c.property === 'camera.fov')
      ?.keyframes.at(-1)?.value
    const establishFovEnd = establishing.timeline.tracks
      .flatMap((t) => t.clips)
      .flatMap((c) => c.curves)
      .find((c) => c.property === 'camera.fov')
      ?.keyframes.at(-1)?.value
    expect(actionFovEnd).not.toBe(establishFovEnd)
  })

  it('IDE panel scaffold forbids final footage claim', () => {
    const panel = createSequencerIdePanelScaffold()
    expect(panel.schema).toBe('aethel.sequencer.ide.v1')
    expect(panel.finalFootageClaimAllowed).toBe(false)
    expect(panel.directorModeGpuSoakHeld).toBe(true)
  })

  it('honesty: apply ready; UE Sequencer parity HELD', () => {
    const honesty = probeSequencerDeltaHonesty({ playSoakPassed: false })
    expect(honesty.applyDeepenReady).toBe(true)
    expect(honesty.cinematicDirectorBridgeReady).toBe(true)
    expect(honesty.idePanelScaffoldReady).toBe(true)
    expect(honesty.sequencerPlayReady).toBe(false)
    expect(honesty.ueSequencerParityAllowed).toBe(false)
    expect(honesty.finalFootageClaimAllowed).toBe(false)
  })
})
