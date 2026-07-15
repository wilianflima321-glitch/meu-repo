/**
 * Letter cn — Floating Origin / Camera-Relative Rendering.
 * CPU f64 absolute (LWC); GPU always camera at origin (UE5 trick).
 */

import {
  cameraRelativeToLwc,
  getLwcAbsoluteOrigin,
  lwcToCameraRelative,
  setLwcAbsoluteOrigin,
} from '@/lib/cosmos/lwc'
import type { CameraRelativePose, LwcVec3 } from '@/lib/cosmos/types'

export const COSMOS_FLOATING_ORIGIN_WIRED = true as const

export interface FloatingOriginState {
  absoluteOrigin: LwcVec3
  /** Threshold before rebase (meters, camera-relative). */
  rebaseThresholdM: number
  rebaseCount: number
}

let state: FloatingOriginState = {
  absoluteOrigin: { x: 0, y: 0, z: 0 },
  rebaseThresholdM: 10_000,
  rebaseCount: 0,
}

export function getFloatingOriginState(): FloatingOriginState {
  return {
    absoluteOrigin: { ...state.absoluteOrigin },
    rebaseThresholdM: state.rebaseThresholdM,
    rebaseCount: state.rebaseCount,
  }
}

export function resetFloatingOrigin(thresholdM = 10_000): void {
  state = {
    absoluteOrigin: { x: 0, y: 0, z: 0 },
    rebaseThresholdM: thresholdM,
    rebaseCount: 0,
  }
  setLwcAbsoluteOrigin(state.absoluteOrigin)
}

/**
 * If camera-relative distance from origin exceeds threshold, rebase:
 * shift absolute origin to camera absolute; return shift for scene objects.
 */
export function maybeRebaseFloatingOrigin(cameraRelative: CameraRelativePose): {
  rebased: boolean
  shift: CameraRelativePose
  absoluteOrigin: LwcVec3
} {
  const dist = Math.sqrt(
    cameraRelative.x ** 2 + cameraRelative.y ** 2 + cameraRelative.z ** 2,
  )
  if (dist < state.rebaseThresholdM) {
    return {
      rebased: false,
      shift: { x: 0, y: 0, z: 0 },
      absoluteOrigin: { ...state.absoluteOrigin },
    }
  }
  // New absolute origin = old + camera relative
  const newOrigin = cameraRelativeToLwc(cameraRelative, state.absoluteOrigin)
  const shift: CameraRelativePose = {
    x: -cameraRelative.x,
    y: -cameraRelative.y,
    z: -cameraRelative.z,
  }
  state.absoluteOrigin = newOrigin
  state.rebaseCount += 1
  setLwcAbsoluteOrigin(newOrigin)
  return { rebased: true, shift, absoluteOrigin: { ...newOrigin } }
}

/**
 * Apply shift to duck-typed scene root / object positions (GPU camera-relative).
 */
export function applyOriginShiftToObjects(
  objects: Array<{ position: { x: number; y: number; z: number } }>,
  shift: CameraRelativePose,
): number {
  if (shift.x === 0 && shift.y === 0 && shift.z === 0) return 0
  for (const o of objects) {
    o.position.x += shift.x
    o.position.y += shift.y
    o.position.z += shift.z
  }
  return objects.length
}

/**
 * Place camera at GPU origin; return world objects in camera-relative space.
 */
export function cameraAtOriginPose(
  absoluteCamera: LwcVec3,
): { cameraGpu: CameraRelativePose; origin: LwcVec3 } {
  const origin = getLwcAbsoluteOrigin()
  return {
    cameraGpu: lwcToCameraRelative(absoluteCamera, origin),
    origin: { ...origin },
  }
}

export function proveFloatingOrigin(): {
  passed: boolean
  rebased: boolean
  cameraAtOriginAfter: boolean
  notes: string[]
} {
  resetFloatingOrigin(100)
  // Camera far from origin → rebase
  const r = maybeRebaseFloatingOrigin({ x: 500, y: 0, z: 0 })
  const objects = [{ position: { x: 500, y: 0, z: 0 } }]
  applyOriginShiftToObjects(objects, r.shift)
  const cameraAtOriginAfter =
    r.rebased &&
    Math.abs(objects[0]!.position.x) < 1e-6 &&
    Math.abs(r.absoluteOrigin.x - 500) < 1e-9
  resetFloatingOrigin()
  return {
    passed: r.rebased && cameraAtOriginAfter,
    rebased: r.rebased,
    cameraAtOriginAfter,
    notes: [
      'Floating Origin CLOSED — CPU f64 absolute; GPU camera-relative',
      'Full UE World Composition origin-shift editor soak HELD',
    ],
  }
}
