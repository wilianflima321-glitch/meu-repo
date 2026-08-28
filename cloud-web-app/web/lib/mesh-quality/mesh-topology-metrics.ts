/**
 * Letter bz — Shared topology metrics for remesh deepen + critic gates.
 * Used to prove metric improvement vs bw baseline (not Instant Meshes parity).
 */

import {
  countTriangles,
  countVertices,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'

export const MESH_TOPOLOGY_METRICS_LETTER = 'bz' as const

export interface MeshTopologyMetrics {
  triangles: number
  vertices: number
  uniqueEdges: number
  boundaryEdges: number
  /** Connected components of boundary edges (closed loops) — kernel bw grader input. */
  openBoundaryLoops: number
  /** Vertices with zero incident edges — kernel bw grader input. */
  isolatedVertices: number
  nonManifoldEdges: number
  /** nonManifoldEdges / uniqueEdges — primary deepen health score. */
  nonManifoldEdgeRatio: number
  /** Fraction of unique edges with valence exactly 2 (ideal manifold interior). */
  manifoldEdgeRatio: number
  /** Edges with sharp dihedral (feature / crease candidates). */
  featureEdgeCount: number
  avgVertexValence: number
  degenerateFaces: number
  /** Adjacent coplanar-ish triangle pairs that read as virtual quads. */
  quadPairCandidates: number
  /** quadPairCandidates / max(1, floor(triangles/2)). */
  quadIshRatio: number
}

const FEATURE_DIHEDRAL_DOT = 0.35

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function faceNormal(
  positions: Float32Array,
  a: number,
  b: number,
  c: number,
): [number, number, number] {
  const ax = positions[a * 3]!
  const ay = positions[a * 3 + 1]!
  const az = positions[a * 3 + 2]!
  const bx = positions[b * 3]!
  const by = positions[b * 3 + 1]!
  const bz = positions[b * 3 + 2]!
  const cx = positions[c * 3]!
  const cy = positions[c * 3 + 1]!
  const cz = positions[c * 3 + 2]!
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

function ensureIndexed(mesh: RawMeshBuffer): { positions: Float32Array; indices: Uint32Array } {
  if (mesh.indices.length > 0) {
    return { positions: mesh.positions, indices: mesh.indices }
  }
  const triCount = Math.floor(mesh.positions.length / 9)
  const indices = new Uint32Array(triCount * 3)
  for (let i = 0; i < indices.length; i++) indices[i] = i
  return { positions: mesh.positions, indices }
}

/** Measure manifold / feature / quad-ish topology quality. */
export function measureMeshTopology(mesh: RawMeshBuffer): MeshTopologyMetrics {
  const { positions, indices } = ensureIndexed(mesh)
  const triangles = countTriangles({ positions, indices })
  const vertices = countVertices({ positions, indices })

  const edgeFaces = new Map<string, number[]>()
  let degenerateFaces = 0
  const faceNormals: Array<[number, number, number]> = []

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    const faceIdx = i / 3
    if (a === b || b === c || c === a) {
      degenerateFaces++
      faceNormals.push([0, 1, 0])
      continue
    }
    faceNormals.push(faceNormal(positions, a, b, c))
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      const list = edgeFaces.get(k)
      if (list) list.push(faceIdx)
      else edgeFaces.set(k, [faceIdx])
    }
  }

  let boundaryEdges = 0
  let nonManifoldEdges = 0
  let featureEdgeCount = 0
  let manifoldInterior = 0
  const boundaryEdgeEndpoints: Array<[number, number]> = []

  for (const [key, faces] of edgeFaces) {
    const valence = faces.length
    const [sa, sb] = key.split(':')
    const a = Number(sa)
    const b = Number(sb)
    if (valence === 1) {
      boundaryEdges++
      boundaryEdgeEndpoints.push([a, b])
    } else if (valence === 2) {
      manifoldInterior++
      const n0 = faceNormals[faces[0]!]!
      const n1 = faceNormals[faces[1]!]!
      const dot = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]
      if (dot < FEATURE_DIHEDRAL_DOT) featureEdgeCount++
    } else {
      nonManifoldEdges++
    }
  }

  const uniqueEdges = edgeFaces.size
  const manifoldEdgeRatio = uniqueEdges > 0 ? manifoldInterior / uniqueEdges : 0
  const nonManifoldEdgeRatio = uniqueEdges > 0 ? nonManifoldEdges / uniqueEdges : 0

  const valenceSum = new Float64Array(Math.max(1, vertices))
  for (const key of edgeFaces.keys()) {
    const [sa, sb] = key.split(':')
    const a = Number(sa)
    const b = Number(sb)
    if (a < vertices) valenceSum[a]!++
    if (b < vertices) valenceSum[b]!++
  }
  let valenceTotal = 0
  for (let i = 0; i < vertices; i++) valenceTotal += valenceSum[i]!
  const avgVertexValence = vertices > 0 ? valenceTotal / vertices : 0

  // Open boundary loops = connected components of boundary edges (kernel grader input).
  const parent = new Map<number, number>()
  const find = (x: number): number => {
    let root = parent.get(x) ?? x
    while ((parent.get(root) ?? root) !== root) root = parent.get(root)!
    parent.set(x, root)
    return root
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const [a, b] of boundaryEdgeEndpoints) {
    if (!parent.has(a)) parent.set(a, a)
    if (!parent.has(b)) parent.set(b, b)
    union(a, b)
  }
  const loopRoots = new Set<number>()
  for (const v of parent.keys()) loopRoots.add(find(v))
  const openBoundaryLoops = loopRoots.size

  // Isolated vertices = no incident edge (kernel grader input).
  let isolatedVertices = 0
  for (let i = 0; i < vertices; i++) {
    if (valenceSum[i] === 0) isolatedVertices++
  }

  // Quad-ish: adjacent coplanar-ish pairs sharing an edge
  const paired = new Set<number>()
  let quadPairCandidates = 0
  for (const [, faces] of edgeFaces) {
    if (faces.length !== 2) continue
    const f0 = faces[0]!
    const f1 = faces[1]!
    if (paired.has(f0) || paired.has(f1)) continue
    const n0 = faceNormals[f0]!
    const n1 = faceNormals[f1]!
    const dot = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]
    if (dot >= 0.92) {
      paired.add(f0)
      paired.add(f1)
      quadPairCandidates++
    }
  }
  const quadIshRatio = quadPairCandidates / Math.max(1, Math.floor(triangles / 2))

  return {
    triangles,
    vertices,
    uniqueEdges,
    boundaryEdges,
    openBoundaryLoops,
    isolatedVertices,
    nonManifoldEdges,
    nonManifoldEdgeRatio,
    manifoldEdgeRatio,
    featureEdgeCount,
    avgVertexValence,
    degenerateFaces,
    quadPairCandidates,
    quadIshRatio,
  }
}

/** Chaotic clay-like blob with intentional non-manifold / overlapping faces for deepen soak. */
export function buildChaoticClayFixture(seed = 7): RawMeshBuffer {
  const base = buildSubdividedCube(3)
  const positions = Array.from(base.positions)
  const indices = Array.from(base.indices)
  // Duplicate a band of faces with shifted indices → non-manifold edges
  const band = Math.min(indices.length, 180)
  for (let i = 0; i < band; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    // Fan a degenerate-ish overlapping face from a jittered copy of a
    const jitter = ((seed * (i + 3)) % 17) * 0.01
    const nv = positions.length / 3
    positions.push(
      positions[a * 3]! + jitter,
      positions[a * 3 + 1]! - jitter * 0.5,
      positions[a * 3 + 2]! + jitter * 0.25,
    )
    indices.push(a, b, nv)
    indices.push(a, c, b) // reverse-winding duplicate → non-manifold
  }
  return {
    positions: new Float32Array(positions),
    indices: Uint32Array.from(indices),
  }
}

function buildSubdividedCube(subdiv: number): RawMeshBuffer {
  // Start from unit cube, mid-point subdivide faces
  let verts = [
    -1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
  ]
  let faces = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3,
    0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
  ]
  const midCache = new Map<string, number>()
  const midpoint = (a: number, b: number): number => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    const hit = midCache.get(key)
    if (hit !== undefined) return hit
    const idx = verts.length / 3
    verts.push(
      (verts[a * 3]! + verts[b * 3]!) / 2,
      (verts[a * 3 + 1]! + verts[b * 3 + 1]!) / 2,
      (verts[a * 3 + 2]! + verts[b * 3 + 2]!) / 2,
    )
    midCache.set(key, idx)
    return idx
  }
  for (let s = 0; s < subdiv; s++) {
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
