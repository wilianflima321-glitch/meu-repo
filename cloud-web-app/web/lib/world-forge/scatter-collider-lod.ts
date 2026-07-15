/**
 * Letter cc — Physics collider LOD for PCG scatter.
 * Hero props: V-HACD from ca; instances share a single proxy hull.
 */

import {
  decomposeVhacdApproximate,
  type VhacdDecompositionResult,
} from '@/lib/native-gen/vhacd-decomposition'
import type { RawMeshBuffer } from '@/lib/mesh-quality/types'
import type { PcgLegoMeshRef } from '@/lib/world-forge/pcg-hybrid-scatter'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'

export const SCATTER_COLLIDER_LOD_WIRED = true as const

export interface ScatterColliderLodPlan {
  heroHulls: Record<string, VhacdDecompositionResult>
  /** Shared proxy for non-hero instance types (box/sphere approx). */
  instanceProxy: {
    kind: 'shared-box'
    halfExtents: { x: number; y: number; z: number }
    rapierConvexPreferred: false
  }
  receipt: WorldForgeStageReceipt
}

export function buildScatterColliderLod(input: {
  legoMeshes: PcgLegoMeshRef[]
  /** Mesh buffers keyed by lego id — hero only. */
  heroMeshes?: Record<string, RawMeshBuffer>
  capabilityScore?: number
}): ScatterColliderLodPlan {
  const heroHulls: Record<string, VhacdDecompositionResult> = {}
  let heroCount = 0

  for (const lego of input.legoMeshes) {
    if (!lego.heroProp) continue
    const mesh = input.heroMeshes?.[lego.id]
    if (!mesh) continue
    heroHulls[lego.id] = decomposeVhacdApproximate({
      mesh,
      capabilityScore: input.capabilityScore ?? 100,
      maxHulls: 8,
    })
    heroCount++
  }

  return {
    heroHulls,
    instanceProxy: {
      kind: 'shared-box',
      halfExtents: { x: 0.5, y: 0.5, z: 0.5 },
      rapierConvexPreferred: false,
    },
    receipt: {
      stage: 'collider-lod',
      status: 'closed',
      evidence: [
        'vhacd-hero-only',
        'shared-instance-proxy',
        `heroes=${heroCount}`,
      ],
      metrics: { heroCount, proxy: 'shared-box' },
    },
  }
}
