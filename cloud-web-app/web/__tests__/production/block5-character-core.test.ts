/**
 * Block 5 Character CORE — MOTION SOA/O(1), DEST hull honesty, CLOTH numeric hash / GPU HELD.
 */

import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import {
  FootLockingIK,
  MotionMatchingSystem,
  solveTwoBoneIkPositions,
} from '@/lib/motion-matching-system'
import { MotionPoseSoaDatabase } from '@/lib/motion-matching-soa'
import {
  FRACTURE_GEOMETRY_SHIP_STATUS,
  VoronoiFractureGenerator,
} from '@/lib/destruction-fracture-generator'
import {
  evaluateFragmentPhysicsHonesty,
  FRAGMENT_PHYSICS_SHIP_STATUS,
} from '@/lib/destruction-fragment-physics'
import { SelfCollisionHandler } from '@/lib/cloth-simulation-collisions'
import {
  evaluateGpuClothCollisionHonesty,
  extractBoneCapsuleColliders,
  GPU_CLOTH_COLLISION_SHIP_STATUS,
} from '@/lib/cloth-skinned-capsule-colliders'
import { evaluateGasIpcHonesty, GAS_IPC_SHIP_STATUS } from '@/lib/gas/gas-ipc-honesty'

function sampleHumanoidPose(time: number) {
  const boneTransforms = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>()
  const q = new THREE.Quaternion()
  const bones = [
    'Hips',
    'LeftUpLeg',
    'LeftLeg',
    'LeftFoot',
    'RightUpLeg',
    'RightLeg',
    'RightFoot',
    'LeftHand',
    'RightHand',
  ]
  for (const name of bones) {
    const y = name.includes('Foot') ? 0 : name.includes('Leg') && !name.includes('Up') ? 0.45 : 0.9
    boneTransforms.set(name, {
      position: new THREE.Vector3(
        name.startsWith('Left') ? -0.15 : name.startsWith('Right') ? 0.15 : 0,
        y + Math.sin(time * 4) * 0.01,
        0,
      ),
      rotation: q.clone(),
    })
  }
  return {
    boneTransforms,
    rootPosition: new THREE.Vector3(time * 0.5, 0, 0),
    rootRotation: q.clone(),
  }
}

describe('Block 5 Character CORE — MOTION-001 SOA + O(1)', () => {
  it('stores poses in Float32Array SOA and resolves frames in O(1)', () => {
    const soa = new MotionPoseSoaDatabase()
    soa.beginAnimation('walk')
    for (let i = 0; i < 120; i++) {
      const sample = sampleHumanoidPose(i / 30)
      soa.appendPose({
        animationId: 'walk',
        frameIndex: i,
        time: i / 30,
        feature: {
          pose: {
            leftFootPosition: new THREE.Vector3(),
            rightFootPosition: new THREE.Vector3(),
            leftHandPosition: new THREE.Vector3(),
            rightHandPosition: new THREE.Vector3(),
            hipPosition: new THREE.Vector3(),
            leftFootVelocity: new THREE.Vector3(),
            rightFootVelocity: new THREE.Vector3(),
            hipVelocity: new THREE.Vector3(),
            rootVelocity: new THREE.Vector3(),
            rootAngularVelocity: 0,
          },
          trajectory: [],
          tags: ['walk'],
        },
        boneTransforms: sample.boneTransforms,
        rootPosition: sample.rootPosition,
        rootRotation: sample.rootRotation,
      })
    }
    expect(soa.positions).toBeInstanceOf(Float32Array)
    expect(soa.rotations).toBeInstanceOf(Float32Array)
    expect(soa.poseCount).toBe(120)
    expect(soa.getPoseIndex('walk', 0)).toBe(0)
    expect(soa.getPoseIndex('walk', 41)).toBe(41)
    expect(soa.getPoseIndex('walk', 119)).toBe(119)
    expect(soa.getPoseIndex('walk', 999)).toBe(-1)
  })

  it('lookup stays under 0.05ms for a typical DB size', () => {
    const system = new MotionMatchingSystem()
    // ~2s @ 30fps × 2 clips ≈ typical locomotion DB slice
    for (const id of ['walk', 'run']) {
      system.addAnimation(id, id, 2, 30, true, [id], true, sampleHumanoidPose)
    }
    const ms = system.getSoaDatabase().measureLookupMs(20_000)
    expect(ms).toBeLessThan(0.05)
  })

  it('two-bone IK solves when leg chain is present', () => {
    const transforms = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>()
    transforms.set('LeftUpLeg', { position: new THREE.Vector3(0, 1, 0), rotation: new THREE.Quaternion() })
    transforms.set('LeftLeg', { position: new THREE.Vector3(0, 0.5, 0), rotation: new THREE.Quaternion() })
    transforms.set('LeftFoot', { position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Quaternion() })
    const ok = solveTwoBoneIkPositions(
      transforms,
      'LeftUpLeg',
      'LeftLeg',
      'LeftFoot',
      new THREE.Vector3(0.1, 0.05, 0.2),
    )
    expect(ok).toBe(true)
    expect(transforms.get('LeftFoot')!.position.y).toBeCloseTo(0.05, 2)

    const locker = new FootLockingIK()
    const bones = new Map(transforms)
    bones.set('RightUpLeg', { position: new THREE.Vector3(0.2, 1, 0), rotation: new THREE.Quaternion() })
    bones.set('RightLeg', { position: new THREE.Vector3(0.2, 0.5, 0), rotation: new THREE.Quaternion() })
    bones.set('RightFoot', { position: new THREE.Vector3(0.2, 0, 0), rotation: new THREE.Quaternion() })
    locker.applyToPose(bones, new THREE.Vector3(), new THREE.Vector3(), 1 / 60)
    expect(locker.getShipHonesty().mode).toBe('two_bone')
    expect(locker.getShipHonesty().status).toBe('SHIPPED')
  })
})

describe('Block 5 Character CORE — DEST-001 geometry + physics honesty', () => {
  it('cellToGeometry produces normals via convex hull (not empty)', () => {
    const gen = new VoronoiFractureGenerator(42)
    const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
    const points = gen.generatePoints(bounds, 6)
    const cells = gen.generateCells(points, bounds)
    expect(cells.length).toBeGreaterThan(0)
    const geo = gen.cellToGeometry(cells[0])
    const normals = geo.getAttribute('normal')
    const positions = geo.getAttribute('position')
    expect(positions.count).toBeGreaterThan(0)
    expect(normals).toBeTruthy()
    expect(normals!.count).toBe(positions.count)
    expect(FRACTURE_GEOMETRY_SHIP_STATUS.fortune3d).toBe('HELD')
    expect(FRACTURE_GEOMETRY_SHIP_STATUS.cellGeometry).toBe('SHIPPED')
  })

  it('fragment physics without Rapier is honest HELD', () => {
    const held = evaluateFragmentPhysicsHonesty(false)
    expect(held.shipStatus).toBe('HELD')
    expect(held.canClaimProductionPhysics).toBe(false)
    expect(held.badge).toContain('HELD')
    expect(FRAGMENT_PHYSICS_SHIP_STATUS.jsPreview).toBe('HELD')

    const shipped = evaluateFragmentPhysicsHonesty(true)
    expect(shipped.shipStatus).toBe('SHIPPED')
    expect(shipped.canClaimProductionPhysics).toBe(true)
  })
})

describe('Block 5 Character CORE — CLOTH-001 hash + GPU HELD', () => {
  it('SelfCollisionHandler uses numeric spatial hash keys', () => {
    const handler = new SelfCollisionHandler(0.1)
    const a = { x: 1.23, y: -0.4, z: 2.1 }
    const key = handler.getHashKeyNumeric(a)
    expect(typeof key).toBe('number')
    expect(Number.isInteger(key)).toBe(true)
    // Identical cell floors → same key
    expect(handler.getHashKeyNumeric({ x: 1.23, y: -0.4, z: 2.1 })).toBe(key)
    // Neighbor cell differs
    expect(handler.getHashKeyNumeric({ x: 1.23 + 0.1, y: -0.4, z: 2.1 })).not.toBe(key)
  })

  it('GPU cloth collision stays HELD; bone capsules extract from skinned mesh', () => {
    expect(GPU_CLOTH_COLLISION_SHIP_STATUS).toBe('HELD')
    expect(evaluateGpuClothCollisionHonesty().canClaimProductionClothCollision).toBe(false)

    const root = new THREE.Bone()
    root.name = 'Hips'
    root.position.set(0, 1, 0)
    const mid = new THREE.Bone()
    mid.name = 'Spine'
    mid.position.set(0, 0.3, 0)
    root.add(mid)
    const tip = new THREE.Bone()
    tip.name = 'Chest'
    tip.position.set(0, 0.3, 0)
    mid.add(tip)

    const geo = new THREE.BoxGeometry(0.2, 1, 0.2)
    const mat = new THREE.MeshBasicMaterial()
    const skinned = new THREE.SkinnedMesh(geo, mat)
    const skeleton = new THREE.Skeleton([root, mid, tip])
    skinned.add(root)
    skinned.bind(skeleton)
    skinned.updateMatrixWorld(true)

    const capsules = extractBoneCapsuleColliders(skinned, { radius: 0.05 })
    expect(capsules.length).toBeGreaterThan(0)
    expect(capsules.every((c) => c.type === 'capsule')).toBe(true)
    expect(capsules[0].start).toBeDefined()
    expect(capsules[0].end).toBeDefined()
  })
})

describe('Block 5 Character CORE — GAS IPC HELD', () => {
  it('does not claim 60Hz binary IPC', () => {
    expect(GAS_IPC_SHIP_STATUS).toBe('HELD')
    expect(evaluateGasIpcHonesty().canClaim60HzBinaryIpc).toBe(false)
  })
})
