/**
 * Letter bu — Runtime retargeting across skeleton scale differences.
 * Deepens auto-rigging retargetPose with biped walk/punch stretch scale.
 */

import * as THREE from 'three'

export const RUNTIME_RETARGETING_WIRED = true as const

export interface SkeletonScaleProfile {
  /** Hip-to-head approximate height (m). */
  hipToHead: number
  /** Hip-to-floor (m). */
  hipHeight: number
  /** Arm span proxy (m). */
  armSpan: number
}

export interface RetargetScaleFactors {
  heightScale: number
  limbScale: number
  /** Translation stretch for root / hips. */
  rootScale: number
}

export function computeRetargetScaleFactors(
  source: SkeletonScaleProfile,
  target: SkeletonScaleProfile,
): RetargetScaleFactors {
  const heightScale =
    source.hipToHead > 1e-6 ? target.hipToHead / source.hipToHead : 1
  const limbScale = source.armSpan > 1e-6 ? target.armSpan / source.armSpan : heightScale
  const rootScale = source.hipHeight > 1e-6 ? target.hipHeight / source.hipHeight : heightScale
  return {
    heightScale,
    limbScale: (limbScale + heightScale) * 0.5,
    rootScale,
  }
}

export interface RuntimeRetargetPose {
  boneName: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number; w: number }
}

/**
 * Stretch biped walk/punch poses across skeleton scale differences.
 * Rotations copy; translations scale by limb/root factors.
 */
export function retargetBipedPoseRuntime(
  sourcePose: RuntimeRetargetPose[],
  boneNameMap: Map<string, string>,
  scales: RetargetScaleFactors,
  options?: { rootBone?: string; armBones?: string[] },
): RuntimeRetargetPose[] {
  const rootBone = options?.rootBone ?? 'Hips'
  const armBones = new Set(
    options?.armBones ?? ['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand'],
  )
  const out: RuntimeRetargetPose[] = []

  for (const bone of sourcePose) {
    const targetName = boneNameMap.get(bone.boneName) ?? bone.boneName
    let sx = scales.limbScale
    if (bone.boneName === rootBone || targetName === rootBone) {
      sx = scales.rootScale
    } else if (armBones.has(bone.boneName) || armBones.has(targetName)) {
      sx = scales.limbScale
    } else {
      sx = scales.heightScale
    }
    out.push({
      boneName: targetName,
      position: {
        x: bone.position.x * sx,
        y: bone.position.y * sx,
        z: bone.position.z * sx,
      },
      rotation: { ...bone.rotation },
    })
  }
  return out
}

/** Apply retargeted pose into a THREE bone map (editor / runtime). */
export function applyRetargetedPoseToBoneMap(
  pose: RuntimeRetargetPose[],
  boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
): number {
  let applied = 0
  for (const b of pose) {
    const existing = boneTransforms.get(b.boneName)
    if (!existing) continue
    existing.position.set(b.position.x, b.position.y, b.position.z)
    existing.rotation.set(b.rotation.x, b.rotation.y, b.rotation.z, b.rotation.w)
    applied += 1
  }
  return applied
}
