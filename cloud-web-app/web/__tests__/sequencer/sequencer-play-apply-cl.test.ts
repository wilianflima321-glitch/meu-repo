/**
 * Letter cl — Sequencer IDE play / apply deepen Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  applySequencerAtTime,
  applySequencerSnapshotToViewport,
  bindSequencerViewportTargets,
  buildDemoCutsceneTimeline,
  createSequencerPlayController,
  createSequencerViewportMockTargets,
  evaluateSequencerCurve,
  getSequencerViewportTargets,
  probeSequencerDeltaHonesty,
  proveSequencerPlayReady,
  proveSequencerPlaySoak,
  SEQUENCER_PLAY_WIRE_LETTER,
  SEQUENCER_VIEWPORT_WIRE_LETTER,
} from '@/lib/sequencer'

describe('sequencer play / apply deepen (cl)', () => {
  it('evaluateSequencerCurve ease-in-out used by apply at mid FOV', () => {
    const tl = buildDemoCutsceneTimeline()
    const cam = tl.tracks.find((t) => t.id === 'trk-cam')!
    const fovCurve = cam.clips[0]!.curves!.find((c) => c.property === 'camera.fov')!
    const eased = evaluateSequencerCurve(fovCurve, 1500)
    const snap = applySequencerAtTime(tl, 1500, 0)
    expect(snap.camera!.fov).toBeCloseTo(eased, 5)
    expect(snap.camera!.fov).toBeLessThan(50)
    expect(snap.camera!.position.y).toBeGreaterThan(1.6)
    expect(snap.camera!.lookAt.x).toBeCloseTo(0.5, 5)
  })

  it('viewport wire applies camera + light; Zero-UI when unbound', () => {
    const tl = buildDemoCutsceneTimeline()
    const snap = applySequencerAtTime(tl, 1500, 0)
    const unbound = applySequencerSnapshotToViewport(snap, null)
    expect(unbound.zeroUiUnavailable).toBe(true)
    expect(unbound.letter).toBe(SEQUENCER_VIEWPORT_WIRE_LETTER)

    const mock = createSequencerViewportMockTargets()
    bindSequencerViewportTargets(mock.targets)
    expect(getSequencerViewportTargets()).not.toBeNull()
    const applied = applySequencerSnapshotToViewport(snap)
    expect(applied.cameraApplied).toBe(true)
    expect(applied.lightsApplied).toBeGreaterThanOrEqual(1)
    expect(mock.camera.position.x).toBeCloseTo(2, 5)
    expect(mock.camera.fov).toBeLessThan(50)
    expect(mock.light.intensity).toBeCloseTo(1.5, 5)
    bindSequencerViewportTargets(null)
  })

  it('play controller advances playhead and applies into targets', () => {
    const mock = createSequencerViewportMockTargets()
    const ctrl = createSequencerPlayController(buildDemoCutsceneTimeline(), mock.targets)
    ctrl.play()
    const a = ctrl.tick(500)
    expect(a.playhead.timeMs).toBeGreaterThan(0)
    expect(a.apply.cameraApplied).toBe(true)
    const b = ctrl.tick(500)
    expect(b.playhead.timeMs).toBeGreaterThan(a.playhead.timeMs)
    expect(mock.events.some((e) => e.name === 'music_stinger')).toBe(true)
    const scrub = ctrl.seek(750)
    expect(scrub.playhead.timeMs).toBe(750)
    expect(scrub.snapshot.lights[0]!.intensity).toBeCloseTo(0.85, 5)
  })

  it('soak gates sequencerPlayReady; UE / footage HELD', () => {
    const soak = proveSequencerPlaySoak()
    expect(soak.letter).toBe(SEQUENCER_PLAY_WIRE_LETTER)
    expect(soak.passed).toBe(true)
    expect(soak.playAdvanced).toBe(true)
    expect(soak.cameraApplied).toBe(true)
    expect(soak.lightApplied).toBe(true)
    expect(soak.eventsFired).toBe(true)
    expect(soak.scrubSeekOk).toBe(true)
    expect(soak.zeroUiWhenUnbound).toBe(true)

    expect(proveSequencerPlayReady(true)).toBe(true)
    const honesty = probeSequencerDeltaHonesty({ playSoakPassed: true })
    expect(honesty.letter).toBe('cl')
    expect(honesty.sequencerPlayReady).toBe(true)
    expect(honesty.applyDeepenReady).toBe(true)
    expect(honesty.ueSequencerParityAllowed).toBe(false)
    expect(honesty.finalFootageClaimAllowed).toBe(false)
  })
})
