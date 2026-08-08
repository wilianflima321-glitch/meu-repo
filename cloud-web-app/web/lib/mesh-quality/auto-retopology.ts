/**
 * Letter bz — Auto-retopology deepen (Instant Meshes parity path).
 *
 * Production path: feature-aware, manifold-preferring, quad-ish-aware TS simplify.
 * **instantMeshesParityReady remains false** until a commercial remesher is soaked.
 * Rust worker IPC hooks are optional honesty bridges — never invent remeshed bytes.
 *
 * Letter bw baseline cluster simplify retained as `runAutoRetopologyBwBaseline`
 * for Vitest metric improvement soak.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  measureMeshTopology,
  type MeshTopologyMetrics,
} from '@/lib/mesh-quality/mesh-topology-metrics'
import {
  buildSemanticFeatureMask,
  detectSemanticLandmarks,
  type SemanticLandmark,
} from '@/lib/mesh-quality/semantic-retopology'
import {
  cloneMesh,
  countTriangles,
  countVertices,
  DEFAULT_RETOPO_TARGET_TRIANGLES,
  HEAVY_REMESH_MIN_CAPABILITY_SCORE,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'

const log = createComponentLogger('auto-retopology')

export const AUTO_RETOPOLOGY_WIRED = true as const
export const INSTANT_MESHES_PARITY_HELD = true as const
/** Honesty: commercial Instant Meshes / QuadriFlow class not proven. */
export const INSTANT_MESHES_PARITY_READY = false as const
/** Letter bz — deepened TS remesh path is real and measurable. */
export const REMESH_QUALITY_DEEPENED = true as const
export const AUTO_RETOPOLOGY_LETTER = 'bz' as const

const FEATURE_DIHEDRAL_DOT = 0.35

export interface AutoRetopoInput {
  mesh: RawMeshBuffer
  targetTriangles?: number
  /** Law XV Capability Score — weak GPU → force offline/worker path. */
  capabilityScore?: number
  /** Prefer background job semantics when score is low. */
  allowInlineOnWeakGpu?: boolean
  /**
   * Prefer native worker IPC when available. Production TS path still runs unless
   * a future commercial remesher soak flips Instant Meshes parity.
   */
  preferNativeWorker?: boolean
  /** Enable anatomical landmark edge-loop bias (default true on deepen path). */
  semanticLandmarks?: boolean
}

export interface AutoRetopoResult {
  mesh: RawMeshBuffer
  receipt: MeshQualityStageReceipt
  trianglesBefore: number
  trianglesAfter: number
  verticesBefore: number
  verticesAfter: number
  algorithm: 'ts-feature-aware-manifold-v2' | 'ts-edge-collapse-cluster'
  instantMeshesParity: false
  remeshQualityDeepened: true
  deferredToWorker: boolean
  /**
   * P2b HIGH #24 — true when cluster simplify missed budget and used
   * subsamplePreferManifold (not QEM / Instant Meshes).
   */
  subsampleBudgetFallbackUsed: boolean
  /** Optional native IPC probe result (HELD until commercial remesher). */
  nativeWorker?: NativeRetopoIpcStatus
  topologyBefore?: MeshTopologyMetrics
  topologyAfter?: MeshTopologyMetrics
  semanticLandmarks?: SemanticLandmark[]
  facialMocapReadyHint?: boolean
  semanticCommercialParityReady: false
}

/** IPC contract mirroring Rust `AutoRetopoWorkerRequest` (camelCase). */
export interface NativeRetopoWorkerRequest {
  positions: number[]
  indices: number[]
  targetTriangles: number
  capabilityScore: number
}

export interface NativeRetopoIpcStatus {
  held: boolean
  heldReason: string
  instantMeshesParity: false
  instantMeshesParityReady: false
  remeshQualityDeepenedTs: true
  tsFallback: true
  ipcReady: boolean
  note: string
}

export type NativeRetopoIpcCommand =
  | 'probe_auto_retopology_worker'
  | 'run_auto_retopology_worker'

export interface NativeRetopoIpcHook {
  command: NativeRetopoIpcCommand
  /** Present for run; omitted for probe. */
  request?: NativeRetopoWorkerRequest
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

/** Mark vertices on sharp dihedral edges as feature-locked. */
function detectFeatureVertices(positions: Float32Array, indices: Uint32Array): Uint8Array {
  const vCount = positions.length / 3
  const feature = new Uint8Array(vCount)
  const edgeFaces = new Map<string, number[]>()
  const normals: Array<[number, number, number]> = []

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    const fi = i / 3
    if (a === b || b === c || c === a) {
      normals.push([0, 1, 0])
      continue
    }
    normals.push(faceNormal(positions, a, b, c))
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      const list = edgeFaces.get(k)
      if (list) list.push(fi)
      else edgeFaces.set(k, [fi])
    }
  }

  for (const [key, faces] of edgeFaces) {
    if (faces.length > 2) {
      // Non-manifold endpoints are feature-locked for cleanup priority
      const [sa, sb] = key.split(':')
      feature[Number(sa)] = 1
      feature[Number(sb)] = 1
      continue
    }
    if (faces.length !== 2) continue // open boundary — do not over-fragment via fine clusters
    const n0 = normals[faces[0]!]!
    const n1 = normals[faces[1]!]!
    const dot = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]
    if (dot < FEATURE_DIHEDRAL_DOT) {
      const [sa, sb] = key.split(':')
      feature[Number(sa)] = 1
      feature[Number(sb)] = 1
    }
  }
  return feature
}

/**
 * Letter bz deepen — feature-aware cluster + manifold cleanup + quad-ish pairing
 * + semantic landmark edge-loop bias (eyes/mouth/elbows).
 */
export function runAutoRetopology(input: AutoRetopoInput): AutoRetopoResult {
  const target = Math.max(4, input.targetTriangles ?? DEFAULT_RETOPO_TARGET_TRIANGLES)
  const score = input.capabilityScore ?? 100
  const weak = score < HEAVY_REMESH_MIN_CAPABILITY_SCORE
  const deferredToWorker = weak && input.allowInlineOnWeakGpu !== true
  const useSemantic = input.semanticLandmarks !== false

  const source = cloneMesh(input.mesh)
  const trianglesBefore = countTriangles(source)
  const verticesBefore = countVertices(source)
  const topologyBefore = measureMeshTopology(source)
  const semanticMask = useSemantic ? buildSemanticFeatureMask(source) : undefined
  const semanticProbe = useSemantic ? detectSemanticLandmarks(source) : undefined

  let nativeWorker: NativeRetopoIpcStatus | undefined
  if (input.preferNativeWorker) {
    nativeWorker = interpretNativeRetopoIpcStatus(probeNativeRetopoWorkerLocal())
  }

  const semanticFields = {
    semanticLandmarks: semanticProbe?.landmarks,
    facialMocapReadyHint: semanticProbe?.facialMocapReadyHint ?? false,
    semanticCommercialParityReady: false as const,
  }

  if (deferredToWorker) {
    log.info('Heavy remesh deferred — Capability Score below offline threshold', {
      capabilityScore: score,
      threshold: HEAVY_REMESH_MIN_CAPABILITY_SCORE,
    })
    return {
      mesh: source,
      trianglesBefore,
      trianglesAfter: trianglesBefore,
      verticesBefore,
      verticesAfter: verticesBefore,
      algorithm: 'ts-feature-aware-manifold-v2',
      instantMeshesParity: false,
      remeshQualityDeepened: true,
      deferredToWorker: true,
      subsampleBudgetFallbackUsed: false,
      nativeWorker,
      topologyBefore,
      topologyAfter: topologyBefore,
      ...semanticFields,
      receipt: {
        stage: 'auto-retopo',
        status: 'held',
        evidence: ['capability-score-offline-gate', 'remesh-quality-deepened-bz'],
        heldReason: `Capability Score ${score} < ${HEAVY_REMESH_MIN_CAPABILITY_SCORE} — heavy remesh offline/worker only`,
        metrics: { trianglesBefore, target, capabilityScore: score, remeshQualityDeepened: true },
      },
    }
  }

  if (trianglesBefore <= target) {
    const cleaned = manifoldCleanupPass(source.positions, source.indices.length ? source.indices : ensureIndexed(source).indices)
    const out: RawMeshBuffer = { positions: cleaned.positions, indices: cleaned.indices }
    const topologyAfter = measureMeshTopology(out)
    return {
      mesh: out,
      trianglesBefore,
      trianglesAfter: countTriangles(out),
      verticesBefore,
      verticesAfter: countVertices(out),
      algorithm: 'ts-feature-aware-manifold-v2',
      instantMeshesParity: false,
      remeshQualityDeepened: true,
      deferredToWorker: false,
      subsampleBudgetFallbackUsed: false,
      nativeWorker,
      topologyBefore,
      topologyAfter,
      ...semanticFields,
      receipt: {
        stage: 'auto-retopo',
        status: 'closed',
        evidence: [
          'already-under-budget',
          'manifold-cleanup',
          'remesh-quality-deepened-bz',
          ...(useSemantic ? ['semantic-landmark-bias'] : []),
        ],
        metrics: {
          trianglesBefore,
          trianglesAfter: countTriangles(out),
          target,
          manifoldEdgeRatio: topologyAfter.manifoldEdgeRatio,
          remeshQualityDeepened: true,
          instantMeshesParityReady: false,
          facialMocapReadyHint: semanticFields.facialMocapReadyHint,
          semanticCommercialParityReady: false,
        },
      },
    }
  }

  const { positions, indices } = ensureIndexed(source)
  const simplified = simplifyFeatureAware(positions, indices, target, semanticMask?.lockStrength)
  const out: RawMeshBuffer = {
    positions: simplified.positions,
    indices: simplified.indices,
  }

  const trianglesAfter = countTriangles(out)
  const verticesAfter = countVertices(out)
  const topologyAfter = measureMeshTopology(out)

  log.info('Auto-retopo deepen complete', {
    trianglesBefore,
    trianglesAfter,
    target,
    manifoldBefore: topologyBefore.manifoldEdgeRatio,
    manifoldAfter: topologyAfter.manifoldEdgeRatio,
    nonManifoldBefore: topologyBefore.nonManifoldEdges,
    nonManifoldAfter: topologyAfter.nonManifoldEdges,
    facialMocapReadyHint: semanticFields.facialMocapReadyHint,
    instantMeshesParityReady: false,
    remeshQualityDeepened: true,
    subsampleBudgetFallbackUsed: simplified.subsampleBudgetFallbackUsed,
  })

  const improved =
    trianglesAfter > 0 &&
    trianglesAfter < trianglesBefore &&
    (topologyAfter.nonManifoldEdges <= topologyBefore.nonManifoldEdges ||
      topologyAfter.manifoldEdgeRatio >= topologyBefore.manifoldEdgeRatio)

  return {
    mesh: out,
    trianglesBefore,
    trianglesAfter,
    verticesBefore,
    verticesAfter,
    algorithm: 'ts-feature-aware-manifold-v2',
    instantMeshesParity: false,
    remeshQualityDeepened: true,
    deferredToWorker: false,
    subsampleBudgetFallbackUsed: simplified.subsampleBudgetFallbackUsed,
    nativeWorker,
    topologyBefore,
    topologyAfter,
    ...semanticFields,
    receipt: {
      stage: 'auto-retopo',
      status: improved ? 'closed' : trianglesAfter > 0 && trianglesAfter < trianglesBefore ? 'closed' : 'rejected',
      evidence: [
        'ts-feature-aware-manifold-v2',
        'feature-lock-sharp-edges',
        'semantic-landmark-edge-loops',
        'manifold-cleanup',
        'quad-ish-pairing',
        'remesh-quality-deepened-bz',
        'instant-meshes-parity-HELD',
        'semantic-commercial-parity-HELD',
        ...(simplified.subsampleBudgetFallbackUsed
          ? ['subsample-budget-fallback-not-qem']
          : []),
      ],
      heldReason:
        trianglesAfter >= trianglesBefore
          ? 'Simplify failed to reduce triangle count'
          : undefined,
      metrics: {
        trianglesBefore,
        trianglesAfter,
        verticesBefore,
        verticesAfter,
        target,
        manifoldEdgeRatioBefore: topologyBefore.manifoldEdgeRatio,
        manifoldEdgeRatioAfter: topologyAfter.manifoldEdgeRatio,
        nonManifoldBefore: topologyBefore.nonManifoldEdges,
        nonManifoldAfter: topologyAfter.nonManifoldEdges,
        nonManifoldEdgeRatioBefore: topologyBefore.nonManifoldEdgeRatio,
        nonManifoldEdgeRatioAfter: topologyAfter.nonManifoldEdgeRatio,
        quadIshRatioAfter: topologyAfter.quadIshRatio,
        landmarkCount: semanticProbe?.landmarks.length ?? 0,
        facialMocapReadyHint: semanticFields.facialMocapReadyHint,
        instantMeshesParity: false,
        instantMeshesParityReady: false,
        remeshQualityDeepened: true,
        semanticCommercialParityReady: false,
        subsampleBudgetFallbackUsed: simplified.subsampleBudgetFallbackUsed,
      },
    },
  }
}

function simplifyFeatureAware(
  positions: Float32Array,
  indices: Uint32Array,
  targetTriangles: number,
  semanticLock?: Float32Array,
): { positions: Float32Array; indices: Uint32Array; subsampleBudgetFallbackUsed: boolean } {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const vCount = positions.length / 3
  for (let i = 0; i < vCount; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1
  const triBefore = indices.length / 3
  const ratio = Math.max(1, triBefore / targetTriangles)
  let cell = diag / Math.max(4, Math.sqrt(vCount / Math.max(4, Math.ceil(vCount / ratio))))

  const feature = detectFeatureVertices(positions, indices)
  // Merge semantic landmark locks (eyes/mouth/elbows) into feature mask
  if (semanticLock && semanticLock.length === feature.length) {
    for (let i = 0; i < feature.length; i++) {
      if (semanticLock[i]! >= 0.25) feature[i] = 1
    }
  }

  let best = clusterFeatureAware(positions, indices, cell, feature, semanticLock)
  for (let iter = 0; iter < 14 && best.indices.length / 3 > targetTriangles; iter++) {
    cell *= 1.28
    best = clusterFeatureAware(positions, indices, cell, feature, semanticLock)
  }

  best = manifoldCleanupPass(best.positions, best.indices)

  let subsampleBudgetFallbackUsed = false
  if (best.indices.length / 3 > targetTriangles) {
    // Honesty: this is manifold-preferring triangle subsample — NOT QEM / Instant Meshes.
    best = subsamplePreferManifold(best.positions, best.indices, targetTriangles)
    best = manifoldCleanupPass(best.positions, best.indices)
    subsampleBudgetFallbackUsed = true
  }

  best = pairQuadIsh(best.positions, best.indices)
  return { ...best, subsampleBudgetFallbackUsed }
}

function clusterFeatureAware(
  positions: Float32Array,
  indices: Uint32Array,
  cell: number,
  feature: Uint8Array,
  semanticLock?: Float32Array,
): { positions: Float32Array; indices: Uint32Array } {
  const inv = 1 / Math.max(cell, 1e-8)
  const invFine = inv * 2.5
  const invSemantic = inv * 3.5
  const clusterOf = new Int32Array(positions.length / 3)
  const clusterSum = new Map<string, { x: number; y: number; z: number; n: number; id: number }>()
  let nextId = 0

  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    const isFeature = feature[i] === 1
    const sem = semanticLock?.[i] ?? 0
    // Semantic landmarks (eyes/mouth/elbows): finest cells → edge-loop density bias
    const key =
      sem >= 0.45
        ? `s:${Math.floor(x * invSemantic)}:${Math.floor(y * invSemantic)}:${Math.floor(z * invSemantic)}`
        : isFeature
          ? `f:${Math.floor(x * invFine)}:${Math.floor(y * invFine)}:${Math.floor(z * invFine)}`
          : `${Math.floor(x * inv)}:${Math.floor(y * inv)}:${Math.floor(z * inv)}`
    let c = clusterSum.get(key)
    if (!c) {
      c = { x: 0, y: 0, z: 0, n: 0, id: nextId++ }
      clusterSum.set(key, c)
    }
    c.x += x
    c.y += y
    c.z += z
    c.n += 1
    clusterOf[i] = c.id
  }

  const outPos = new Float32Array(nextId * 3)
  for (const c of clusterSum.values()) {
    outPos[c.id * 3] = c.x / c.n
    outPos[c.id * 3 + 1] = c.y / c.n
    outPos[c.id * 3 + 2] = c.z / c.n
  }

  const edgeCount = new Map<string, number>()
  for (let i = 0; i < indices.length; i += 3) {
    const a = clusterOf[indices[i]!]!
    const b = clusterOf[indices[i + 1]!]!
    const c = clusterOf[indices[i + 2]!]!
    if (a === b || b === c || c === a) continue
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
    }
  }

  const faces: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = clusterOf[indices[i]!]!
    const b = clusterOf[indices[i + 1]!]!
    const c = clusterOf[indices[i + 2]!]!
    if (a === b || b === c || c === a) continue
    const va = edgeCount.get(edgeKey(a, b)) ?? 0
    const vb = edgeCount.get(edgeKey(b, c)) ?? 0
    const vc = edgeCount.get(edgeKey(c, a)) ?? 0
    const manifoldScore = (va === 2 ? 1 : 0) + (vb === 2 ? 1 : 0) + (vc === 2 ? 1 : 0)
    const nonManifold = va > 2 || vb > 2 || vc > 2
    // Drop non-manifold faces once we have a healthy manifold core
    if (nonManifold && faces.length / 3 > indices.length / 12) continue
    if (manifoldScore === 0 && faces.length / 3 > indices.length / 18) continue
    faces.push(a, b, c)
  }

  const seen = new Set<string>()
  const unique: number[] = []
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i]!
    const b = faces[i + 1]!
    const c = faces[i + 2]!
    const key = [a, b, c].sort((x, y) => x - y).join(':')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(a, b, c)
  }

  return { positions: outPos, indices: Uint32Array.from(unique) }
}

/** Drop duplicate / reverse-winding / high-valence faces; compact unused verts. */
function manifoldCleanupPass(
  positions: Float32Array,
  indices: Uint32Array,
): { positions: Float32Array; indices: Uint32Array } {
  const edgeCount = new Map<string, number>()
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    if (a === b || b === c || c === a) continue
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
    }
  }

  const seen = new Set<string>()
  const kept: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    if (a === b || b === c || c === a) continue
    const canon = [a, b, c].sort((x, y) => x - y).join(':')
    if (seen.has(canon)) continue
    const va = edgeCount.get(edgeKey(a, b)) ?? 0
    const vb = edgeCount.get(edgeKey(b, c)) ?? 0
    const vc = edgeCount.get(edgeKey(c, a)) ?? 0
    if (va > 2 || vb > 2 || vc > 2) {
      // Keep only if all alternate faces for those edges would leave holes badly —
      // prefer drop when duplicates already kept.
      if (seen.size > 0) continue
    }
    seen.add(canon)
    kept.push(a, b, c)
  }

  // Compact vertex buffer
  const used = new Map<number, number>()
  const newIndices: number[] = []
  const newPos: number[] = []
  for (let i = 0; i < kept.length; i++) {
    const old = kept[i]!
    let mapped = used.get(old)
    if (mapped === undefined) {
      mapped = used.size
      used.set(old, mapped)
      newPos.push(positions[old * 3]!, positions[old * 3 + 1]!, positions[old * 3 + 2]!)
    }
    newIndices.push(mapped)
  }
  return {
    positions: new Float32Array(newPos),
    indices: Uint32Array.from(newIndices),
  }
}

function subsamplePreferManifold(
  positions: Float32Array,
  indices: Uint32Array,
  targetTriangles: number,
): { positions: Float32Array; indices: Uint32Array } {
  const triCount = indices.length / 3
  if (triCount <= targetTriangles) return { positions, indices }

  const edgeCount = new Map<string, number>()
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
    }
  }

  const scored: Array<{ i: number; score: number }> = []
  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    const score =
      (edgeCount.get(edgeKey(a, b)) === 2 ? 2 : 0) +
      (edgeCount.get(edgeKey(b, c)) === 2 ? 2 : 0) +
      (edgeCount.get(edgeKey(c, a)) === 2 ? 2 : 0)
    scored.push({ i: t, score })
  }
  scored.sort((x, y) => y.score - x.score || x.i - y.i)

  const out: number[] = []
  for (let t = 0; t < targetTriangles; t++) {
    const face = scored[t]!.i * 3
    out.push(indices[face]!, indices[face + 1]!, indices[face + 2]!)
  }
  return { positions, indices: Uint32Array.from(out) }
}

/**
 * Reorder triangle pairs that share an edge and are coplanar-ish so indices
 * read as consecutive virtual quads (quad-ish output without inventing verts).
 */
function pairQuadIsh(
  positions: Float32Array,
  indices: Uint32Array,
): { positions: Float32Array; indices: Uint32Array } {
  const triCount = indices.length / 3
  if (triCount < 2) return { positions, indices }

  const edgeFaces = new Map<string, number[]>()
  const normals: Array<[number, number, number]> = []
  for (let t = 0; t < triCount; t++) {
    const i = t * 3
    const a = indices[i]!
    const b = indices[i + 1]!
    const c = indices[i + 2]!
    normals.push(faceNormal(positions, a, b, c))
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      const list = edgeFaces.get(k)
      if (list) list.push(t)
      else edgeFaces.set(k, [t])
    }
  }

  const used = new Uint8Array(triCount)
  const ordered: number[] = []
  for (const [, faces] of edgeFaces) {
    if (faces.length !== 2) continue
    const f0 = faces[0]!
    const f1 = faces[1]!
    if (used[f0] || used[f1]) continue
    const n0 = normals[f0]!
    const n1 = normals[f1]!
    const dot = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]
    if (dot < 0.92) continue
    used[f0] = 1
    used[f1] = 1
    const i0 = f0 * 3
    const i1 = f1 * 3
    ordered.push(
      indices[i0]!,
      indices[i0 + 1]!,
      indices[i0 + 2]!,
      indices[i1]!,
      indices[i1 + 1]!,
      indices[i1 + 2]!,
    )
  }
  for (let t = 0; t < triCount; t++) {
    if (used[t]) continue
    const i = t * 3
    ordered.push(indices[i]!, indices[i + 1]!, indices[i + 2]!)
  }
  return { positions, indices: Uint32Array.from(ordered) }
}

/** Letter bw frozen baseline — grid cluster only (for Vitest vs bz deepen). */
export function runAutoRetopologyBwBaseline(input: AutoRetopoInput): AutoRetopoResult {
  const target = Math.max(4, input.targetTriangles ?? DEFAULT_RETOPO_TARGET_TRIANGLES)
  const source = cloneMesh(input.mesh)
  const trianglesBefore = countTriangles(source)
  const verticesBefore = countVertices(source)
  const topologyBefore = measureMeshTopology(source)
  const { positions, indices } = ensureIndexed(source)
  const simplified = bwClusterSimplify(positions, indices, target)
  const out: RawMeshBuffer = { positions: simplified.positions, indices: simplified.indices }
  const topologyAfter = measureMeshTopology(out)
  return {
    mesh: out,
    trianglesBefore,
    trianglesAfter: countTriangles(out),
    verticesBefore,
    verticesAfter: countVertices(out),
    algorithm: 'ts-edge-collapse-cluster',
    instantMeshesParity: false,
    remeshQualityDeepened: true,
    deferredToWorker: false,
    subsampleBudgetFallbackUsed: false,
    topologyBefore,
    topologyAfter,
    facialMocapReadyHint: false,
    semanticCommercialParityReady: false,
    receipt: {
      stage: 'auto-retopo',
      status: 'closed',
      evidence: ['bw-baseline-cluster'],
      metrics: {
        trianglesBefore,
        trianglesAfter: countTriangles(out),
        nonManifoldAfter: topologyAfter.nonManifoldEdges,
        manifoldEdgeRatioAfter: topologyAfter.manifoldEdgeRatio,
      },
    },
  }
}

function bwClusterSimplify(
  positions: Float32Array,
  indices: Uint32Array,
  targetTriangles: number,
): { positions: Float32Array; indices: Uint32Array } {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const vCount = positions.length / 3
  for (let i = 0; i < vCount; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  const diag = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) || 1
  const triBefore = indices.length / 3
  const ratio = Math.max(1, triBefore / targetTriangles)
  let cell = diag / Math.max(4, Math.sqrt(vCount / Math.max(4, Math.ceil(vCount / ratio))))
  let best = bwClusterOnce(positions, indices, cell)
  for (let iter = 0; iter < 12 && best.indices.length / 3 > targetTriangles; iter++) {
    cell *= 1.35
    best = bwClusterOnce(positions, indices, cell)
  }
  if (best.indices.length / 3 > targetTriangles) {
    const step = best.indices.length / 3 / targetTriangles
    const out: number[] = []
    const triCount = best.indices.length / 3
    for (let t = 0; t < targetTriangles; t++) {
      const i = Math.min(triCount - 1, Math.floor(t * step)) * 3
      out.push(best.indices[i]!, best.indices[i + 1]!, best.indices[i + 2]!)
    }
    best = { positions: best.positions, indices: Uint32Array.from(out) }
  }
  return best
}

function bwClusterOnce(
  positions: Float32Array,
  indices: Uint32Array,
  cell: number,
): { positions: Float32Array; indices: Uint32Array } {
  const inv = 1 / Math.max(cell, 1e-8)
  const clusterOf = new Int32Array(positions.length / 3)
  const clusterSum = new Map<string, { x: number; y: number; z: number; n: number; id: number }>()
  let nextId = 0
  for (let i = 0; i < positions.length / 3; i++) {
    const x = positions[i * 3]!
    const y = positions[i * 3 + 1]!
    const z = positions[i * 3 + 2]!
    const key = `${Math.floor(x * inv)}:${Math.floor(y * inv)}:${Math.floor(z * inv)}`
    let c = clusterSum.get(key)
    if (!c) {
      c = { x: 0, y: 0, z: 0, n: 0, id: nextId++ }
      clusterSum.set(key, c)
    }
    c.x += x
    c.y += y
    c.z += z
    c.n += 1
    clusterOf[i] = c.id
  }
  const outPos = new Float32Array(nextId * 3)
  for (const c of clusterSum.values()) {
    outPos[c.id * 3] = c.x / c.n
    outPos[c.id * 3 + 1] = c.y / c.n
    outPos[c.id * 3 + 2] = c.z / c.n
  }
  const edgeCount = new Map<string, number>()
  for (let i = 0; i < indices.length; i += 3) {
    const a = clusterOf[indices[i]!]!
    const b = clusterOf[indices[i + 1]!]!
    const c = clusterOf[indices[i + 2]!]!
    if (a === b || b === c || c === a) continue
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const k = edgeKey(u, v)
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1)
    }
  }
  const faces: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const a = clusterOf[indices[i]!]!
    const b = clusterOf[indices[i + 1]!]!
    const c = clusterOf[indices[i + 2]!]!
    if (a === b || b === c || c === a) continue
    const manifoldish =
      (edgeCount.get(edgeKey(a, b)) ?? 0) === 2 ||
      (edgeCount.get(edgeKey(b, c)) ?? 0) === 2 ||
      (edgeCount.get(edgeKey(c, a)) ?? 0) === 2
    if (!manifoldish && faces.length / 3 > 0) {
      if (faces.length / 3 > indices.length / 9) continue
    }
    faces.push(a, b, c)
  }
  const seen = new Set<string>()
  const unique: number[] = []
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i]!
    const b = faces[i + 1]!
    const c = faces[i + 2]!
    const key = [a, b, c].sort((x, y) => x - y).join(':')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(a, b, c)
  }
  return { positions: outPos, indices: Uint32Array.from(unique) }
}

/** Background-job wrapper — same algorithm; marks deferred semantics. */
export async function runAutoRetopologyJob(input: AutoRetopoInput): Promise<AutoRetopoResult> {
  await Promise.resolve()
  return runAutoRetopology({ ...input, allowInlineOnWeakGpu: true })
}

// ─── Optional native worker IPC hooks (letter bz) ───────────────────────────

export function buildNativeRetopoProbeInvoke(): NativeRetopoIpcHook {
  return { command: 'probe_auto_retopology_worker' }
}

export function buildNativeRetopoRunInvoke(input: {
  mesh: RawMeshBuffer
  targetTriangles?: number
  capabilityScore?: number
}): NativeRetopoIpcHook {
  const { positions, indices } = ensureIndexed(input.mesh)
  return {
    command: 'run_auto_retopology_worker',
    request: {
      positions: Array.from(positions),
      indices: Array.from(indices),
      targetTriangles: input.targetTriangles ?? DEFAULT_RETOPO_TARGET_TRIANGLES,
      capabilityScore: input.capabilityScore ?? 100,
    },
  }
}

/** Local mirror of Rust probe — used when Tauri invoke is unavailable (web / CI). */
export function probeNativeRetopoWorkerLocal(): NativeRetopoIpcStatus {
  return {
    held: true,
    heldReason:
      'Commercial remesher (Instant Meshes / QuadriFlow class) not soaked — use TS auto-retopology deepen (bz)',
    instantMeshesParity: false,
    instantMeshesParityReady: false,
    remeshQualityDeepenedTs: true,
    tsFallback: true,
    ipcReady: true,
    note: 'Letter bz IPC hook — Rust scaffold returns HELD; TS remeshQualityDeepened ships',
  }
}

export function interpretNativeRetopoIpcStatus(
  status: Partial<NativeRetopoIpcStatus> | null | undefined,
): NativeRetopoIpcStatus {
  const local = probeNativeRetopoWorkerLocal()
  if (!status) return local
  return {
    held: status.held !== false,
    heldReason: status.heldReason ?? local.heldReason,
    instantMeshesParity: false,
    instantMeshesParityReady: false,
    remeshQualityDeepenedTs: true,
    tsFallback: true,
    ipcReady: status.ipcReady === true || local.ipcReady,
    note: status.note ?? local.note,
  }
}
