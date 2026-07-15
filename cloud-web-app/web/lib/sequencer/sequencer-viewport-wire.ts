/**
 * Letter cl — Sequencer apply → Studio / AAA camera + lights (Zero-MVP).
 * IDE-only path; game runtime stays Zero-UI (no sequencer chrome).
 * UE Sequencer maturity / final footage remain HELD.
 */

import type { SequencerApplySnapshot, SequencerLightState } from '@/lib/sequencer/sequencer-apply-deepen'

export const SEQUENCER_VIEWPORT_WIRE_LETTER = 'cl' as const
export const SEQUENCER_VIEWPORT_WIRE_WIRED = true as const

/** Duck-typed PerspectiveCamera (Three / AAA / R3F). */
export interface SequencerCameraTarget {
  position: { set(x: number, y: number, z: number): void; x?: number; y?: number; z?: number }
  lookAt(x: number, y: number, z: number): void
  fov: number
  updateProjectionMatrix?: () => void
  rotation?: { z: number }
}

/** Duck-typed light (Point/Directional/Spot intensity). */
export interface SequencerLightTarget {
  intensity: number
  /** Optional Kelvin-ish temp → warm/cool bias when present. */
  color?: { setRGB?(r: number, g: number, b: number): void; r?: number; g?: number; b?: number }
  userData?: { sequencerLightId?: string }
}

export interface SequencerViewportTargets {
  camera?: SequencerCameraTarget | null
  lights?: SequencerLightTarget[] | null
  /** Optional event sink (IDE / Director cue). */
  onEvent?: (name: string, payload?: unknown, timeMs?: number) => void
}

export interface SequencerViewportApplyResult {
  letter: typeof SEQUENCER_VIEWPORT_WIRE_LETTER
  applied: boolean
  /** True when no camera/lights bound — silent Zero-UI (not an error). */
  zeroUiUnavailable: boolean
  cameraApplied: boolean
  lightsApplied: number
  eventsDelivered: number
}

let boundTargets: SequencerViewportTargets | null = null

/**
 * Studio / AAA viewport binds camera+lights for sequencer apply.
 * Pass null to unbind (Zero-UI — play still samples; apply no-ops).
 */
export function bindSequencerViewportTargets(
  targets: SequencerViewportTargets | null,
): void {
  boundTargets = targets
}

export function getSequencerViewportTargets(): SequencerViewportTargets | null {
  return boundTargets
}

function colorTempToRgb(kelvin: number): { r: number; g: number; b: number } {
  const k = Math.max(1000, Math.min(12000, kelvin)) / 100
  let r: number
  let g: number
  let b: number
  if (k <= 66) {
    r = 1
    g = Math.max(0, Math.min(1, (99.4708025861 * Math.log(k) - 161.1195681661) / 255))
    b =
      k <= 19
        ? 0
        : Math.max(0, Math.min(1, (138.5177312231 * Math.log(k - 10) - 305.0447927307) / 255))
  } else {
    r = Math.max(0, Math.min(1, (329.698727446 * Math.pow(k - 60, -0.1332047592)) / 255))
    g = Math.max(0, Math.min(1, (288.1221695283 * Math.pow(k - 60, -0.0755148492)) / 255))
    b = 1
  }
  return { r, g, b }
}

function applyLight(target: SequencerLightTarget, state: SequencerLightState): void {
  target.intensity = state.intensity
  if (state.colorTemp != null && target.color) {
    const rgb = colorTempToRgb(state.colorTemp)
    if (typeof target.color.setRGB === 'function') {
      target.color.setRGB(rgb.r, rgb.g, rgb.b)
    } else {
      target.color.r = rgb.r
      target.color.g = rgb.g
      target.color.b = rgb.b
    }
  }
}

/**
 * Apply pure SequencerApplySnapshot into bound or explicit viewport targets.
 * Null/empty targets → Zero-UI silent no-op (IDE may still show numbers).
 */
export function applySequencerSnapshotToViewport(
  snap: SequencerApplySnapshot,
  targets: SequencerViewportTargets | null | undefined = boundTargets,
): SequencerViewportApplyResult {
  if (!targets || (!targets.camera && !(targets.lights && targets.lights.length > 0))) {
    return {
      letter: SEQUENCER_VIEWPORT_WIRE_LETTER,
      applied: false,
      zeroUiUnavailable: true,
      cameraApplied: false,
      lightsApplied: 0,
      eventsDelivered: 0,
    }
  }

  let cameraApplied = false
  let lightsApplied = 0
  let eventsDelivered = 0

  if (targets.camera && snap.camera) {
    const cam = targets.camera
    const c = snap.camera
    cam.position.set(c.position.x, c.position.y, c.position.z)
    cam.lookAt(c.lookAt.x, c.lookAt.y, c.lookAt.z)
    cam.fov = c.fov
    if (cam.rotation) cam.rotation.z = c.roll
    cam.updateProjectionMatrix?.()
    cameraApplied = true
  }

  if (targets.lights && snap.lights.length > 0) {
    for (const lightState of snap.lights) {
      const match =
        targets.lights.find(
          (l) => l.userData?.sequencerLightId === lightState.id,
        ) ?? targets.lights[0]
      if (!match) continue
      applyLight(match, lightState)
      lightsApplied += 1
    }
  }

  if (targets.onEvent) {
    for (const ev of snap.eventsFired) {
      targets.onEvent(ev.name, ev.payload, ev.timeMs)
      eventsDelivered += 1
    }
  }

  return {
    letter: SEQUENCER_VIEWPORT_WIRE_LETTER,
    applied: cameraApplied || lightsApplied > 0 || eventsDelivered > 0,
    zeroUiUnavailable: false,
    cameraApplied,
    lightsApplied,
    eventsDelivered,
  }
}

/** Test / IDE helper — mutable camera+light stubs. */
export function createSequencerViewportMockTargets(): {
  targets: SequencerViewportTargets
  camera: SequencerCameraTarget & {
    position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void }
  }
  light: SequencerLightTarget
  events: Array<{ name: string; timeMs?: number }>
} {
  const position = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
    },
  }
  const camera: SequencerCameraTarget & {
    position: typeof position
  } = {
    position,
    lookAt(x: number, y: number, z: number) {
      ;(this as { _lookAt?: { x: number; y: number; z: number } })._lookAt = { x, y, z }
    },
    fov: 50,
    rotation: { z: 0 },
    updateProjectionMatrix() {
      ;(this as { _projUpdated?: boolean })._projUpdated = true
    },
  }
  const light: SequencerLightTarget = {
    intensity: 0,
    userData: { sequencerLightId: 'trk-light' },
    color: { r: 1, g: 1, b: 1 },
  }
  const events: Array<{ name: string; timeMs?: number }> = []
  return {
    camera,
    light,
    events,
    targets: {
      camera,
      lights: [light],
      onEvent: (name, _payload, timeMs) => {
        events.push({ name, timeMs })
      },
    },
  }
}
