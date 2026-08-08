/**
 * J.4 — CostGuard gate for BYOK cloud embeddings (Law XVI Trava I).
 * Free tier without BYOK must never platform-pay embedding calls.
 */

import {
  cancelCreativeCost,
  createMemoryCostGuardLedger,
  reserveCreativeCost,
  settleCreativeCost,
  settleCreativeCostZero,
  type CostGuardLedgerAdapter,
  type CostGuardResult,
  type CreativeCostReservation,
} from '@/lib/production/creative-cost-guard'
import { createComponentLogger } from '@/lib/observability/logger'
import type { EmbedProvider } from './embed-provider'
import { createByokCloudEmbedProvider, createLocalHashEmbedProvider } from './embed-provider'

const log = createComponentLogger('vector-index.embed-gate')

export const VECTOR_EMBED_DOMAIN = 'j4-vector-embed'

export type VectorEmbedMode = 'local-hash' | 'byok-cloud'

export interface ResolveEmbedProviderInput {
  userId: string
  projectId: string
  mode: VectorEmbedMode
  /** Header-derived BYOK key — never server vault */
  byokApiKey?: string
  planId?: string
  /** Approx chars that will be embedded (for CostGuard weight) */
  estimatedEmbedChars: number
  adapter?: CostGuardLedgerAdapter
}

export type ResolveEmbedProviderResult =
  | {
      ok: true
      provider: EmbedProvider
      mode: VectorEmbedMode
      reservation: CreativeCostReservation | null
      adapter: CostGuardLedgerAdapter
      /** Honest quality label for API readiness */
      searchQuality: 'lexical-hash' | 'byok-semantic'
    }
  | {
      ok: false
      reason: string
      /** When cloud denied, callers may fall back to local-hash */
      fallbackLocalHashAllowed: boolean
    }

function estimateTokenWeight(chars: number): number {
  return Math.max(1, Math.ceil(Math.max(0, chars) / 4))
}

/**
 * Resolve embed provider fail-closed for paid cloud path.
 * - local-hash: always OK, $0 platform
 * - byok-cloud: requires apiKey + CostGuard reserve; free tier without BYOK denied
 */
export async function resolveVectorEmbedProvider(
  input: ResolveEmbedProviderInput,
): Promise<ResolveEmbedProviderResult> {
  if (input.mode === 'local-hash') {
    return {
      ok: true,
      provider: createLocalHashEmbedProvider(),
      mode: 'local-hash',
      reservation: null,
      adapter: input.adapter ?? createMemoryCostGuardLedger(),
      searchQuality: 'lexical-hash',
    }
  }

  const apiKey = input.byokApiKey?.trim()
  if (!apiKey) {
    log.warn('byok_cloud_embed_denied_missing_key', {
      userId: input.userId,
      projectId: input.projectId,
    })
    return {
      ok: false,
      reason: 'BYOK_CLOUD_EMBED_REQUIRES_KEY',
      fallbackLocalHashAllowed: true,
    }
  }

  const adapter =
    input.adapter ??
    (() => {
      const mem = createMemoryCostGuardLedger()
      mem.enableByok(input.userId)
      return mem
    })()

  // Ensure ledger sees BYOK for this request (header-derived profile id)
  const byokProfileId = 'header-byok-embed'

  const reserved: CostGuardResult = await reserveCreativeCost(
    {
      userId: input.userId,
      projectId: input.projectId,
      domain: VECTOR_EMBED_DOMAIN,
      estimatedTokenWeight: estimateTokenWeight(input.estimatedEmbedChars),
      byokProfileId,
      planId: input.planId,
      allowPlatformPay: false,
    },
    adapter,
  )

  if (!reserved.ok) {
    log.warn('byok_cloud_embed_cost_guard_denied', {
      reason: reserved.reason,
      userId: input.userId,
      projectId: input.projectId,
    })
    return {
      ok: false,
      reason: reserved.reason,
      // free_tier_platform_pay_forbidden → do not silently platform-pay; local-hash OK
      fallbackLocalHashAllowed: reserved.reason === 'free_tier_platform_pay_forbidden' ||
        reserved.reason === 'byok_missing',
    }
  }

  const provider = createByokCloudEmbedProvider({ apiKey })
  if (!provider) {
    await settleCreativeCostZero(reserved.reservation.reservationId, adapter)
    return {
      ok: false,
      reason: 'BYOK_CLOUD_EMBED_PROVIDER_UNAVAILABLE',
      fallbackLocalHashAllowed: true,
    }
  }

  return {
    ok: true,
    provider,
    mode: 'byok-cloud',
    reservation: reserved.reservation,
    adapter,
    searchQuality: 'byok-semantic',
  }
}

export async function settleVectorEmbedReservation(input: {
  reservation: CreativeCostReservation | null
  adapter: CostGuardLedgerAdapter
  actualEmbedChars: number
  failed?: boolean
}): Promise<void> {
  if (!input.reservation) return
  if (input.failed) {
    await settleCreativeCostZero(input.reservation.reservationId, input.adapter)
    return
  }
  await settleCreativeCost(
    input.reservation.reservationId,
    estimateTokenWeight(input.actualEmbedChars),
    input.adapter,
  )
}

export async function cancelVectorEmbedReservation(input: {
  reservation: CreativeCostReservation | null
  adapter: CostGuardLedgerAdapter
}): Promise<void> {
  if (!input.reservation) return
  await cancelCreativeCost(input.reservation.reservationId, input.adapter)
}
