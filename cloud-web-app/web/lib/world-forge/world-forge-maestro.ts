/**
 * Letter cc — Maestro / Orchestrator Types for World Forge
 * Refatorado para Supremacia L5/L7: Fábrica de Instruções Binárias.
 * Remoção de overheads de GC (Zod) no Hot Path e ponteiros FFI lentos (UUID).
 */

import { z } from 'zod'
import type { LoraClayGenreId } from '@/lib/world-forge/lora-clay-registry'

export const WORLD_FORGE_MAESTRO_WIRED = true as const

export const SemanticWorldIntentSchema = z.object({
  environmentType: z.enum(['forest', 'ruin', 'mountain', 'urban', 'alien', 'ocean']),
  density: z.number().min(0).max(1),
  mood: z.string(),
  suggestedPropDistribution: z.record(z.string(), z.number())
})
export type SemanticWorldIntent = z.infer<typeof SemanticWorldIntentSchema>

// O ID numérico global para evitar UUIDs sujos de string no FFI
let _nextBufferId = 0n

/**
 * Constrói o Plano do Maestro de Baixa Latência (Binary Bridge)
 * O Zod foi removido do Hot Path. Usado apenas na entrada da IA, nunca na saída pro Rust.
 */
export function buildWorldForgeMaestroPlanFast(input: {
  semanticIntent: SemanticWorldIntent 
  targetInstanceBudget: number
}): { ecsPayloadRefId: bigint; buffer: Uint8Array } {
  const intent = input.semanticIntent
  const expectedCount = Math.floor(input.targetInstanceBudget * intent.density)

  const id = ++_nextBufferId // BigInt (u64 no Rust)

  // Emulação de FlatBuffer: Criamos um array binário puro e cru (Data-Oriented)
  // [4 bytes: OpCode] [4 bytes: Count] [N bytes: Data...]
  const buffer = new Uint8Array(8)
  const view = new DataView(buffer.buffer)
  
  view.setUint32(0, 0x01, true) // 0x01 = Comando de Instanciamento de Matéria
  view.setUint32(4, expectedCount, true) 

  // O Maestro agora é uma Fábrica de Instruções Binárias.
  // Sem Zod.parse(), sem UUID string, zero alocação de objetos aninhados de lixo.
  return {
    ecsPayloadRefId: id,
    buffer,
  }
}

export const buildWorldForgeMaestroPlan = buildWorldForgeMaestroPlanFast
