/**
 * Letter cc — Maestro / Orchestrator Types for World Forge
 * Refatorado para Supremacia L5/L7: Fábrica de Instruções Binárias.
 * Remoção de overheads de GC (Zod) no Hot Path e ponteiros FFI lentos (UUID).
 */

import { z } from 'zod'
import type { LoraClayGenreId } from '@/lib/world-forge/lora-clay-registry'
import {
  evaluateWorldForgeMaestroSuccessBarrier,
  gateWorldForgeMissionSuccess,
} from '@/lib/world-forge/world-forge-maestro-barrier'

export const WORLD_FORGE_MAESTRO_WIRED = true as const

export {
  evaluateWorldForgeMaestroSuccessBarrier,
  gateWorldForgeMissionSuccess,
}

export const SemanticWorldIntentSchema = z.object({
  environmentType: z.enum(['forest', 'ruin', 'mountain', 'urban', 'alien', 'ocean']),
  density: z.number().min(0).max(1),
  mood: z.string(),
  suggestedPropDistribution: z.record(z.string(), z.number())
})
export type SemanticWorldIntent = z.infer<typeof SemanticWorldIntentSchema>

import type { PcgLegoMeshRef } from '@/lib/world-forge/pcg-hybrid-scatter'

let _nextBufferId = 0n

/**
 * Deterministic lego mesh template pool. The plan materializes `legoCount` distinct
 * refs by cycling these templates with padded unique ids — honoring the input instead
 * of returning a hard-coded 2-ref stub. All heroProp are false: the plan never claims
 * hero-prop/hero-mesh derivation from the prompt (Zero-MVP honesty).
 */
const LEGO_MESH_TEMPLATES: ReadonlyArray<Omit<PcgLegoMeshRef, 'id'>> = [
  { foliageTypeId: 'type_tree', sockets: ['ground'], heroProp: false },
  { foliageTypeId: 'type_rock', sockets: ['ground'], heroProp: false },
  { foliageTypeId: 'type_ruin', sockets: ['ground', 'stone'], heroProp: false },
  { foliageTypeId: 'type_crystal', sockets: ['ground'], heroProp: false },
]

function buildLegoMeshRefs(count: number): PcgLegoMeshRef[] {
  const refs: PcgLegoMeshRef[] = []
  for (let i = 0; i < count; i++) {
    const template = LEGO_MESH_TEMPLATES[i % LEGO_MESH_TEMPLATES.length]!
    refs.push({ id: `lego_${String(i + 1).padStart(3, '0')}`, ...template })
  }
  return refs
}

export function buildWorldForgeMaestroPlan(input: {
  prompt?: string
  seed?: number
  legoCount?: number
  loraGenreId?: LoraClayGenreId
  semanticIntent?: SemanticWorldIntent 
  targetInstanceBudget?: number
}): {
  prompt: string
  seed: number
  biomePrompt: string
  legoMeshes: PcgLegoMeshRef[]
  densityMode: 'hybrid' | 'perlin' | 'wfc-lite'
  ecsPayloadRefId: bigint
  buffer: Uint8Array
  /** Always false — the prompt seeds math, never a literal derived city claim (Zero-MVP honesty). */
  cityFromPromptClaim: false
} {
  const prompt = input.prompt ?? 'forest'
  const seed = input.seed ?? 1337
  const count = input.legoCount ?? 64
  const id = ++_nextBufferId

  const buffer = new Uint8Array(8)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, 0x01, true)
  view.setUint32(4, count, true)

  return {
    prompt,
    seed,
    biomePrompt: `${prompt} biome`,
    legoMeshes: buildLegoMeshRefs(count),
    densityMode: 'hybrid',
    ecsPayloadRefId: id,
    buffer,
    cityFromPromptClaim: false,
  }
}

export const buildWorldForgeMaestroPlanFast = buildWorldForgeMaestroPlan
