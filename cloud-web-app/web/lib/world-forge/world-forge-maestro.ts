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
    legoMeshes: [
      { id: 'tree_01', foliageTypeId: 'type_tree', sockets: ['ground'], heroProp: false },
      { id: 'rock_01', foliageTypeId: 'type_rock', sockets: ['ground'], heroProp: false },
    ],
    densityMode: 'hybrid',
    ecsPayloadRefId: id,
    buffer,
  }
}

export const buildWorldForgeMaestroPlanFast = buildWorldForgeMaestroPlan
