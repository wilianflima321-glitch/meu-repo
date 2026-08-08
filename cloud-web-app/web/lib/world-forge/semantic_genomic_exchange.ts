/**
 * P2b MEDIUM #43 — Semantic genomic exchange.
 *
 * HELD / NON-SHIP: prior revision minted fabricated `AETHEL_DNA_*` hashes and
 * claimed generative marketplace economics. Fail-closed until Treasury + real
 * seed custody exist (Hub Coins remain HELD).
 * Not exported from the World Forge barrel.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('world-forge-genomic-exchange')

export const SEMANTIC_GENOMIC_EXCHANGE_SHIP_READY = false as const

export type GenomicMintResult = {
  success: false
  heldReason: 'genomic_marketplace_held'
  genomicHash: null
}

export class SemanticGenomicExchange {
  public mintGenerativeSeed(authorId: string, semanticRules: string): GenomicMintResult {
    log.warn('genomic_mint_held', {
      heldReason: 'genomic_marketplace_held',
      authorId,
      rulesLen: semanticRules.length,
    })
    return {
      success: false,
      heldReason: 'genomic_marketplace_held',
      genomicHash: null,
    }
  }
}
