/**
 * Letter cc — Maestro / orchestrator types for World Forge PCG hybrid.
 * Not “city from one text prompt” — generate N unique lego refs → scatter.
 */

import type { LoraClayGenreId } from '@/lib/world-forge/lora-clay-registry'
import type { PcgLegoMeshRef } from '@/lib/world-forge/pcg-hybrid-scatter'

export const WORLD_FORGE_MAESTRO_WIRED = true as const

export type WorldForgeMaestroIntent =
  | 'sculpt-heightfield'
  | 'scatter-legos'
  | 'biome-filter'
  | 'navmesh-rebuild'
  | 'full-world-forge'

export interface WorldForgeMaestroPlan {
  intent: WorldForgeMaestroIntent
  prompt: string
  seed: number
  legoCount: number
  legoMeshes: PcgLegoMeshRef[]
  loraGenreId?: LoraClayGenreId
  biomePrompt?: string
  densityMode: 'perlin' | 'wfc-lite' | 'hybrid'
  /** Honesty stamp — never claim city-from-prompt. */
  cityFromPromptClaim: false
  notes: string[]
}

const SOCKET_SETS = [
  ['ground', 'stone'],
  ['ground', 'wood'],
  ['ground', 'ruin'],
  ['cliff', 'stone'],
  ['ground', 'organic'],
] as const

/**
 * Build a Maestro plan: N unique lego mesh refs from prompt heuristics.
 * Clay/native mesh bytes still go through ca/cb — here we only plan scatter IDs.
 */
export function buildWorldForgeMaestroPlan(input: {
  prompt: string
  seed?: number
  legoCount?: number
  loraGenreId?: LoraClayGenreId
}): WorldForgeMaestroPlan {
  const seed = (input.seed ?? 21) >>> 0
  const n = Math.max(1, Math.min(16, Math.floor(input.legoCount ?? 4)))
  const p = input.prompt.toLowerCase()
  const wantTrees = /forest|pine|wood|tree/.test(p)
  const wantRuins = /ruin|castle|temple|dungeon/.test(p)
  const wantRocks = /rock|cliff|mountain|abyss|peak/.test(p)

  const legoMeshes: PcgLegoMeshRef[] = []
  for (let i = 0; i < n; i++) {
    const sockets = SOCKET_SETS[i % SOCKET_SETS.length]!
    let foliageTypeId = 'rock-1'
    let heroProp = false
    if (wantTrees && i % 3 === 0) foliageTypeId = 'tree-1'
    else if (wantRuins && i % 2 === 0) {
      foliageTypeId = `ruin-${i}`
      heroProp = i === 0
    } else if (wantRocks) foliageTypeId = i % 2 === 0 ? 'rock-1' : 'rock-2'
    else foliageTypeId = i % 2 === 0 ? 'bush-1' : 'rock-1'

    legoMeshes.push({
      id: `lego-${seed}-${i}`,
      foliageTypeId,
      sockets: [...sockets],
      heroProp,
    })
  }

  return {
    intent: 'full-world-forge',
    prompt: input.prompt,
    seed,
    legoCount: n,
    legoMeshes,
    loraGenreId: input.loraGenreId,
    biomePrompt: input.prompt,
    densityMode: 'hybrid',
    cityFromPromptClaim: false,
    notes: [
      'Maestro plans N lego scatters — not a city from one prompt',
      'Mesh clay/native generation remains ca/cb + CostGuard/BYOK',
      'World Partition / streaming carve still HELD',
    ],
  }
}
