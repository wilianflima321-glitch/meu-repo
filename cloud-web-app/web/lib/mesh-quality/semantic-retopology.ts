/**
 * Letter bz — Semantic retopology landmarks (Native Generation dossier fold).
 *
 * Detects anatomical landmarks (eyes / mouth / elbows / knees) and biases remesh
 * density toward facial tension / mocap-ready edge-loop rings.
 *
 * **Not** Instant Meshes + commercial semantic remesh parity — that stays HELD.
 * Ships landmark-aware density bias on the TS deepen path.
 */

import { countVertices, type RawMeshBuffer, type Vec3 } from '@/lib/mesh-quality/types'

export const SEMANTIC_RETOPOLOGY_WIRED = true as const
export const SEMANTIC_RETOPOLOGY_LETTER = 'bz' as const
/** Full Instant Meshes + commercial semantic remesh parity — HELD. */
export const SEMANTIC_COMMERCIAL_PARITY_HELD = true as const
export const SEMANTIC_COMMERCIAL_PARITY_READY = false as const

export type SemanticLandmarkName =
  | 'leftEye'
  | 'rightEye'
  | 'mouth'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftKnee'
  | 'rightKnee'
  | 'head'
  | 'hips'

export interface SemanticLandmark {
  name: SemanticLandmarkName
  position: Vec3
  confidence: number
  /** Preferred remesh density multiplier near this landmark (edge-loop bias). */
  densityBias: number
}

export interface SemanticRetopoProbe {
  landmarks: SemanticLandmark[]
  /** Heuristic: eyes + mouth present with usable confidence — mocap *readiness hint*, not commercial claim. */
  facialMocapReadyHint: boolean
  semanticCommercialParityReady: false
  evidence: string[]
}

export interface SemanticFeatureMask {
  /** Per-vertex lock strength 0–1 for remesh feature preserve. */
  lockStrength: Float32Array
  landmarks: SemanticLandmark[]
  facialMocapReadyHint: boolean
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

function averageNear(
  mesh: RawMeshBuffer,
  cx: number,
  cy: number,
  cz: number,
  radius: number,
): { pos: Vec3; confidence: number; count: number } {
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
    return { pos: { x: cx, y: cy, z: cz }, confidence: 0.15, count: 0 }
  }
  const conf = Math.min(1, 0.25 + n / Math.max(8, vertCount * 0.02))
  return { pos: { x: sx / n, y: sy / n, z: sz / n }, confidence: conf, count: n }
}

/**
 * Anatomical landmark probe — biped-ish head/face + limbs.
 * Empty-honest low confidence on non-humanoid blobs (still returns geometric guesses).
 */
export function detectSemanticLandmarks(mesh: RawMeshBuffer): SemanticRetopoProbe {
  const vertCount = countVertices(mesh)
  if (vertCount < 8) {
    return {
      landmarks: [],
      facialMocapReadyHint: false,
      semanticCommercialParityReady: false,
      evidence: ['too-sparse', 'semantic-commercial-parity-HELD'],
    }
  }

  const bounds = computeBounds(mesh)
  const height = bounds.maxY - bounds.minY || 1
  const width = bounds.maxX - bounds.minX || 1
  const depth = bounds.maxZ - bounds.minZ || 1
  const midX = (bounds.minX + bounds.maxX) / 2
  const midZ = (bounds.minZ + bounds.maxZ) / 2
  const aspect = height / Math.max(width, depth, 1e-6)

  const headY = bounds.maxY - height * 0.06
  const faceZ = bounds.maxZ - depth * 0.08 // assume +Z forward-ish for clay facing camera
  const eyeY = bounds.maxY - height * 0.1
  const mouthY = bounds.maxY - height * 0.16
  const hipsY = bounds.minY + height * 0.52
  const elbowY = bounds.minY + height * 0.62
  const kneeY = bounds.minY + height * 0.28

  const head = averageNear(mesh, midX, headY, midZ, height * 0.12)
  const leftEye = averageNear(mesh, midX - width * 0.08, eyeY, faceZ, height * 0.05)
  const rightEye = averageNear(mesh, midX + width * 0.08, eyeY, faceZ, height * 0.05)
  const mouth = averageNear(mesh, midX, mouthY, faceZ, height * 0.055)
  const hips = averageNear(mesh, midX, hipsY, midZ, height * 0.15)
  const leftElbow = averageNear(
    mesh,
    bounds.minX + width * 0.15,
    elbowY,
    midZ,
    height * 0.12,
  )
  const rightElbow = averageNear(
    mesh,
    bounds.maxX - width * 0.15,
    elbowY,
    midZ,
    height * 0.12,
  )
  const leftKnee = averageNear(mesh, midX - width * 0.12, kneeY, midZ, height * 0.12)
  const rightKnee = averageNear(mesh, midX + width * 0.12, kneeY, midZ, height * 0.12)

  // Facial density bias higher for mocap tension rings
  const landmarks: SemanticLandmark[] = [
    { name: 'head', position: head.pos, confidence: head.confidence, densityBias: 1.6 },
    { name: 'leftEye', position: leftEye.pos, confidence: leftEye.confidence, densityBias: 2.4 },
    { name: 'rightEye', position: rightEye.pos, confidence: rightEye.confidence, densityBias: 2.4 },
    { name: 'mouth', position: mouth.pos, confidence: mouth.confidence, densityBias: 2.2 },
    { name: 'hips', position: hips.pos, confidence: hips.confidence, densityBias: 1.2 },
    {
      name: 'leftElbow',
      position: leftElbow.pos,
      confidence: leftElbow.confidence,
      densityBias: 1.8,
    },
    {
      name: 'rightElbow',
      position: rightElbow.pos,
      confidence: rightElbow.confidence,
      densityBias: 1.8,
    },
    { name: 'leftKnee', position: leftKnee.pos, confidence: leftKnee.confidence, densityBias: 1.5 },
    {
      name: 'rightKnee',
      position: rightKnee.pos,
      confidence: rightKnee.confidence,
      densityBias: 1.5,
    },
  ]

  const eyeOk =
    leftEye.confidence >= 0.35 && rightEye.confidence >= 0.35 && aspect >= 1.2
  const mouthOk = mouth.confidence >= 0.3
  const facialMocapReadyHint = eyeOk && mouthOk

  return {
    landmarks,
    facialMocapReadyHint,
    semanticCommercialParityReady: false,
    evidence: [
      'anatomical-landmark-probe',
      'edge-loop-density-bias',
      facialMocapReadyHint ? 'facial-mocap-ready-hint' : 'facial-mocap-hint-weak',
      'semantic-commercial-parity-HELD',
      `aspect:${aspect.toFixed(2)}`,
    ],
  }
}

/**
 * Build per-vertex remesh lock mask from semantic landmarks (edge-loop bias).
 */
export function buildSemanticFeatureMask(mesh: RawMeshBuffer): SemanticFeatureMask {
  const probe = detectSemanticLandmarks(mesh)
  const vCount = countVertices(mesh)
  const lockStrength = new Float32Array(vCount)
  const height =
    Math.max(
      ...probe.landmarks.map((l) => l.position.y),
      1,
    ) -
      Math.min(...probe.landmarks.map((l) => l.position.y), 0) || 1

  for (const lm of probe.landmarks) {
    if (lm.confidence < 0.25) continue
    const radius = height * (0.04 + 0.02 * lm.densityBias)
    const r2 = radius * radius
    const strength = Math.min(1, 0.35 * lm.densityBias * lm.confidence)
    for (let i = 0; i < vCount; i++) {
      const x = mesh.positions[i * 3]!
      const y = mesh.positions[i * 3 + 1]!
      const z = mesh.positions[i * 3 + 2]!
      const d =
        (x - lm.position.x) ** 2 + (y - lm.position.y) ** 2 + (z - lm.position.z) ** 2
      if (d <= r2) {
        const falloff = 1 - Math.sqrt(d) / radius
        lockStrength[i] = Math.max(lockStrength[i]!, strength * falloff)
      }
    }
  }

  return {
    lockStrength,
    landmarks: probe.landmarks,
    facialMocapReadyHint: probe.facialMocapReadyHint,
  }
}

/** Count verts with semantic lock above threshold — soak metric for edge-loop bias. */
export function countSemanticLockedVertices(mask: SemanticFeatureMask, threshold = 0.2): number {
  let n = 0
  for (let i = 0; i < mask.lockStrength.length; i++) {
    if (mask.lockStrength[i]! >= threshold) n++
  }
  return n
}
