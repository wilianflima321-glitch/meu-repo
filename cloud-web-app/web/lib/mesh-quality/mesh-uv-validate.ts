/**
 * Letter bw — UV unwrap / preserve + validate (tangent-space readiness).
 */

import {
  countVertices,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'

export const MESH_UV_VALIDATE_WIRED = true as const

export interface UvValidateResult {
  mesh: RawMeshBuffer
  receipt: MeshQualityStageReceipt
  preserved: boolean
  unwrapped: boolean
  hasTangents: boolean
}

/** Spherical unwrap when UVs missing — honest fallback, not XAtlas parity. */
export function ensureAndValidateUvs(mesh: RawMeshBuffer): UvValidateResult {
  const vertCount = countVertices(mesh)
  if (vertCount === 0) {
    return {
      mesh,
      preserved: false,
      unwrapped: false,
      hasTangents: false,
      receipt: {
        stage: 'uv-validate',
        status: 'rejected',
        evidence: [],
        heldReason: 'Empty mesh — no UV validation',
      },
    }
  }

  let preserved = false
  let unwrapped = false
  let uvs = mesh.uvs

  if (uvs && uvs.length >= vertCount * 2) {
    preserved = true
    // Clamp invalids
    const cleaned = new Float32Array(vertCount * 2)
    for (let i = 0; i < vertCount * 2; i++) {
      const v = uvs[i]!
      cleaned[i] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
    }
    uvs = cleaned
  } else {
    uvs = sphericalUnwrap(mesh.positions, vertCount)
    unwrapped = true
  }

  const normals = mesh.normals && mesh.normals.length >= vertCount * 3
    ? mesh.normals
    : computeVertexNormals(mesh)
  const hasTangents = Boolean(normals && uvs)

  const out: RawMeshBuffer = {
    positions: mesh.positions,
    indices: mesh.indices,
    uvs,
    normals,
  }

  const coverage = estimateUvCoverage(uvs, vertCount)
  const ok = coverage > 0.01 && hasTangents

  return {
    mesh: out,
    preserved,
    unwrapped,
    hasTangents,
    receipt: {
      stage: 'uv-validate',
      status: ok ? 'closed' : 'rejected',
      evidence: [
        preserved ? 'uv-preserved' : 'uv-spherical-unwrap',
        hasTangents ? 'normals-ready-for-tangents' : 'normals-missing',
        'xatlas-parity-HELD',
      ],
      metrics: { coverage, vertCount, preserved, unwrapped },
      heldReason: ok ? undefined : 'UV coverage too low for PBR slots',
    },
  }
}

function sphericalUnwrap(positions: Float32Array, vertCount: number): Float32Array {
  const uvs = new Float32Array(vertCount * 2)
  for (let i = 0; i < vertCount; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    const len = Math.hypot(x, y, z) || 1
    const nx = x / len
    const ny = y / len
    const nz = z / len
    uvs[i * 2] = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI)
    uvs[i * 2 + 1] = 0.5 - Math.asin(Math.max(-1, Math.min(1, ny))) / Math.PI
  }
  return uvs
}

function computeVertexNormals(mesh: RawMeshBuffer): Float32Array {
  const vertCount = countVertices(mesh)
  const normals = new Float32Array(vertCount * 3)
  const idx = mesh.indices.length > 0
    ? mesh.indices
    : (() => {
        const n = new Uint32Array(vertCount)
        for (let i = 0; i < vertCount; i++) n[i] = i
        return n
      })()

  for (let i = 0; i + 2 < idx.length; i += 3) {
    const a = idx[i]!
    const b = idx[i + 1]!
    const c = idx[i + 2]!
    const ax = mesh.positions[a * 3]!
    const ay = mesh.positions[a * 3 + 1]!
    const az = mesh.positions[a * 3 + 2]!
    const bx = mesh.positions[b * 3]!
    const by = mesh.positions[b * 3 + 1]!
    const bz = mesh.positions[b * 3 + 2]!
    const cx = mesh.positions[c * 3]!
    const cy = mesh.positions[c * 3 + 1]!
    const cz = mesh.positions[c * 3 + 2]!
    const abx = bx - ax
    const aby = by - ay
    const abz = bz - az
    const acx = cx - ax
    const acy = cy - ay
    const acz = cz - az
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    for (const v of [a, b, c]) {
      normals[v * 3]! += nx
      normals[v * 3 + 1]! += ny
      normals[v * 3 + 2]! += nz
    }
  }

  for (let i = 0; i < vertCount; i++) {
    const x = normals[i * 3]!
    const y = normals[i * 3 + 1]!
    const z = normals[i * 3 + 2]!
    const len = Math.hypot(x, y, z) || 1
    normals[i * 3] = x / len
    normals[i * 3 + 1] = y / len
    normals[i * 3 + 2] = z / len
  }
  return normals
}

function estimateUvCoverage(uvs: Float32Array, vertCount: number): number {
  let minU = 1
  let maxU = 0
  let minV = 1
  let maxV = 0
  for (let i = 0; i < vertCount; i++) {
    const u = uvs[i * 2]!
    const v = uvs[i * 2 + 1]!
    if (u < minU) minU = u
    if (u > maxU) maxU = u
    if (v < minV) minV = v
    if (v > maxV) maxV = v
  }
  return Math.max(0, maxU - minU) * Math.max(0, maxV - minV)
}
