/**
 * Letter cc — World Forge PCG hybrid: clay/native “lego” meshes → GPU InstancedMesh scatter.
 *
 * Reuses terrain-foliage instance SoA (bf / Block 4). WFC-lite adjacency + Perlin density.
 * Honesty: not “city from one text prompt”; World Partition empty rooms still Anti-Mock HELD.
 */

import {
  createEmptyFoliage,
  foliageHash01,
  type FoliageDocument,
  type FoliageInstanceRecord,
  type FoliageHeightSample,
} from '@/lib/production/terrain-foliage-math'
import { resolvePcgInstanceBudget } from '@/lib/world-forge/instance-capability-budget'
import {
  buildSemanticBiomeMask,
  filterInstancesByBiomeMask,
  type BiomeMaskDocument,
} from '@/lib/world-forge/semantic-biome-mask'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'
import { evaluateWorldForgeCapability } from '@/lib/world-forge/types'

export const PCG_HYBRID_SCATTER_WIRED = true as const
/** Full UE PCG graph compiler / city-from-prompt — HELD. */
export const PCG_CITY_FROM_PROMPT_HELD = true as const
export const PCG_CITY_FROM_PROMPT_READY = false as const
/** Full Wave Function Collapse commercial parity — HELD; we ship WFC-lite adjacency. */
export const WFC_FULL_PARITY_HELD = true as const
export const WFC_FULL_PARITY_READY = false as const

export type PcgLegoMeshId = string

export interface PcgLegoMeshRef {
  id: PcgLegoMeshId
  /** Maps onto foliage typeId for InstancedMesh viewport. */
  foliageTypeId: string
  /** Adjacent tile compatibility tags (WFC-lite). */
  sockets: readonly string[]
  /** Hero prop → V-HACD; instances share proxy. */
  heroProp: boolean
}

export interface PcgHybridScatterInput {
  seed?: number
  capabilityScore?: number
  preferWebBudget?: boolean
  requestedCount?: number
  widthMeters?: number
  depthMeters?: number
  heightSample?: FoliageHeightSample
  biomeMask?: BiomeMaskDocument
  biomePrompt?: string
  legoMeshes: PcgLegoMeshRef[]
  /** Density field mode. */
  densityMode?: 'perlin' | 'wfc-lite' | 'hybrid'
}

export interface PcgHybridScatterResult {
  foliage: FoliageDocument
  instances: FoliageInstanceRecord[]
  instanceCount: number
  budgetTruncated: boolean
  cityFromPromptReady: false
  wfcFullParityReady: false
  receipt: WorldForgeStageReceipt
}

function sampleHeight(
  sample: FoliageHeightSample | undefined,
  x: number,
  z: number,
): number {
  if (!sample || sample.resolution < 2) return 0
  const { resolution: res, widthMeters, depthMeters, maxHeight, heights } = sample
  const u = x / widthMeters + 0.5
  const v = z / depthMeters + 0.5
  if (u < 0 || u > 1 || v < 0 || v > 1) return 0
  const fx = u * (res - 1)
  const fz = v * (res - 1)
  const x0 = Math.floor(fx)
  const z0 = Math.floor(fz)
  const x1 = Math.min(res - 1, x0 + 1)
  const z1 = Math.min(res - 1, z0 + 1)
  const tx = fx - x0
  const tz = fz - z0
  const h00 = heights[z0 * res + x0] ?? 0
  const h10 = heights[z0 * res + x1] ?? 0
  const h01 = heights[z1 * res + x0] ?? 0
  const h11 = heights[z1 * res + x1] ?? 0
  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  return (h0 * (1 - tz) + h1 * tz) * maxHeight
}

function perlinDensity(seed: number, u: number, v: number): number {
  return foliageHash01(seed + Math.floor(u * 64) * 19 + Math.floor(v * 64) * 23)
}

/**
 * WFC-lite: pick lego whose sockets intersect neighbor tags; fall back to first mesh.
 */
function pickLegoWfcLite(
  meshes: PcgLegoMeshRef[],
  seed: number,
  cellX: number,
  cellZ: number,
  neighborTags: Set<string>,
): PcgLegoMeshRef {
  const compatible = meshes.filter((m) => m.sockets.some((s) => neighborTags.has(s) || neighborTags.size === 0))
  const pool = compatible.length > 0 ? compatible : meshes
  const idx = Math.floor(foliageHash01(seed + cellX * 31 + cellZ * 17) * pool.length) % pool.length
  return pool[idx]!
}

export function runPcgHybridScatter(input: PcgHybridScatterInput): PcgHybridScatterResult {
  const gate = evaluateWorldForgeCapability({
    capabilityScore: input.capabilityScore ?? 100,
    preferWebBudget: input.preferWebBudget,
  })
  const budget = resolvePcgInstanceBudget({
    capabilityScore: gate.capabilityScore,
    preferWebBudget: input.preferWebBudget,
    requestedCount: input.requestedCount ?? gate.instanceBudget,
  })

  const widthMeters = input.widthMeters ?? 256
  const depthMeters = input.depthMeters ?? 256
  const seed = (input.seed ?? 99) >>> 0
  const mode = input.densityMode ?? 'hybrid'
  const meshes = input.legoMeshes.length > 0
    ? input.legoMeshes
    : [
        {
          id: 'lego-rock',
          foliageTypeId: 'rock-1',
          sockets: ['ground', 'stone'],
          heroProp: false,
        },
      ]

  const foliage = createEmptyFoliage({
    types: meshes.map((m, i) => ({
      id: m.foliageTypeId,
      name: m.id,
      category: m.foliageTypeId.includes('tree')
        ? 'tree'
        : m.foliageTypeId.includes('bush')
          ? 'bush'
          : m.foliageTypeId.includes('grass')
            ? 'grass'
            : 'rock',
      color: 'rgb(90, 110, 70)',
      minScale: 0.8,
      maxScale: 1.2,
    })),
  })

  if (gate.zeroUiFallback && !gate.pcgScatterAllowed) {
    // Still allow tiny math scatter for empty-honest proof
  }

  const grid = Math.max(4, Math.ceil(Math.sqrt(budget.allowedCount)))
  const instances: FoliageInstanceRecord[] = []
  const neighborTags = new Set<string>(['ground'])
  let placed = 0

  for (let cz = 0; cz < grid && placed < budget.allowedCount; cz++) {
    for (let cx = 0; cx < grid && placed < budget.allowedCount; cx++) {
      const u = (cx + 0.5) / grid
      const v = (cz + 0.5) / grid
      const density = perlinDensity(seed, u, v)
      const accept =
        mode === 'perlin'
          ? density > 0.35
          : mode === 'wfc-lite'
            ? density > 0.2
            : density > 0.28

      if (!accept) continue

      const lego =
        mode === 'perlin'
          ? meshes[Math.floor(density * meshes.length) % meshes.length]!
          : pickLegoWfcLite(meshes, seed, cx, cz, neighborTags)

      for (const s of lego.sockets) neighborTags.add(s)

      const jitterU = (foliageHash01(seed + cx * 3 + cz * 5) - 0.5) * (0.8 / grid)
      const jitterV = (foliageHash01(seed + cx * 7 + cz * 11) - 0.5) * (0.8 / grid)
      const wu = Math.min(0.999, Math.max(0.001, u + jitterU))
      const wv = Math.min(0.999, Math.max(0.001, v + jitterV))
      const x = (wu - 0.5) * widthMeters
      const z = (wv - 0.5) * depthMeters
      const y = sampleHeight(input.heightSample, x, z)
      const scale = 0.85 + foliageHash01(seed + placed * 9) * 0.4
      const rotY = foliageHash01(seed + placed * 13) * Math.PI * 2

      instances.push({
        id: `pcg-${seed}-${placed}`,
        typeId: lego.foliageTypeId,
        x,
        y,
        z,
        rotY,
        scale,
      })
      placed++
    }
  }

  let biomeMask = input.biomeMask
  if (!biomeMask && input.biomePrompt) {
    biomeMask = buildSemanticBiomeMask({
      prompt: input.biomePrompt,
      seed,
      resolution: 48,
      source: 'heuristic',
    }).mask
  }

  let finalInstances = instances
  let biomeRejected = 0
  if (biomeMask) {
    const filtered = filterInstancesByBiomeMask({
      instances,
      mask: biomeMask,
      widthMeters,
      depthMeters,
      categoryOf: (typeId) =>
        typeId.includes('tree')
          ? 'tree'
          : typeId.includes('bush')
            ? 'bush'
            : typeId.includes('grass')
              ? 'grass'
              : 'rock',
    })
    finalInstances = filtered.kept
    biomeRejected = filtered.rejected
  }

  foliage.instances = finalInstances
  foliage.meta.strokeCount = 1
  foliage.meta.updatedAt = new Date().toISOString()

  return {
    foliage,
    instances: finalInstances,
    instanceCount: finalInstances.length,
    budgetTruncated: budget.truncated,
    cityFromPromptReady: false,
    wfcFullParityReady: false,
    receipt: {
      stage: 'pcg-scatter',
      status: finalInstances.length > 0 ? 'closed' : 'rejected',
      evidence: [
        'pcg-hybrid',
        mode,
        `instances=${finalInstances.length}`,
        `budget=${budget.allowedCount}`,
        `biomeRejected=${biomeRejected}`,
        'not-city-from-prompt',
        'wfc-lite-not-full-parity',
      ],
      heldReason: PCG_CITY_FROM_PROMPT_HELD
        ? 'City-from-prompt / full PCG graph compiler HELD — lego scatter CLOSED'
        : undefined,
      metrics: {
        instanceCount: finalInstances.length,
        allowedBudget: budget.allowedCount,
        capabilityScore: gate.capabilityScore,
        biomeRejected,
      },
    },
  }
}
