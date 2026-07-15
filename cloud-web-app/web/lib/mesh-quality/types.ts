/**
 * Letter bw — Game-ready 3D Quality Pipeline shared contracts.
 * Meshy/Tripo win clay; Aethel owns retopo → rig → PBR → collider → pack.
 */

export const MESH_QUALITY_PIPELINE_LETTER = 'bw' as const
export const MESH_QUALITY_PIPELINE_ID = 'game-ready-quality-pipeline:v1' as const

/** Default hero retopo budget — game-ready, not clay soup. */
export const DEFAULT_RETOPO_TARGET_TRIANGLES = 10_000

/** Law XV — heavy remesh stays offline/worker below this score. */
export const HEAVY_REMESH_MIN_CAPABILITY_SCORE = 45

export type MeshQualityStageId =
  | 'clay-ingest'
  | 'auto-retopo'
  | 'uv-validate'
  | 'lod-cascade'
  | 'auto-rig'
  | 'contextual-pbr'
  | 'collider-cook'
  | 'topology-critic'
  | 'aethelpack-entry'

export type MeshQualityStageStatus = 'closed' | 'held' | 'skipped' | 'rejected'

export interface RawMeshBuffer {
  /** Interleaved xyz positions. */
  positions: Float32Array
  /** Triangle indices (length % 3 === 0). Empty → non-indexed sequential. */
  indices: Uint32Array
  /** Optional UV0 (u,v per vertex). */
  uvs?: Float32Array
  /** Optional normals (xyz per vertex). */
  normals?: Float32Array
}

export interface MeshQualityStageReceipt {
  stage: MeshQualityStageId
  status: MeshQualityStageStatus
  evidence: string[]
  heldReason?: string
  metrics?: Record<string, number | string | boolean>
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export function countTriangles(mesh: RawMeshBuffer): number {
  if (mesh.indices.length > 0) return Math.floor(mesh.indices.length / 3)
  return Math.floor(mesh.positions.length / 9)
}

export function countVertices(mesh: RawMeshBuffer): number {
  return Math.floor(mesh.positions.length / 3)
}

export function cloneMesh(mesh: RawMeshBuffer): RawMeshBuffer {
  return {
    positions: new Float32Array(mesh.positions),
    indices: new Uint32Array(mesh.indices),
    uvs: mesh.uvs ? new Float32Array(mesh.uvs) : undefined,
    normals: mesh.normals ? new Float32Array(mesh.normals) : undefined,
  }
}

/** Build an indexed unit-ish icosphere-like blob for tests (chaotic high poly via subdiv). */
export function buildTestIcosphere(subdivisions = 2): RawMeshBuffer {
  const t = (1 + Math.sqrt(5)) / 2
  let verts: number[] = [
    -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
    0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
    t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
  ]
  let faces: number[] = [
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
    1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
    3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
    4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ]

  const midCache = new Map<string, number>()
  const normalize = (i: number) => {
    const x = verts[i * 3]!
    const y = verts[i * 3 + 1]!
    const z = verts[i * 3 + 2]!
    const len = Math.hypot(x, y, z) || 1
    verts[i * 3] = x / len
    verts[i * 3 + 1] = y / len
    verts[i * 3 + 2] = z / len
  }
  for (let i = 0; i < verts.length / 3; i++) normalize(i)

  const midpoint = (a: number, b: number): number => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const hit = midCache.get(key)
    if (hit !== undefined) return hit
    const ax = verts[a * 3]!
    const ay = verts[a * 3 + 1]!
    const az = verts[a * 3 + 2]!
    const bx = verts[b * 3]!
    const by = verts[b * 3 + 1]!
    const bz = verts[b * 3 + 2]!
    const idx = verts.length / 3
    verts.push((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
    normalize(idx)
    midCache.set(key, idx)
    return idx
  }

  for (let s = 0; s < subdivisions; s++) {
    const next: number[] = []
    for (let i = 0; i < faces.length; i += 3) {
      const a = faces[i]!
      const b = faces[i + 1]!
      const c = faces[i + 2]!
      const ab = midpoint(a, b)
      const bc = midpoint(b, c)
      const ca = midpoint(c, a)
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca)
    }
    faces = next
    midCache.clear()
  }

  return {
    positions: new Float32Array(verts),
    indices: Uint32Array.from(faces),
  }
}
