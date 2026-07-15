/**
 * Letter bu — Per-frame foot contact IK (heightfield-aware).
 *
 * Raycast / sample terrain height → adjust ankle + two-bone knee solve.
 * Deepens Motion Matching FootLockingIK / solveTwoBoneIkPositions.
 */

import { solveTwoBoneIkPositions } from '@/lib/motion-matching-system'
import * as THREE from 'three'

export const FOOT_CONTACT_IK_WIRED = true as const

export type TerrainHeightSampler = (x: number, z: number) => number | null

export interface FootContactLimb {
  root: string
  mid: string
  end: string
}

export interface FootContactIkInput {
  boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>
  left: FootContactLimb
  right: FootContactLimb
  sampleHeight: TerrainHeightSampler
  /** Max vertical correction (m). */
  maxLift?: number
  footOffset?: number
}

export interface FootContactIkResult {
  applied: boolean
  leftHit: boolean
  rightHit: boolean
  leftDeltaY: number
  rightDeltaY: number
  mode: 'two_bone_heightfield' | 'skip'
}

const DEFAULT_LEFT: FootContactLimb = {
  root: 'LeftUpLeg',
  mid: 'LeftLeg',
  end: 'LeftFoot',
}
const DEFAULT_RIGHT: FootContactLimb = {
  root: 'RightUpLeg',
  mid: 'RightLeg',
  end: 'RightFoot',
}

function adjustFoot(
  bones: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
  limb: FootContactLimb,
  sampleHeight: TerrainHeightSampler,
  maxLift: number,
  footOffset: number,
): { hit: boolean; deltaY: number } {
  const foot = bones.get(limb.end)
  const mid = bones.get(limb.mid)
  const root = bones.get(limb.root)
  if (!foot || !mid || !root) return { hit: false, deltaY: 0 }

  const h = sampleHeight(foot.position.x, foot.position.z)
  if (h === null || !Number.isFinite(h)) return { hit: false, deltaY: 0 }

  const targetY = h + footOffset
  let deltaY = targetY - foot.position.y
  if (Math.abs(deltaY) < 1e-4) return { hit: true, deltaY: 0 }
  deltaY = Math.max(-maxLift, Math.min(maxLift, deltaY))

  const target = foot.position.clone()
  target.y += deltaY
  solveTwoBoneIkPositions(bones, limb.root, limb.mid, limb.end, target)
  return { hit: true, deltaY }
}

/**
 * Apply foot contact IK using heightfield (or any sampler). Uneven terrain aware.
 */
export function applyFootContactIk(input: FootContactIkInput): FootContactIkResult {
  const maxLift = input.maxLift ?? 0.35
  const footOffset = input.footOffset ?? 0.02
  const left = input.left ?? DEFAULT_LEFT
  const right = input.right ?? DEFAULT_RIGHT

  const L = adjustFoot(input.boneTransforms, left, input.sampleHeight, maxLift, footOffset)
  const R = adjustFoot(input.boneTransforms, right, input.sampleHeight, maxLift, footOffset)

  return {
    applied: L.hit || R.hit,
    leftHit: L.hit,
    rightHit: R.hit,
    leftDeltaY: L.deltaY,
    rightDeltaY: R.deltaY,
    mode: L.hit || R.hit ? 'two_bone_heightfield' : 'skip',
  }
}

/** Sampler from dense heightfield row-major Float32Array. */
export function createHeightfieldSampler(opts: {
  heights: Float32Array
  resolution: number
  worldSize: number
  originX?: number
  originZ?: number
}): TerrainHeightSampler {
  const { heights, resolution, worldSize } = opts
  const ox = opts.originX ?? 0
  const oz = opts.originZ ?? 0
  return (x, z) => {
    if (resolution < 2) return null
    const u = (x - ox) / worldSize
    const v = (z - oz) / worldSize
    if (u < 0 || v < 0 || u > 1 || v > 1) return null
    const ix = Math.min(resolution - 1, Math.max(0, Math.floor(u * (resolution - 1))))
    const iz = Math.min(resolution - 1, Math.max(0, Math.floor(v * (resolution - 1))))
    return heights[iz * resolution + ix] ?? null
  }
}

export { DEFAULT_LEFT as DEFAULT_LEFT_FOOT_LIMB, DEFAULT_RIGHT as DEFAULT_RIGHT_FOOT_LIMB }
