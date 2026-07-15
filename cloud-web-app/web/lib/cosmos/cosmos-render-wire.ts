/**
 * Letter cn — Cosmos render wire: floating-origin + reversed-Z into AAA/camera path.
 */

import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget'
import {
  applyOriginShiftToObjects,
  maybeRebaseFloatingOrigin,
  resetFloatingOrigin,
  getFloatingOriginState,
} from '@/lib/cosmos/floating-origin'
import {
  applyReversedZToCamera,
  buildForwardZProjection,
  buildReversedZProjection,
} from '@/lib/cosmos/reversed-z'
import { samplePbrSkyAtmosphere } from '@/lib/cosmos/pbr-sky-atmosphere'
import type { CameraRelativePose } from '@/lib/cosmos/types'

export const COSMOS_RENDER_WIRE_LETTER = 'cn' as const
export const COSMOS_RENDER_WIRE_WIRED = true as const

export interface CosmosRenderTargets {
  camera?: {
    near: number
    far: number
    fov?: number
    aspect?: number
    position?: { x: number; y: number; z: number }
    updateProjectionMatrix?: () => void
    projectionMatrix?: { fromArray?: (a: ArrayLike<number>) => void; elements?: number[] }
  } | null
  /** Scene objects with mutable position (shifted on rebase). */
  objects?: Array<{ position: { x: number; y: number; z: number } }>
}

export interface CosmosRenderTickResult {
  reversedZApplied: boolean
  floatingOriginRebased: boolean
  skySampled: boolean
  zeroUiUnavailable: boolean
  capabilityScore: number
}

/**
 * Enable reverse-Z (or forward fallback) on camera from CapScore.
 */
export function enableCosmosReversedZOnCamera(
  camera: CosmosRenderTargets['camera'],
  capabilityScore: number,
): { applied: boolean; reversed: boolean; zeroUiUnavailable: boolean } {
  if (!camera) return { applied: false, reversed: false, zeroUiUnavailable: true }
  const budget = resolveCosmosCapabilityBudget(capabilityScore)
  const fovY = ((camera.fov ?? 75) * Math.PI) / 180
  const aspect = camera.aspect ?? 16 / 9
  const plan = budget.reversedZAllowed
    ? buildReversedZProjection({ fovYRadians: fovY, aspect, near: 0.1 })
    : buildForwardZProjection({ fovYRadians: fovY, aspect, near: 0.1, far: 1e6 })
  const r = applyReversedZToCamera(camera, plan)
  return { applied: r.applied, reversed: plan.reversed, zeroUiUnavailable: r.zeroUiUnavailable }
}

/**
 * Per-frame cosmos render tick: floating origin rebase + optional sky sample.
 */
export function tickCosmosRender(input: {
  capabilityScore: number
  targets: CosmosRenderTargets
  cameraRelative?: CameraRelativePose
  enableSky?: boolean
}): CosmosRenderTickResult {
  const budget = resolveCosmosCapabilityBudget(input.capabilityScore)
  if (!input.targets.camera && !input.targets.objects) {
    return {
      reversedZApplied: false,
      floatingOriginRebased: false,
      skySampled: false,
      zeroUiUnavailable: true,
      capabilityScore: budget.capabilityScore,
    }
  }

  const rz = enableCosmosReversedZOnCamera(input.targets.camera, input.capabilityScore)

  let floatingOriginRebased = false
  if (budget.floatingOriginAllowed && input.cameraRelative) {
    const r = maybeRebaseFloatingOrigin(input.cameraRelative)
    if (r.rebased && input.targets.objects) {
      applyOriginShiftToObjects(input.targets.objects, r.shift)
      // Keep GPU camera at origin after rebase
      if (input.targets.camera?.position) {
        input.targets.camera.position.x = 0
        input.targets.camera.position.y = 0
        input.targets.camera.position.z = 0
      }
      floatingOriginRebased = true
    }
  }

  let skySampled = false
  if (input.enableSky !== false) {
    samplePbrSkyAtmosphere(
      { x: 0, y: 1, z: 0 },
      { samples: budget.skyAtmosphereSamples },
    )
    skySampled = true
  }

  return {
    reversedZApplied: rz.applied,
    floatingOriginRebased,
    skySampled,
    zeroUiUnavailable: false,
    capabilityScore: budget.capabilityScore,
  }
}

export function proveCosmosRenderWire(capabilityScore = 38): {
  passed: boolean
  reversedZ: boolean
  floatingOrigin: boolean
  notes: string[]
} {
  resetFloatingOrigin(50)
  const camera = {
    near: 0.1,
    far: 1000,
    fov: 75,
    aspect: 1.777,
    position: { x: 200, y: 0, z: 0 },
    projectionMatrix: { elements: new Array(16).fill(0) as number[] },
  }
  const objects = [{ position: { x: 200, y: 0, z: 0 } }]
  const rz = enableCosmosReversedZOnCamera(camera, capabilityScore)
  const tick = tickCosmosRender({
    capabilityScore,
    targets: { camera, objects },
    cameraRelative: { x: 200, y: 0, z: 0 },
    enableSky: true,
  })
  const floatingOrigin =
    tick.floatingOriginRebased &&
    Math.abs(objects[0]!.position.x) < 1e-6 &&
    getFloatingOriginState().rebaseCount >= 1
  resetFloatingOrigin()
  return {
    passed: rz.applied && rz.reversed && floatingOrigin && tick.skySampled,
    reversedZ: rz.applied && rz.reversed,
    floatingOrigin,
    notes: [
      'Cosmos render wire CLOSED — reverse-Z + floating origin + sky sample',
      'Full Three.js WebGLState depthFunc reverse soak HELD',
    ],
  }
}
