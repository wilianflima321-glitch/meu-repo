// @aethel-heavy-async-boundary Studio cloth skinned capsule extraction.
/**
 * CLOTH-001 / IMPROVE-ENG-021 — bone capsule colliders from SkinnedMesh skeleton.
 * CPU cloth can consume these; GPU cloth collision remains HELD until wired.
 */
import * as THREE from 'three'
import type { ClothCollider } from './cloth-simulation-contracts'

export const GPU_CLOTH_COLLISION_SHIP_STATUS = 'HELD' as const
export const GPU_CLOTH_COLLISION_BADGE =
  'GPU cloth collision [HELD] — no skeleton/capsule collision pass wired'

const DEFAULT_RADIUS = 0.06

/**
 * Build capsule colliders along consecutive bones of a skinned mesh.
 * World-space start/end from bone world matrices (caller should updateMatrixWorld).
 */
export function extractBoneCapsuleColliders(
  skinned: THREE.SkinnedMesh,
  options: { radius?: number; minBoneLength?: number } = {},
): ClothCollider[] {
  const skeleton = skinned.skeleton
  if (!skeleton?.bones?.length) return []

  skinned.updateMatrixWorld(true)
  const radius = options.radius ?? DEFAULT_RADIUS
  const minLen = options.minBoneLength ?? 0.02
  const colliders: ClothCollider[] = []
  const start = new THREE.Vector3()
  const end = new THREE.Vector3()

  for (const bone of skeleton.bones) {
    bone.updateWorldMatrix(true, false)
    const children = bone.children.filter((c): c is THREE.Bone => (c as THREE.Bone).isBone === true)
    if (children.length === 0) continue
    for (const child of children) {
      child.updateWorldMatrix(true, false)
      start.setFromMatrixPosition(bone.matrixWorld)
      end.setFromMatrixPosition(child.matrixWorld)
      if (start.distanceTo(end) < minLen) continue
      colliders.push({
        type: 'capsule',
        position: start.clone().add(end).multiplyScalar(0.5),
        start: start.clone(),
        end: end.clone(),
        radius,
      })
    }
  }
  return colliders
}

export function evaluateGpuClothCollisionHonesty(): {
  shipStatus: 'HELD'
  badge: string
  canClaimProductionClothCollision: false
} {
  return {
    shipStatus: GPU_CLOTH_COLLISION_SHIP_STATUS,
    badge: GPU_CLOTH_COLLISION_BADGE,
    canClaimProductionClothCollision: false,
  }
}
