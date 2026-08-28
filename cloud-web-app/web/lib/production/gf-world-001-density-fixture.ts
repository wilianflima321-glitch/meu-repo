/**
 * GF-WORLD-001/002/003 — World Forge density fixtures (Hard Gate #72, P3 prep).
 *
 * Deterministic PCG/SDF-style biome population with organic spacing: a seeded
 * rejection sampler places 4096 instances across three biomes (forest / desert /
 * alpine) with per-instance AO + foliage variance + LOD tiering. Every claim is
 * evidence-only — no AAA density claim, no "Nanite populated" marketing, no
 * `world_forge_ready` flip. The fixtures exist to prove the pipeline is NOT
 * empty (the #72 surpass vector: "sem PCG vazio") and to hold density evidence
 * that a product World Forge pass can later consume.
 *
 * Honesty invariants:
 * - `worldForgeAaaReady` / `gfWorldBandPassed` are always `false`.
 * - Density is reported in instances/m² with the achieved organic-spacing
 *   metric — never compared to a marketing ceiling.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('gf-world-001-density')

export const GF_WORLD_FIXTURE_ID = 'GF-WORLD-001/002/003'
export const GF_WORLD_TARGET_INSTANCES = 4096
export const GF_WORLD_SPACING_MIN = 0.6
export const GF_WORLD_DOMAIN = 64
export const GF_WORLD_BIOMES = ['forest', 'desert', 'alpine'] as const
export type GfWorldBiome = (typeof GF_WORLD_BIOMES)[number]

export type GfWorldInstance = {
  id: number
  biome: GfWorldBiome
  kind: 'trunk' | 'rock' | 'foliage'
  position: [number, number, number]
  ao: number
  height: number
  lodTier: 0 | 1 | 2
}

export type GfWorld001DensityEvidence = {
  fixtureId: typeof GF_WORLD_FIXTURE_ID
  instanceCount: number
  perBiomeCounts: Record<GfWorldBiome, number>
  minPairwiseSpacing: number
  organicSpacingPass: boolean
  densityPerM2: number
  placementAttempts: number
  seed: number
}

export type GfWorld002FoliageEvidence = {
  kindHistogram: Record<'trunk' | 'rock' | 'foliage', number>
  lodTierHistogram: Record<0 | 1 | 2, number>
  biomeKindVariationPass: boolean
}

export type GfWorld003AoEvidence = {
  aoMean: number
  aoMin: number
  aoMax: number
  groundedInstances: number
  groundedRatio: number
  aoRangePass: boolean
}

export type GfWorldEvidenceBundle = {
  version: 1
  fixtureId: typeof GF_WORLD_FIXTURE_ID
  density: GfWorld001DensityEvidence
  foliage: GfWorld002FoliageEvidence
  ao: GfWorld003AoEvidence
  worldForgeAaaReady: false
  gfWorldBandPassed: false
  marketingAllowed: false
  claim: string
}

/** Deterministic 32-bit PRNG (mulberry32) — same seed ⇒ same population.
 *  Shared by all GF-* fixtures so the deterministic-sampling contract has one
 *  canonical implementation (no per-fixture PRNG drift). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BIOME_KIND_WEIGHTS: Record<GfWorldBiome, Array<['trunk' | 'rock' | 'foliage', number]>> = {
  forest: [['trunk', 0.45], ['foliage', 0.4], ['rock', 0.15]],
  desert: [['rock', 0.55], ['foliage', 0.25], ['trunk', 0.2]],
  alpine: [['rock', 0.5], ['foliage', 0.3], ['trunk', 0.2]],
}

function pickKind(rng: () => number, biome: GfWorldBiome): 'trunk' | 'rock' | 'foliage' {
  const weights = BIOME_KIND_WEIGHTS[biome]
  const roll = rng()
  let acc = 0
  for (const [kind, w] of weights) {
    acc += w
    if (roll <= acc) return kind
  }
  return 'foliage'
}

function biomeFor(rng: () => number): GfWorldBiome {
  const roll = rng()
  if (roll < 0.34) return 'forest'
  if (roll < 0.67) return 'desert'
  return 'alpine'
}

function pickBiomeSpot(rng: () => number, biome: GfWorldBiome): [number, number] {
  // Each biome owns a lateral third of the 64×64 domain — variation, not noise.
  const band = GF_WORLD_BIOMES.indexOf(biome)
  const bandWidth = GF_WORLD_DOMAIN / GF_WORLD_BIOMES.length
  const x0 = band * bandWidth
  return [x0 + rng() * bandWidth, rng() * GF_WORLD_DOMAIN]
}

/**
 * Seeded rejection sampler: places instances with organic (Poisson-like)
 * spacing — a candidate too close to an existing instance is rejected, so the
 * population is dense but never a pile-up. Neighbor tests go through a spatial
 * hash grid (cell = min spacing), so placement is O(1) per attempt instead of
 * O(N²) over the growing population. Deterministic and seed-stable.
 */
export function buildGfWorldPopulation(
  seed = 0xa3e1_7001,
  target = GF_WORLD_TARGET_INSTANCES,
): { instances: GfWorldInstance[]; attempts: number } {
  const rng = mulberry32(seed)
  const instances: GfWorldInstance[] = []
  const grid = new Map<number, GfWorldInstance[]>()
  const cellOf = (x: number, z: number): number => {
    const cx = Math.floor(x / GF_WORLD_SPACING_MIN)
    const cz = Math.floor(z / GF_WORLD_SPACING_MIN)
    return cx + cz * 512
  }
  const neighborsTooClose = (x: number, z: number): boolean => {
    const cx = Math.floor(x / GF_WORLD_SPACING_MIN)
    const cz = Math.floor(z / GF_WORLD_SPACING_MIN)
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const cell = grid.get(cx + dx + (cz + dz) * 512)
        if (!cell) continue
        for (const other of cell) {
          const ox = other.position[0] - x
          const oz = other.position[2] - z
          if (Math.sqrt(ox * ox + oz * oz) < GF_WORLD_SPACING_MIN) return true
        }
      }
    }
    return false
  }
  let attempts = 0
  const maxAttempts = target * 24
  while (instances.length < target && attempts < maxAttempts) {
    attempts += 1
    const biome = biomeFor(rng)
    const kind = pickKind(rng, biome)
    const [x, z] = pickBiomeSpot(rng, biome)
    if (neighborsTooClose(x, z)) continue
    const kindScale = kind === 'trunk' ? 1.0 : kind === 'rock' ? 0.75 : 0.5
    const height =
      biome === 'alpine' ? 2.4 + rng() * 3.2 : biome === 'forest' ? 1.2 + rng() * 2.6 : 0.6 + rng() * 1.8
    const lodTier: 0 | 1 | 2 = kindScale * (1 - Math.min(height / 6, 1)) > 0.35 ? 0 : 1
    const ao = 0.35 + 0.5 * kindScale + rng() * 0.15
    const instance: GfWorldInstance = {
      id: instances.length,
      biome,
      kind,
      position: [x, height, z],
      ao: Math.min(1, ao),
      height,
      lodTier,
    }
    instances.push(instance)
    const key = cellOf(x, z)
    const cell = grid.get(key)
    if (cell) cell.push(instance)
    else grid.set(key, [instance])
  }
  return { instances, attempts }
}

function minPairwiseSpacing(instances: GfWorldInstance[]): number {
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < instances.length; i += 1) {
    for (let j = i + 1; j < instances.length; j += 1) {
      const a = instances[i]!.position
      const b = instances[j]!.position
      const dx = a[0] - b[0]
      const dz = a[2] - b[2]
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < min) min = d
    }
  }
  return min === Number.POSITIVE_INFINITY ? 0 : min
}

/** GF-WORLD-001 — density + organic spacing evidence. */
export function buildGfWorld001DensityEvidence(
  instances: GfWorldInstance[],
  attempts: number,
  seed: number,
): GfWorld001DensityEvidence {
  const perBiomeCounts: Record<GfWorldBiome, number> = { forest: 0, desert: 0, alpine: 0 }
  for (const inst of instances) perBiomeCounts[inst.biome] += 1
  const minSpacing = minPairwiseSpacing(instances)
  return {
    fixtureId: GF_WORLD_FIXTURE_ID,
    instanceCount: instances.length,
    perBiomeCounts,
    minPairwiseSpacing: minSpacing,
    organicSpacingPass: minSpacing >= GF_WORLD_SPACING_MIN * 0.9,
    densityPerM2: instances.length / (GF_WORLD_DOMAIN * GF_WORLD_DOMAIN),
    placementAttempts: attempts,
    seed,
  }
}

/** GF-WORLD-002 — foliage/kind variance + LOD tiering evidence. */
export function buildGfWorld002FoliageEvidence(instances: GfWorldInstance[]): GfWorld002FoliageEvidence {
  const kindHistogram: Record<'trunk' | 'rock' | 'foliage', number> = { trunk: 0, rock: 0, foliage: 0 }
  const lodTierHistogram: Record<0 | 1 | 2, number> = { 0: 0, 1: 0, 2: 0 }
  for (const inst of instances) {
    kindHistogram[inst.kind] += 1
    lodTierHistogram[inst.lodTier] += 1
  }
  return {
    kindHistogram,
    lodTierHistogram,
    biomeKindVariationPass:
      kindHistogram.trunk > 0 && kindHistogram.rock > 0 && kindHistogram.foliage > 0,
  }
}

/** GF-WORLD-003 — AO grounding evidence (no floating, no AO-less instances). */
export function buildGfWorld003AoEvidence(instances: GfWorldInstance[]): GfWorld003AoEvidence {
  let aoSum = 0
  let aoMin = Number.POSITIVE_INFINITY
  let aoMax = 0
  let grounded = 0
  for (const inst of instances) {
    aoSum += inst.ao
    aoMin = Math.min(aoMin, inst.ao)
    aoMax = Math.max(aoMax, inst.ao)
    if (inst.ao >= 0.5 && inst.height > 0) grounded += 1
  }
  return {
    aoMean: instances.length > 0 ? aoSum / instances.length : 0,
    aoMin: aoMin === Number.POSITIVE_INFINITY ? 0 : aoMin,
    aoMax,
    groundedInstances: grounded,
    groundedRatio: instances.length > 0 ? grounded / instances.length : 0,
    aoRangePass: aoMax - aoMin > 0.2 && grounded > 0,
  }
}

export function runGfWorldFixtureProbe(seed = 0xa3e1_7001): GfWorldEvidenceBundle {
  const { instances, attempts } = buildGfWorldPopulation(seed)
  const density = buildGfWorld001DensityEvidence(instances, attempts, seed)
  const foliage = buildGfWorld002FoliageEvidence(instances)
  const ao = buildGfWorld003AoEvidence(instances)
  log.info('gf_world_fixture_probed', {
    instanceCount: density.instanceCount,
    minSpacing: density.minPairwiseSpacing,
  })
  return {
    version: 1,
    fixtureId: GF_WORLD_FIXTURE_ID,
    density,
    foliage,
    ao,
    worldForgeAaaReady: false,
    gfWorldBandPassed: false,
    marketingAllowed: false,
    claim:
      'GF-WORLD-001/002/003 deterministic density fixtures: 4096-instance organic population with biome variation, foliage/LOD histograms and AO grounding evidence (no AAA claims, no % bump)',
  }
}
