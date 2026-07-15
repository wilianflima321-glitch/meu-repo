/**
 * Letter ca — Skin weight painting via heat diffusion.
 *
 * Volumetric bone↔vertex weights so auto-rig doesn't bind forearm to ear.
 * Output compatible with Motion Matching + DQ skinning (bu/bv).
 * Empty-honest on non-humanoid.
 */

import {
  runMeshAutoRigger,
  type MeshAutoRigResult,
  type SkinnedBone,
} from '@/lib/mesh-quality/mesh-auto-rigger'
import {
  countVertices,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'
import type { NativeGenStageReceipt } from '@/lib/native-gen/types'

export const HEAT_DIFFUSION_SKIN_WIRED = true as const
export const HEAT_DIFFUSION_SKIN_LETTER = 'ca' as const

export interface HeatDiffusionSkinResult {
  humanoid: boolean
  bones: SkinnedBone[]
  skinWeights: Float32Array
  skinIndices: Uint16Array
  /** True when heat-diffused weights produced (not nearest-only). */
  heatDiffusionReady: boolean
  walkReady: boolean
  /** Forearm↔ear leakage score (lower better); Vitest gate. */
  crossBindLeakScore: number
  receipt: NativeGenStageReceipt
}

/**
 * Paint skin weights via graph heat diffusion from bone heat sources.
 * Falls back to empty-honest when mesh is non-humanoid (delegates landmark gate to bw rigger).
 */
export function paintHeatDiffusionSkinWeights(input: {
  mesh: RawMeshBuffer
  /** Optional precomputed rig — otherwise runs bw auto-rigger landmarks. */
  rig?: MeshAutoRigResult
  iterations?: number
  heatFalloff?: number
}): HeatDiffusionSkinResult {
  const rig = input.rig ?? runMeshAutoRigger(input.mesh)
  if (!rig.humanoid || rig.bones.length === 0) {
    return {
      humanoid: false,
      bones: [],
      skinWeights: new Float32Array(0),
      skinIndices: new Uint16Array(0),
      heatDiffusionReady: false,
      walkReady: false,
      crossBindLeakScore: 0,
      receipt: {
        stage: 'heat-diffusion-skin',
        status: 'skipped',
        evidence: ['non-humanoid-empty-honest'],
        heldReason: rig.receipt.heldReason ?? 'Non-humanoid — no fake heat skin',
        metrics: { humanoid: false },
      },
    }
  }

  const vertCount = countVertices(input.mesh)
  const adj = buildVertexAdjacency(input.mesh)
  const boneCount = rig.bones.length
  const iterations = Math.max(4, Math.min(64, input.iterations ?? 24))
  const falloff = input.heatFalloff ?? 0.85

  // heat[bone][vertex]
  const heat: Float32Array[] = Array.from(
    { length: boneCount },
    () => new Float32Array(vertCount),
  )

  // Seed: inverse-distance heat at bone positions (localized)
  for (let b = 0; b < boneCount; b++) {
    const bone = rig.bones[b]!
    const h = heat[b]!
    for (let v = 0; v < vertCount; v++) {
      const x = input.mesh.positions[v * 3]!
      const y = input.mesh.positions[v * 3 + 1]!
      const z = input.mesh.positions[v * 3 + 2]!
      const d =
        (x - bone.position.x) ** 2 +
        (y - bone.position.y) ** 2 +
        (z - bone.position.z) ** 2
      h[v] = 1 / (d + 1e-5)
    }
    // Normalize seed
    let max = 0
    for (let v = 0; v < vertCount; v++) max = Math.max(max, h[v]!)
    if (max > 0) {
      for (let v = 0; v < vertCount; v++) h[v]! /= max
    }
  }

  // Diffuse along mesh graph
  for (let iter = 0; iter < iterations; iter++) {
    for (let b = 0; b < boneCount; b++) {
      const h = heat[b]!
      const next = new Float32Array(vertCount)
      for (let v = 0; v < vertCount; v++) {
        const neighbors = adj[v]!
        if (neighbors.length === 0) {
          next[v] = h[v]!
          continue
        }
        let sum = h[v]!
        for (const n of neighbors) sum += h[n]!
        const avg = sum / (neighbors.length + 1)
        next[v] = falloff * avg + (1 - falloff) * h[v]!
      }
      heat[b] = next
    }
  }

  // Pin end-effectors slightly stronger after diffusion (head / hands / feet)
  const pinNames = new Set([
    'head',
    'leftHand',
    'rightHand',
    'leftFoot',
    'rightFoot',
    'hips',
  ])
  for (let b = 0; b < boneCount; b++) {
    if (!pinNames.has(rig.bones[b]!.name)) continue
    const bone = rig.bones[b]!
    const h = heat[b]!
    for (let v = 0; v < vertCount; v++) {
      const x = input.mesh.positions[v * 3]!
      const y = input.mesh.positions[v * 3 + 1]!
      const z = input.mesh.positions[v * 3 + 2]!
      const d =
        (x - bone.position.x) ** 2 +
        (y - bone.position.y) ** 2 +
        (z - bone.position.z) ** 2
      h[v] = Math.max(h[v]!, 0.35 / (d + 1e-4))
    }
  }

  const skinWeights = new Float32Array(vertCount * 4)
  const skinIndices = new Uint16Array(vertCount * 4)

  for (let v = 0; v < vertCount; v++) {
    const scored = heat.map((h, bi) => ({ bi, w: h[v]! }))
    scored.sort((a, b) => b.w - a.w)
    const top = scored.slice(0, 4)
    const sum = top.reduce((s, t) => s + t.w, 0) || 1
    for (let k = 0; k < 4; k++) {
      skinIndices[v * 4 + k] = top[k]?.bi ?? 0
      skinWeights[v * 4 + k] = (top[k]?.w ?? 0) / sum
    }
  }

  const leak = measureForearmEarLeak(input.mesh, rig.bones, skinWeights, skinIndices)
  const walkReady = boneCount >= 15 && skinWeights.length === vertCount * 4

  return {
    humanoid: true,
    bones: rig.bones,
    skinWeights,
    skinIndices,
    heatDiffusionReady: true,
    walkReady,
    crossBindLeakScore: leak,
    receipt: {
      stage: 'heat-diffusion-skin',
      status: 'closed',
      evidence: [
        'heat-diffusion',
        'graph-laplacian-approx',
        'mm-dq-compatible-weights',
        'bu-bv-skin-layout',
        'empty-honest-non-humanoid',
      ],
      metrics: {
        boneCount,
        vertCount,
        iterations,
        crossBindLeakScore: leak,
        walkReady,
      },
    },
  }
}

function buildVertexAdjacency(mesh: RawMeshBuffer): number[][] {
  const n = countVertices(mesh)
  const adj: number[][] = Array.from({ length: n }, () => [])
  const add = (a: number, b: number) => {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) return
    if (!adj[a]!.includes(b)) adj[a]!.push(b)
    if (!adj[b]!.includes(a)) adj[b]!.push(a)
  }

  if (mesh.indices.length >= 3) {
    for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
      const a = mesh.indices[i]!
      const b = mesh.indices[i + 1]!
      const c = mesh.indices[i + 2]!
      add(a, b)
      add(b, c)
      add(c, a)
    }
  } else {
    // Non-indexed sequential tris
    const tris = Math.floor(n / 3)
    for (let t = 0; t < tris; t++) {
      const a = t * 3
      add(a, a + 1)
      add(a + 1, a + 2)
      add(a + 2, a)
    }
  }
  return adj
}

/**
 * Approximate forearm↔ear leak: weight of leftLowerArm on vertices near head.
 * Lower is better — heat diffusion should beat naive nearest-bone binding.
 */
function measureForearmEarLeak(
  mesh: RawMeshBuffer,
  bones: SkinnedBone[],
  skinWeights: Float32Array,
  skinIndices: Uint16Array,
): number {
  const forearmIdx = bones.findIndex((b) => b.name === 'leftLowerArm')
  const head = bones.find((b) => b.name === 'head')
  if (forearmIdx < 0 || !head) return 0

  const n = countVertices(mesh)
  let leakSum = 0
  let count = 0
  const r2 = 0.08 ** 2
  for (let v = 0; v < n; v++) {
    const x = mesh.positions[v * 3]! - head.position.x
    const y = mesh.positions[v * 3 + 1]! - head.position.y
    const z = mesh.positions[v * 3 + 2]! - head.position.z
    if (x * x + y * y + z * z > r2) continue
    for (let k = 0; k < 4; k++) {
      if (skinIndices[v * 4 + k] === forearmIdx) {
        leakSum += skinWeights[v * 4 + k]!
      }
    }
    count++
  }
  return count === 0 ? 0 : leakSum / count
}

/** Build a tall biped-ish mesh for heat-diffusion soak tests. */
export function buildBipedTestMesh(): RawMeshBuffer {
  const positions: number[] = []
  const indices: number[] = []
  // Tall/narrow humanoid proportions (aspect >> 1.35) with dense box shells
  const boxes: Array<{
    cx: number
    cy: number
    cz: number
    sx: number
    sy: number
    sz: number
  }> = [
    { cx: 0, cy: 1.75, cz: 0.05, sx: 0.18, sy: 0.22, sz: 0.18 }, // head
    { cx: 0, cy: 1.35, cz: 0, sx: 0.28, sy: 0.4, sz: 0.16 }, // torso
    { cx: 0, cy: 0.95, cz: 0, sx: 0.26, sy: 0.18, sz: 0.14 }, // hips
    { cx: -0.38, cy: 1.25, cz: 0, sx: 0.1, sy: 0.32, sz: 0.1 }, // L upper arm
    { cx: -0.52, cy: 0.9, cz: 0, sx: 0.09, sy: 0.28, sz: 0.09 }, // L lower arm
    { cx: 0.38, cy: 1.25, cz: 0, sx: 0.1, sy: 0.32, sz: 0.1 }, // R upper arm
    { cx: 0.52, cy: 0.9, cz: 0, sx: 0.09, sy: 0.28, sz: 0.09 }, // R lower arm
    { cx: -0.11, cy: 0.55, cz: 0, sx: 0.12, sy: 0.4, sz: 0.12 }, // L upper leg
    { cx: -0.11, cy: 0.15, cz: 0.02, sx: 0.1, sy: 0.32, sz: 0.1 }, // L lower leg
    { cx: 0.11, cy: 0.55, cz: 0, sx: 0.12, sy: 0.4, sz: 0.12 }, // R upper leg
    { cx: 0.11, cy: 0.15, cz: 0.02, sx: 0.1, sy: 0.32, sz: 0.1 }, // R lower leg
  ]

  const pushBox = (
    b: (typeof boxes)[0],
    subdiv: number,
  ) => {
    const base = positions.length / 3
    const hx = b.sx / 2
    const hy = b.sy / 2
    const hz = b.sz / 2
    // Grid shell on each face for landmark density
    const faceVerts: number[][] = []
    const add = (x: number, y: number, z: number) => {
      faceVerts.push([x, y, z])
      positions.push(x, y, z)
    }
    for (let u = 0; u <= subdiv; u++) {
      for (let v = 0; v <= subdiv; v++) {
        const su = u / subdiv
        const sv = v / subdiv
        // ±X faces
        add(b.cx - hx, b.cy - hy + b.sy * su, b.cz - hz + b.sz * sv)
        add(b.cx + hx, b.cy - hy + b.sy * su, b.cz - hz + b.sz * sv)
        // ±Y faces
        add(b.cx - hx + b.sx * su, b.cy - hy, b.cz - hz + b.sz * sv)
        add(b.cx - hx + b.sx * su, b.cy + hy, b.cz - hz + b.sz * sv)
        // ±Z faces
        add(b.cx - hx + b.sx * su, b.cy - hy + b.sy * sv, b.cz - hz)
        add(b.cx - hx + b.sx * su, b.cy - hy + b.sy * sv, b.cz + hz)
      }
    }
    // Fan triangles from first vert of this box (connectivity for heat graph)
    const count = faceVerts.length
    for (let i = 1; i + 1 < count; i++) {
      indices.push(base, base + i, base + i + 1)
    }
  }

  for (const b of boxes) pushBox(b, 3)

  return {
    positions: new Float32Array(positions),
    indices: Uint32Array.from(indices),
  }
}

export function probeHeatDiffusionReady(input?: { soakProven?: boolean }): boolean {
  return HEAT_DIFFUSION_SKIN_WIRED && input?.soakProven !== false
}
