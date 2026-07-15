/**
 * Letter bw/bz — Auto LOD0/1/2 cascade from retopo mesh.
 * Letter bz: emit native-gen **ca** consumer contract (tiers only — no V-HACD / heat weights).
 */

import { runAutoRetopology } from '@/lib/mesh-quality/auto-retopology'
import {
  countTriangles,
  type MeshQualityStageReceipt,
  type RawMeshBuffer,
} from '@/lib/mesh-quality/types'

export const MESH_LOD_CASCADE_WIRED = true as const
export const MESH_LOD_CA_CONSUMER_CONTRACT = 'native-gen-lod-tiers:v1' as const

export interface MeshLodLevel {
  level: 0 | 1 | 2
  mesh: RawMeshBuffer
  triangleCount: number
  screenSizeHint: number
}

/**
 * Stable LOD handoff for letter **ca** native-gen assembly (consumer-only).
 * Does not include V-HACD colliders or heat-diffusion skin weights — those stay on **ca**.
 */
export interface NativeGenLodCaConsumerPayload {
  contractId: typeof MESH_LOD_CA_CONSUMER_CONTRACT
  sourceLetter: 'bz'
  /** Hero remesh triangle budget that seeded LOD0. */
  lod0Budget: number
  tiers: Array<{
    level: 0 | 1 | 2
    triangleCount: number
    screenSizeHint: number
    /** Positions + indices only — ca owns further cook. */
    positions: Float32Array
    indices: Uint32Array
  }>
  /** Honesty: Instant Meshes / V-HACD / heat-diffusion not claimed here. */
  instantMeshesParityReady: false
  vHacdOwnedByCa: true
  heatDiffusionWeightsOwnedByCa: true
}

export interface MeshLodCascadeResult {
  lods: MeshLodLevel[]
  /** ca-ready LOD tier payload (bz remesh output). */
  caConsumer: NativeGenLodCaConsumerPayload
  receipt: MeshQualityStageReceipt
}

const LOD_TARGETS = [
  { level: 0 as const, factor: 1.0, screen: 1.0 },
  { level: 1 as const, factor: 0.35, screen: 0.45 },
  { level: 2 as const, factor: 0.12, screen: 0.15 },
]

export function buildMeshLodCascade(input: {
  mesh: RawMeshBuffer
  lod0Triangles?: number
  capabilityScore?: number
  /** Propagate semantic landmark bias into LOD remesh (default true). */
  semanticLandmarks?: boolean
}): MeshLodCascadeResult {
  const lod0Budget = input.lod0Triangles ?? countTriangles(input.mesh)
  const lods: MeshLodLevel[] = []

  for (const spec of LOD_TARGETS) {
    const target = Math.max(4, Math.floor(lod0Budget * spec.factor))
    const result = runAutoRetopology({
      mesh: input.mesh,
      targetTriangles: target,
      capabilityScore: input.capabilityScore ?? 100,
      allowInlineOnWeakGpu: true,
      semanticLandmarks: input.semanticLandmarks !== false,
    })
    lods.push({
      level: spec.level,
      mesh: result.mesh,
      triangleCount: result.trianglesAfter,
      screenSizeHint: spec.screen,
    })
  }

  const caConsumer = toNativeGenLodCaConsumer(lods, lod0Budget)
  const ok = lods.length === 3 && lods.every((l) => l.triangleCount > 0)
  return {
    lods,
    caConsumer,
    receipt: {
      stage: 'lod-cascade',
      status: ok ? 'closed' : 'rejected',
      evidence: [
        'lod0',
        'lod1',
        'lod2',
        'from-retopo',
        'native-gen-ca-consumer-tiers',
        'v-hacd-owned-by-ca',
        'heat-diffusion-owned-by-ca',
      ],
      metrics: {
        lod0: lods[0]?.triangleCount ?? 0,
        lod1: lods[1]?.triangleCount ?? 0,
        lod2: lods[2]?.triangleCount ?? 0,
        caContract: MESH_LOD_CA_CONSUMER_CONTRACT,
      },
    },
  }
}

/** Explicit export for ca sibling without re-running remesh. */
export function toNativeGenLodCaConsumer(
  lods: MeshLodLevel[],
  lod0Budget: number,
): NativeGenLodCaConsumerPayload {
  return {
    contractId: MESH_LOD_CA_CONSUMER_CONTRACT,
    sourceLetter: 'bz',
    lod0Budget,
    tiers: lods.map((l) => ({
      level: l.level,
      triangleCount: l.triangleCount,
      screenSizeHint: l.screenSizeHint,
      positions: l.mesh.positions,
      indices: l.mesh.indices,
    })),
    instantMeshesParityReady: false,
    vHacdOwnedByCa: true,
    heatDiffusionWeightsOwnedByCa: true,
  }
}
