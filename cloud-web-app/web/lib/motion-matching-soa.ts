// @aethel-heavy-async-boundary Studio animation SOA runtime; never import from route shells.
/**
 * MOTION-001 / IMPROVE-ENG-014 — SOA pose database + O(1) frame lookup.
 * Hot-path bone transforms live in Float32Array strides; KD-tree keeps feature metadata only.
 */
import * as THREE from 'three'

import type { MotionFeature } from './motion-matching-contracts'

export const MOTION_SOA_POS_STRIDE = 3
export const MOTION_SOA_ROT_STRIDE = 4

export interface MotionPoseSoaMeta {
  animationId: string
  frameIndex: number
  time: number
  soaIndex: number
  feature: MotionFeature
}

export class MotionPoseSoaDatabase {
  boneNames: string[] = []
  private boneIndex = new Map<string, number>()
  poseCount = 0
  positions = new Float32Array(0)
  rotations = new Float32Array(0)
  rootPositions = new Float32Array(0)
  rootRotations = new Float32Array(0)
  /** animationId → first SOA pose index */
  private animBase = new Map<string, number>()
  /** animationId → frame count */
  private animFrameCount = new Map<string, number>()
  poseMeta: MotionPoseSoaMeta[] = []

  ensureBones(names: Iterable<string>): void {
    const prevCount = this.boneNames.length
    for (const name of names) {
      if (this.boneIndex.has(name)) continue
      this.boneIndex.set(name, this.boneNames.length)
      this.boneNames.push(name)
    }
    if (this.poseCount > 0 && this.boneNames.length !== prevCount) {
      this.repackForBoneGrowth(prevCount)
    }
  }

  beginAnimation(animationId: string): void {
    this.animBase.set(animationId, this.poseCount)
    this.animFrameCount.set(animationId, 0)
  }

  appendPose(input: {
    animationId: string
    frameIndex: number
    time: number
    feature: MotionFeature
    boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>
    rootPosition: THREE.Vector3
    rootRotation: THREE.Quaternion
  }): number {
    this.ensureBones(input.boneTransforms.keys())
    this.growIfNeeded(this.poseCount + 1)

    const soaIndex = this.poseCount
    const boneCount = this.boneNames.length
    const posBase = soaIndex * boneCount * MOTION_SOA_POS_STRIDE
    const rotBase = soaIndex * boneCount * MOTION_SOA_ROT_STRIDE

    for (let b = 0; b < boneCount; b++) {
      const name = this.boneNames[b]
      const t = input.boneTransforms.get(name)
      const pi = posBase + b * MOTION_SOA_POS_STRIDE
      const ri = rotBase + b * MOTION_SOA_ROT_STRIDE
      if (t) {
        this.positions[pi] = t.position.x
        this.positions[pi + 1] = t.position.y
        this.positions[pi + 2] = t.position.z
        this.rotations[ri] = t.rotation.x
        this.rotations[ri + 1] = t.rotation.y
        this.rotations[ri + 2] = t.rotation.z
        this.rotations[ri + 3] = t.rotation.w
      } else {
        this.rotations[ri + 3] = 1
      }
    }

    const rp = soaIndex * MOTION_SOA_POS_STRIDE
    this.rootPositions[rp] = input.rootPosition.x
    this.rootPositions[rp + 1] = input.rootPosition.y
    this.rootPositions[rp + 2] = input.rootPosition.z
    const rr = soaIndex * MOTION_SOA_ROT_STRIDE
    this.rootRotations[rr] = input.rootRotation.x
    this.rootRotations[rr + 1] = input.rootRotation.y
    this.rootRotations[rr + 2] = input.rootRotation.z
    this.rootRotations[rr + 3] = input.rootRotation.w

    this.poseMeta.push({
      animationId: input.animationId,
      frameIndex: input.frameIndex,
      time: input.time,
      soaIndex,
      feature: input.feature,
    })

    this.poseCount++
    this.animFrameCount.set(
      input.animationId,
      (this.animFrameCount.get(input.animationId) ?? 0) + 1,
    )
    return soaIndex
  }

  /** O(1) pose index: base[anim] + frameIndex — never linear find. */
  getPoseIndex(animationId: string, frameIndex: number): number {
    const base = this.animBase.get(animationId)
    if (base === undefined) return -1
    const count = this.animFrameCount.get(animationId) ?? 0
    if (frameIndex < 0 || frameIndex >= count) return -1
    return base + frameIndex
  }

  readBoneTransforms(
    soaIndex: number,
    out: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
  ): void {
    if (soaIndex < 0 || soaIndex >= this.poseCount) {
      out.clear()
      return
    }
    const boneCount = this.boneNames.length
    const posBase = soaIndex * boneCount * MOTION_SOA_POS_STRIDE
    const rotBase = soaIndex * boneCount * MOTION_SOA_ROT_STRIDE
    for (let b = 0; b < boneCount; b++) {
      const name = this.boneNames[b]
      const pi = posBase + b * MOTION_SOA_POS_STRIDE
      const ri = rotBase + b * MOTION_SOA_ROT_STRIDE
      let slot = out.get(name)
      if (!slot) {
        slot = { position: new THREE.Vector3(), rotation: new THREE.Quaternion() }
        out.set(name, slot)
      }
      slot.position.set(this.positions[pi], this.positions[pi + 1], this.positions[pi + 2])
      slot.rotation.set(
        this.rotations[ri],
        this.rotations[ri + 1],
        this.rotations[ri + 2],
        this.rotations[ri + 3],
      )
    }
  }

  readRoot(
    soaIndex: number,
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
  ): void {
    if (soaIndex < 0 || soaIndex >= this.poseCount) return
    const rp = soaIndex * MOTION_SOA_POS_STRIDE
    position.set(this.rootPositions[rp], this.rootPositions[rp + 1], this.rootPositions[rp + 2])
    const rr = soaIndex * MOTION_SOA_ROT_STRIDE
    rotation.set(
      this.rootRotations[rr],
      this.rootRotations[rr + 1],
      this.rootRotations[rr + 2],
      this.rootRotations[rr + 3],
    )
  }

  /**
   * CPU micro-benchmark helper — typical DB (~2k poses) lookup must stay &lt;0.05ms.
   */
  measureLookupMs(iterations = 10_000): number {
    if (this.poseCount === 0 || this.animBase.size === 0) return 0
    const animId = this.animBase.keys().next().value as string
    const frames = this.animFrameCount.get(animId) ?? 1
    const t0 = performance.now()
    let acc = 0
    for (let i = 0; i < iterations; i++) {
      acc += this.getPoseIndex(animId, i % frames)
    }
    const elapsed = performance.now() - t0
    if (acc < 0) return elapsed / iterations
    return elapsed / iterations
  }

  private growIfNeeded(neededPoses: number): void {
    const boneCount = Math.max(1, this.boneNames.length)
    const posNeed = neededPoses * boneCount * MOTION_SOA_POS_STRIDE
    const rotNeed = neededPoses * boneCount * MOTION_SOA_ROT_STRIDE
    const rootPosNeed = neededPoses * MOTION_SOA_POS_STRIDE
    const rootRotNeed = neededPoses * MOTION_SOA_ROT_STRIDE

    if (this.positions.length < posNeed) {
      const next = new Float32Array(Math.max(posNeed, this.positions.length * 2 || posNeed))
      next.set(this.positions)
      this.positions = next
    }
    if (this.rotations.length < rotNeed) {
      const next = new Float32Array(Math.max(rotNeed, this.rotations.length * 2 || rotNeed))
      next.set(this.rotations)
      this.rotations = next
    }
    if (this.rootPositions.length < rootPosNeed) {
      const next = new Float32Array(Math.max(rootPosNeed, this.rootPositions.length * 2 || rootPosNeed))
      next.set(this.rootPositions)
      this.rootPositions = next
    }
    if (this.rootRotations.length < rootRotNeed) {
      const next = new Float32Array(Math.max(rootRotNeed, this.rootRotations.length * 2 || rootRotNeed))
      next.set(this.rootRotations)
      this.rootRotations = next
    }
  }

  /** Expand packed poses when a new bone name appears after prior frames were written. */
  private repackForBoneGrowth(oldBoneCount: number): void {
    if (oldBoneCount <= 0 || this.poseCount === 0) return
    const newBoneCount = this.boneNames.length
    const oldPos = this.positions
    const oldRot = this.rotations
    const nextPos = new Float32Array(this.poseCount * newBoneCount * MOTION_SOA_POS_STRIDE)
    const nextRot = new Float32Array(this.poseCount * newBoneCount * MOTION_SOA_ROT_STRIDE)
    for (let p = 0; p < this.poseCount; p++) {
      const oldPosBase = p * oldBoneCount * MOTION_SOA_POS_STRIDE
      const oldRotBase = p * oldBoneCount * MOTION_SOA_ROT_STRIDE
      const newPosBase = p * newBoneCount * MOTION_SOA_POS_STRIDE
      const newRotBase = p * newBoneCount * MOTION_SOA_ROT_STRIDE
      nextPos.set(
        oldPos.subarray(oldPosBase, oldPosBase + oldBoneCount * MOTION_SOA_POS_STRIDE),
        newPosBase,
      )
      nextRot.set(
        oldRot.subarray(oldRotBase, oldRotBase + oldBoneCount * MOTION_SOA_ROT_STRIDE),
        newRotBase,
      )
      for (let b = oldBoneCount; b < newBoneCount; b++) {
        nextRot[newRotBase + b * MOTION_SOA_ROT_STRIDE + 3] = 1
      }
    }
    this.positions = nextPos
    this.rotations = nextRot
  }
}
