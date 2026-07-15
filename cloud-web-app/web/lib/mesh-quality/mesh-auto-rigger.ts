/**
 * Letter bw — Mesh auto-rigger → Motion Matching / DQ skinning compatible skeleton.
 * Mathematical biped landmark detection; empty-honest when mesh is not humanoid.
 */

import {
  countVertices,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
  type Vec3,
} from '@/lib/mesh-quality/types'

export const MESH_AUTO_RIGGER_WIRED = true as const

/** Bones aligned with Motion Matching / bu DQ / characters AutoRigger humanoid set. */
export type MotionMatchBoneName =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'leftHand'
  | 'rightUpperArm'
  | 'rightLowerArm'
  | 'rightHand'
  | 'leftUpperLeg'
  | 'leftLowerLeg'
  | 'leftFoot'
  | 'rightUpperLeg'
  | 'rightLowerLeg'
  | 'rightFoot'

export interface BipedLandmark {
  name: 'head' | 'hips' | 'leftElbow' | 'rightElbow' | 'leftKnee' | 'rightKnee'
  position: Vec3
  confidence: number
}

export interface SkinnedBone {
  name: MotionMatchBoneName
  parent: MotionMatchBoneName | null
  position: Vec3
}

export interface MeshAutoRigResult {
  humanoid: boolean
  landmarks: BipedLandmark[]
  bones: SkinnedBone[]
  /** skinWeights[vertex * 4 + k], skinIndices same layout — DQ/MM ready. */
  skinWeights: Float32Array
  skinIndices: Uint16Array
  walkReady: boolean
  receipt: MeshQualityStageReceipt
}

export function runMeshAutoRigger(mesh: RawMeshBuffer): MeshAutoRigResult {
  const vertCount = countVertices(mesh)
  if (vertCount < 8) {
    return emptyHonest('Mesh too sparse for landmark detection')
  }

  const bounds = computeBounds(mesh)
  const height = bounds.maxY - bounds.minY
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxZ - bounds.minZ
  const aspect = height / Math.max(width, depth, 1e-6)

  // Humanoid heuristic: taller than wide, reasonable limb mass in side bins
  const landmarks = detectLandmarks(mesh, bounds)
  const humanoid =
    aspect >= 1.35 &&
    landmarks.find((l) => l.name === 'head')!.confidence > 0.4 &&
    landmarks.find((l) => l.name === 'hips')!.confidence > 0.4

  if (!humanoid) {
    return {
      humanoid: false,
      landmarks,
      bones: [],
      skinWeights: new Float32Array(0),
      skinIndices: new Uint16Array(0),
      walkReady: false,
      receipt: {
        stage: 'auto-rig',
        status: 'skipped',
        evidence: ['non-humanoid-empty-honest'],
        heldReason: 'Mesh proportions / landmarks do not match biped — no fake walk rig',
        metrics: { aspect, vertCount },
      },
    }
  }

  const bones = buildMmCompatibleBones(landmarks, bounds)
  const { skinWeights, skinIndices } = bindNearestBones(mesh, bones)

  return {
    humanoid: true,
    landmarks,
    bones,
    skinWeights,
    skinIndices,
    walkReady: bones.length >= 15 && skinWeights.length === vertCount * 4,
    receipt: {
      stage: 'auto-rig',
      status: 'closed',
      evidence: [
        'biped-landmarks',
        'motion-matching-bone-names',
        'dq-skin-weights',
        'walk-ready-skinned',
      ],
      metrics: {
        aspect,
        boneCount: bones.length,
        landmarkCount: landmarks.length,
        vertCount,
      },
    },
  }
}

function emptyHonest(reason: string): MeshAutoRigResult {
  return {
    humanoid: false,
    landmarks: [],
    bones: [],
    skinWeights: new Float32Array(0),
    skinIndices: new Uint16Array(0),
    walkReady: false,
    receipt: {
      stage: 'auto-rig',
      status: 'skipped',
      evidence: ['empty-honest'],
      heldReason: reason,
    },
  }
}

function computeBounds(mesh: RawMeshBuffer) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const n = countVertices(mesh)
  for (let i = 0; i < n; i++) {
    const x = mesh.positions[i * 3]!
    const y = mesh.positions[i * 3 + 1]!
    const z = mesh.positions[i * 3 + 2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

function detectLandmarks(
  mesh: RawMeshBuffer,
  bounds: ReturnType<typeof computeBounds>,
): BipedLandmark[] {
  const height = bounds.maxY - bounds.minY || 1
  const midX = (bounds.minX + bounds.maxX) / 2
  const midZ = (bounds.minZ + bounds.maxZ) / 2

  const headY = bounds.maxY - height * 0.05
  const hipsY = bounds.minY + height * 0.52
  const elbowY = bounds.minY + height * 0.62
  const kneeY = bounds.minY + height * 0.28

  const head = averageNear(mesh, midX, headY, midZ, height * 0.12)
  const hips = averageNear(mesh, midX, hipsY, midZ, height * 0.15)
  const leftElbow = averageNear(mesh, bounds.minX + (bounds.maxX - bounds.minX) * 0.15, elbowY, midZ, height * 0.12)
  const rightElbow = averageNear(mesh, bounds.maxX - (bounds.maxX - bounds.minX) * 0.15, elbowY, midZ, height * 0.12)
  const leftKnee = averageNear(mesh, midX - (bounds.maxX - bounds.minX) * 0.12, kneeY, midZ, height * 0.12)
  const rightKnee = averageNear(mesh, midX + (bounds.maxX - bounds.minX) * 0.12, kneeY, midZ, height * 0.12)

  return [
    { name: 'head', position: head.pos, confidence: head.confidence },
    { name: 'hips', position: hips.pos, confidence: hips.confidence },
    { name: 'leftElbow', position: leftElbow.pos, confidence: leftElbow.confidence },
    { name: 'rightElbow', position: rightElbow.pos, confidence: rightElbow.confidence },
    { name: 'leftKnee', position: leftKnee.pos, confidence: leftKnee.confidence },
    { name: 'rightKnee', position: rightKnee.pos, confidence: rightKnee.confidence },
  ]
}

function averageNear(
  mesh: RawMeshBuffer,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): { pos: Vec3; confidence: number } {
  const r2 = radius * radius
  let sx = 0
  let sy = 0
  let sz = 0
  let n = 0
  const vertCount = countVertices(mesh)
  for (let i = 0; i < vertCount; i++) {
    const x = mesh.positions[i * 3]!
    const y = mesh.positions[i * 3 + 1]!
    const z = mesh.positions[i * 3 + 2]!
    const d = (x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2
    if (d <= r2) {
      sx += x
      sy += y
      sz += z
      n++
    }
  }
  if (n === 0) {
    return { pos: { x: cx, y: cy, z: cz }, confidence: 0.2 }
  }
  return {
    pos: { x: sx / n, y: sy / n, z: sz / n },
    confidence: Math.min(1, n / 24),
  }
}

function buildMmCompatibleBones(
  landmarks: BipedLandmark[],
  bounds: ReturnType<typeof computeBounds>,
): SkinnedBone[] {
  const byName = Object.fromEntries(landmarks.map((l) => [l.name, l.position])) as Record<
    BipedLandmark['name'],
    Vec3
  >
  const height = bounds.maxY - bounds.minY
  const midX = (bounds.minX + bounds.maxX) / 2
  const midZ = (bounds.minZ + bounds.maxZ) / 2
  const hips = byName.hips
  const head = byName.head

  const chest: Vec3 = { x: midX, y: hips.y + height * 0.18, z: midZ }
  const spine: Vec3 = { x: midX, y: hips.y + height * 0.08, z: midZ }
  const neck: Vec3 = { x: midX, y: head.y - height * 0.06, z: midZ }

  return [
    { name: 'hips', parent: null, position: hips },
    { name: 'spine', parent: 'hips', position: spine },
    { name: 'chest', parent: 'spine', position: chest },
    { name: 'neck', parent: 'chest', position: neck },
    { name: 'head', parent: 'neck', position: head },
    { name: 'leftUpperArm', parent: 'chest', position: { x: byName.leftElbow.x, y: chest.y, z: midZ } },
    { name: 'leftLowerArm', parent: 'leftUpperArm', position: byName.leftElbow },
    { name: 'leftHand', parent: 'leftLowerArm', position: { x: byName.leftElbow.x - height * 0.06, y: byName.leftElbow.y - height * 0.04, z: midZ } },
    { name: 'rightUpperArm', parent: 'chest', position: { x: byName.rightElbow.x, y: chest.y, z: midZ } },
    { name: 'rightLowerArm', parent: 'rightUpperArm', position: byName.rightElbow },
    { name: 'rightHand', parent: 'rightLowerArm', position: { x: byName.rightElbow.x + height * 0.06, y: byName.rightElbow.y - height * 0.04, z: midZ } },
    { name: 'leftUpperLeg', parent: 'hips', position: { x: byName.leftKnee.x, y: hips.y - height * 0.05, z: midZ } },
    { name: 'leftLowerLeg', parent: 'leftUpperLeg', position: byName.leftKnee },
    { name: 'leftFoot', parent: 'leftLowerLeg', position: { x: byName.leftKnee.x, y: bounds.minY + height * 0.02, z: midZ + height * 0.04 } },
    { name: 'rightUpperLeg', parent: 'hips', position: { x: byName.rightKnee.x, y: hips.y - height * 0.05, z: midZ } },
    { name: 'rightLowerLeg', parent: 'rightUpperLeg', position: byName.rightKnee },
    { name: 'rightFoot', parent: 'rightLowerLeg', position: { x: byName.rightKnee.x, y: bounds.minY + height * 0.02, z: midZ + height * 0.04 } },
  ]
}

function bindNearestBones(
  mesh: RawMeshBuffer,
  bones: SkinnedBone[],
): { skinWeights: Float32Array; skinIndices: Uint16Array } {
  const vertCount = countVertices(mesh)
  const skinWeights = new Float32Array(vertCount * 4)
  const skinIndices = new Uint16Array(vertCount * 4)

  for (let i = 0; i < vertCount; i++) {
    const x = mesh.positions[i * 3]!
    const y = mesh.positions[i * 3 + 1]!
    const z = mesh.positions[i * 3 + 2]!
    const dists = bones
      .map((b, bi) => ({
        bi,
        d: (x - b.position.x) ** 2 + (y - b.position.y) ** 2 + (z - b.position.z) ** 2,
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
    const inv = dists.map((d) => 1 / (Math.sqrt(d.d) + 1e-4))
    const sum = inv.reduce((s, w) => s + w, 0) || 1
    for (let k = 0; k < 4; k++) {
      skinIndices[i * 4 + k] = dists[k]?.bi ?? 0
      skinWeights[i * 4 + k] = (inv[k] ?? 0) / sum
    }
  }

  return { skinWeights, skinIndices }
}
