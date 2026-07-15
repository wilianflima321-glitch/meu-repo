/**
 * Letter cg — Sequencer apply deepen: camera transform, lights, events.
 * Letter cl — keyframe interpolate via evaluateSequencerCurve (ease modes).
 * Aligns with Cinematic Director #63 — Fusion directs; engine applies timeline.
 */

import type { SequencerClip, SequencerTimeline, SequencerTrack } from '@/lib/sequencer/core/types'
import { clampTime } from '@/lib/sequencer/core/types'
import { evaluateSequencerCurve } from '@/lib/sequencer/core/curves'

export const SEQUENCER_APPLY_DEEPEN_WIRED = true as const
export const SEQUENCER_DELTA_LETTER = 'cg' as const

export interface SequencerCameraState {
  position: { x: number; y: number; z: number }
  lookAt: { x: number; y: number; z: number }
  fov: number
  roll: number
}

export interface SequencerLightState {
  id: string
  intensity: number
  colorTemp?: number
}

export interface SequencerEventFire {
  timeMs: number
  name: string
  payload?: unknown
}

export interface SequencerApplySnapshot {
  timeMs: number
  camera: SequencerCameraState | null
  lights: SequencerLightState[]
  eventsFired: SequencerEventFire[]
}

function sampleCurve(
  track: SequencerTrack,
  property: string,
  timeMs: number,
): number | null {
  for (const clip of track.clips) {
    if (timeMs < clip.startMs || timeMs > clip.endMs) continue
    const curve = clip.curves?.find((c) => c.property === property)
    if (!curve || curve.keyframes.length === 0) continue
    return evaluateSequencerCurve(curve, timeMs)
  }
  return null
}

function eventsAt(track: SequencerTrack, prevMs: number, timeMs: number): SequencerEventFire[] {
  const fired: SequencerEventFire[] = []
  for (const clip of track.clips) {
    const name = String(clip.metadata?.eventName ?? clip.label)
    const t = clip.startMs
    if (t > prevMs && t <= timeMs) {
      fired.push({
        timeMs: t,
        name,
        payload: clip.metadata,
      })
    }
  }
  return fired
}

/**
 * Sample timeline at timeMs — camera / light / event tracks.
 * Pure; Studio/Film viewport applies snapshot to Three camera/lights.
 */
export function applySequencerAtTime(
  timeline: SequencerTimeline,
  timeMs: number,
  prevTimeMs = -1,
): SequencerApplySnapshot {
  const t = clampTime(timeMs, timeline.durationMs)
  let camera: SequencerCameraState | null = null
  const lights: SequencerLightState[] = []
  const eventsFired: SequencerEventFire[] = []

  for (const track of timeline.tracks) {
    if (track.muted || track.locked) continue
    if (track.kind === 'scene' || track.kind === 'animation') {
      const px = sampleCurve(track, 'camera.position.x', t)
      const py = sampleCurve(track, 'camera.position.y', t)
      const pz = sampleCurve(track, 'camera.position.z', t)
      const lx = sampleCurve(track, 'camera.lookAt.x', t)
      const ly = sampleCurve(track, 'camera.lookAt.y', t)
      const lz = sampleCurve(track, 'camera.lookAt.z', t)
      const fov = sampleCurve(track, 'camera.fov', t)
      const roll = sampleCurve(track, 'camera.roll', t)
      if (px != null || py != null || pz != null || fov != null) {
        camera = {
          position: {
            x: px ?? camera?.position.x ?? 0,
            y: py ?? camera?.position.y ?? 1.6,
            z: pz ?? camera?.position.z ?? 5,
          },
          lookAt: {
            x: lx ?? 0,
            y: ly ?? 0,
            z: lz ?? 0,
          },
          fov: fov ?? 50,
          roll: roll ?? 0,
        }
      }
    }
    if (track.kind === 'fx') {
      const intensity = sampleCurve(track, 'light.intensity', t)
      if (intensity != null) {
        lights.push({
          id: track.id,
          intensity,
          colorTemp: sampleCurve(track, 'light.colorTemp', t) ?? undefined,
        })
      }
    }
    if (track.kind === 'marker' || track.kind === 'subtitle') {
      eventsFired.push(...eventsAt(track, prevTimeMs, t))
    }
  }

  for (const marker of timeline.markers) {
    if (marker.timeMs > prevTimeMs && marker.timeMs <= t) {
      eventsFired.push({
        timeMs: marker.timeMs,
        name: marker.label,
      })
    }
  }

  return { timeMs: t, camera, lights, eventsFired }
}

export function buildDemoCutsceneTimeline(): SequencerTimeline {
  const camClip: SequencerClip = {
    id: 'clip-cam',
    trackId: 'trk-cam',
    label: 'Camera rail',
    sourceRef: 'local://camera',
    startMs: 0,
    endMs: 3000,
    speed: 1,
    opacity: 1,
    blendMode: 'replace',
    curves: [
      {
        id: 'c-px',
        property: 'camera.position.x',
        keyframes: [
          { id: 'k0', timeMs: 0, value: 0, interpolation: 'linear' },
          { id: 'k1', timeMs: 3000, value: 4, interpolation: 'linear' },
        ],
      },
      {
        id: 'c-py',
        property: 'camera.position.y',
        keyframes: [
          { id: 'k0y', timeMs: 0, value: 1.6, interpolation: 'ease-in-out' },
          { id: 'k1y', timeMs: 3000, value: 2.2, interpolation: 'ease-in-out' },
        ],
      },
      {
        id: 'c-pz',
        property: 'camera.position.z',
        keyframes: [
          { id: 'k0z', timeMs: 0, value: 5, interpolation: 'linear' },
          { id: 'k1z', timeMs: 3000, value: 3, interpolation: 'linear' },
        ],
      },
      {
        id: 'c-lx',
        property: 'camera.lookAt.x',
        keyframes: [
          { id: 'kl0', timeMs: 0, value: 0, interpolation: 'linear' },
          { id: 'kl1', timeMs: 3000, value: 1, interpolation: 'linear' },
        ],
      },
      {
        id: 'c-fov',
        property: 'camera.fov',
        keyframes: [
          { id: 'k2', timeMs: 0, value: 50, interpolation: 'ease-in-out' },
          { id: 'k3', timeMs: 3000, value: 35, interpolation: 'ease-in-out' },
        ],
      },
    ],
  }
  const lightClip: SequencerClip = {
    id: 'clip-light',
    trackId: 'trk-light',
    label: 'Key light',
    sourceRef: 'local://light-key',
    startMs: 0,
    endMs: 3000,
    speed: 1,
    opacity: 1,
    blendMode: 'replace',
    curves: [
      {
        id: 'c-li',
        property: 'light.intensity',
        keyframes: [
          { id: 'k4', timeMs: 0, value: 0.2, interpolation: 'linear' },
          { id: 'k5', timeMs: 1500, value: 1.5, interpolation: 'linear' },
        ],
      },
      {
        id: 'c-ct',
        property: 'light.colorTemp',
        keyframes: [
          { id: 'k6', timeMs: 0, value: 4500, interpolation: 'linear' },
          { id: 'k7', timeMs: 3000, value: 6500, interpolation: 'linear' },
        ],
      },
    ],
  }
  const eventClip: SequencerClip = {
    id: 'clip-evt',
    trackId: 'trk-evt',
    label: 'Cue music',
    sourceRef: 'local://event',
    startMs: 1000,
    endMs: 1000,
    speed: 1,
    opacity: 1,
    blendMode: 'replace',
    metadata: { eventName: 'music_stinger' },
  }

  return {
    schema: 'aethel.timeline.v1',
    id: 'demo-cutscene-cg',
    label: 'Delta cutscene scaffold',
    durationMs: 3000,
    frameRate: 30,
    range: { startMs: 0, endMs: 3000 },
    loop: false,
    tracks: [
      {
        id: 'trk-cam',
        kind: 'scene',
        label: 'Camera',
        muted: false,
        locked: false,
        heightPx: 48,
        clips: [camClip],
      },
      {
        id: 'trk-light',
        kind: 'fx',
        label: 'Lights',
        muted: false,
        locked: false,
        heightPx: 36,
        clips: [lightClip],
      },
      {
        id: 'trk-evt',
        kind: 'marker',
        label: 'Events',
        muted: false,
        locked: false,
        heightPx: 28,
        clips: [eventClip],
      },
    ],
    markers: [{ id: 'm1', timeMs: 2000, label: 'title_card' }],
    evidenceRefs: ['cinematic-director-#63'],
  }
}

export function proveSequencerApplyDeepen(): {
  passed: boolean
  letter: typeof SEQUENCER_DELTA_LETTER
  fov: number
  lightIntensity: number
  events: number
} {
  const tl = buildDemoCutsceneTimeline()
  const snap = applySequencerAtTime(tl, 1500, 0)
  const events = snap.eventsFired.length
  return {
    passed:
      SEQUENCER_APPLY_DEEPEN_WIRED &&
      snap.camera != null &&
      snap.camera.position.x > 0 &&
      snap.camera.fov < 50 &&
      snap.lights[0]!.intensity > 0.2 &&
      events >= 1,
    letter: SEQUENCER_DELTA_LETTER,
    fov: snap.camera?.fov ?? 0,
    lightIntensity: snap.lights[0]?.intensity ?? 0,
    events,
  }
}
