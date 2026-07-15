/**
 * Block 6F — Creative Wallet
 * Separate ledger lane from LLM Fast/Premium. Video ≠ drain Pro Premium.
 * Credits = ceil(weightedTokens / CREATIVE_CREDITS_PER_WEIGHTED_K)
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  getCreativeEntitlements,
  type CreativeModality,
} from '@/lib/creative-provider-matrix'
import type { PlanId } from '@/lib/plans'

const log = createComponentLogger('creative-wallet')

/** 1000 weighted tokens ≈ 1 creative credit (binding 6F.2) */
export const CREATIVE_WEIGHTED_PER_CREDIT = 1_000

export const CREATIVE_LEDGER_LANE = 'creative' as const

export function weightedTokensToCreativeCredits(weightedTokens: number): number {
  if (!Number.isFinite(weightedTokens) || weightedTokens <= 0) return 0
  return Math.max(1, Math.ceil(weightedTokens / CREATIVE_WEIGHTED_PER_CREDIT))
}

export function creativeMonthPeriodKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function asPlanId(plan: string): PlanId {
  const base = plan.replace(/_trial$/, '') as PlanId
  return base
}

function isCreativeLaneMeta(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
  return (metadata as Record<string, unknown>).lane === CREATIVE_LEDGER_LANE
}

/**
 * Recompute creative balance from ledger (lane=creative only).
 */
export async function computeCreativeBalanceFromLedger(
  userId: string,
  client: typeof prisma = prisma,
): Promise<number> {
  const entries = await client.creditLedgerEntry.findMany({
    where: { userId },
    select: { amount: true, entryType: true, metadata: true },
  })

  let balance = 0
  for (const entry of entries) {
    if (!isCreativeLaneMeta(entry.metadata)) continue
    const meta = entry.metadata as Record<string, unknown>
    if (entry.entryType === 'RESERVATION' && meta.settled === false) {
      balance += entry.amount // reservations are negative holds
      continue
    }
    if (meta.settled === false && entry.entryType === 'RESERVATION') {
      balance += entry.amount
      continue
    }
    // Settled or grants: apply amount
    if (entry.entryType === 'RESERVATION' && meta.settled === true) {
      // Reservation already converted to SETTLEMENT — skip raw hold
      continue
    }
    balance += entry.amount
  }
  return Math.max(0, balance)
}

export async function getCreativeCreditBalance(userId: string): Promise<number> {
  if (!userId) return 0
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      creativeCreditBalance: true,
      creativeCreditBalanceSyncedAt: true,
      plan: true,
    },
  })
  if (!user) return 0

  await ensureMonthlyCreativeGrant(userId, user.plan || 'free')

  if (user.creativeCreditBalanceSyncedAt) {
    // Refresh after grant may have updated — re-read
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { creativeCreditBalance: true, creativeCreditBalanceSyncedAt: true },
    })
    if (fresh?.creativeCreditBalanceSyncedAt) {
      return Math.max(0, fresh.creativeCreditBalance)
    }
  }

  const computed = await computeCreativeBalanceFromLedger(userId)
  await prisma.user.update({
    where: { id: userId },
    data: {
      creativeCreditBalance: computed,
      creativeCreditBalanceSyncedAt: new Date(),
    },
  })
  return computed
}

/**
 * Idempotent monthly included creative credits from plan entitlements.
 */
export async function ensureMonthlyCreativeGrant(
  userId: string,
  planRaw: string,
): Promise<{ granted: boolean; amount: number }> {
  const planId = asPlanId(planRaw)
  const entitlements = getCreativeEntitlements(planId)
  const included = entitlements.includedCreativeCreditsPerMonth ?? 0
  if (included === 0) return { granted: false, amount: 0 }
  if (included < 0) return { granted: false, amount: -1 } // unlimited flag

  const period = creativeMonthPeriodKey()
  const existing = await prisma.creditLedgerEntry.findFirst({
    where: {
      userId,
      entryType: 'CREATIVE_MONTHLY_GRANT',
      metadata: {
        path: ['period'],
        equals: period,
      },
    },
    select: { id: true },
  })
  if (existing) return { granted: false, amount: 0 }

  await prisma.$transaction(async (tx) => {
    await tx.creditLedgerEntry.create({
      data: {
        userId,
        amount: included,
        currency: 'credits',
        entryType: 'CREATIVE_MONTHLY_GRANT',
        reference: `creative-grant-${period}`,
        metadata: {
          lane: CREATIVE_LEDGER_LANE,
          period,
          planId,
        },
      },
    })
    await tx.user.update({
      where: { id: userId },
      data: {
        creativeCreditBalance: { increment: included },
        creativeCreditBalanceSyncedAt: new Date(),
      },
    })
  })

  log.info('creative_monthly_grant', { userId, period, amount: included, planId })
  return { granted: true, amount: included }
}

export type CreativeReservation = {
  reservationId: string
  credits: number
  modality?: string
}

/**
 * Reserve creative credits (negative RESERVATION hold). Never touches LLM UsageBucket.
 */
export async function reserveCreativeCredits(input: {
  userId: string
  credits: number
  modality?: CreativeModality | string
  reference?: string
  weightedTokens?: number
}): Promise<CreativeReservation | null> {
  const credits = Math.max(1, Math.floor(input.credits))
  await ensureMonthlyCreativeGrant(
    input.userId,
    (
      await prisma.user.findUnique({
        where: { id: input.userId },
        select: { plan: true },
      })
    )?.plan || 'free',
  )

  const balance = await getCreativeCreditBalance(input.userId)
  const entitlements = getCreativeEntitlements(
    asPlanId(
      (
        await prisma.user.findUnique({
          where: { id: input.userId },
          select: { plan: true },
        })
      )?.plan || 'free',
    ),
  )
  if ((entitlements.includedCreativeCreditsPerMonth ?? 0) < 0) {
    // Unlimited enterprise creative
    return {
      reservationId: `creative-unlimited-${Date.now()}`,
      credits: 0,
      modality: input.modality,
    }
  }

  if (balance < credits) {
    log.warn('creative_reserve_insufficient', {
      userId: input.userId,
      balance,
      need: credits,
    })
    return null
  }

  const entry = await prisma.$transaction(async (tx) => {
    const row = await tx.creditLedgerEntry.create({
      data: {
        userId: input.userId,
        amount: -credits,
        currency: 'credits',
        entryType: 'RESERVATION',
        reference: input.reference || null,
        metadata: {
          lane: CREATIVE_LEDGER_LANE,
          settled: false,
          modality: input.modality || null,
          weightedTokens: input.weightedTokens ?? null,
          reservedCredits: credits,
        },
      },
    })
    await tx.user.update({
      where: { id: input.userId },
      data: {
        creativeCreditBalance: { decrement: credits },
        creativeCreditBalanceSyncedAt: new Date(),
      },
    })
    return row
  })

  return {
    reservationId: entry.id,
    credits,
    modality: input.modality,
  }
}

export async function settleCreativeCredits(input: {
  reservationId: string
  actualCredits: number
  weightedTokens?: number
}): Promise<void> {
  if (input.reservationId.startsWith('creative-unlimited-')) return

  const entry = await prisma.creditLedgerEntry.findUnique({
    where: { id: input.reservationId },
  })
  if (!entry || !isCreativeLaneMeta(entry.metadata)) return

  const meta = (entry.metadata || {}) as Record<string, unknown>
  if (meta.settled === true) return

  const reserved = Math.abs(entry.amount)
  const actual = Math.min(reserved, Math.max(0, Math.floor(input.actualCredits)))
  const refund = Math.max(0, reserved - actual)

  await prisma.$transaction(async (tx) => {
    await tx.creditLedgerEntry.update({
      where: { id: entry.id },
      data: {
        metadata: {
          ...meta,
          settled: true,
          actualCredits: actual,
          weightedTokens: input.weightedTokens ?? meta.weightedTokens ?? null,
        } as Prisma.InputJsonValue,
      },
    })
    // Reservation row keeps -reserved; refund unused so net debit = actual.
    if (refund > 0) {
      await tx.creditLedgerEntry.create({
        data: {
          userId: entry.userId,
          amount: refund,
          currency: 'credits',
          entryType: 'CREATIVE_REFUND',
          reference: entry.reference,
          metadata: {
            lane: CREATIVE_LEDGER_LANE,
            reservationId: entry.id,
          },
        },
      })
      await tx.user.update({
        where: { id: entry.userId },
        data: {
          creativeCreditBalance: { increment: refund },
          creativeCreditBalanceSyncedAt: new Date(),
        },
      })
    }
  })
}

export async function cancelCreativeReservation(reservationId: string): Promise<void> {
  if (reservationId.startsWith('creative-unlimited-')) return
  const entry = await prisma.creditLedgerEntry.findUnique({
    where: { id: reservationId },
  })
  if (!entry || !isCreativeLaneMeta(entry.metadata)) return
  const meta = (entry.metadata || {}) as Record<string, unknown>
  if (meta.settled === true) return

  const refund = Math.abs(entry.amount)
  await prisma.$transaction(async (tx) => {
    await tx.creditLedgerEntry.update({
      where: { id: entry.id },
      data: {
        metadata: { ...meta, settled: true, cancelled: true } as Prisma.InputJsonValue,
      },
    })
    await tx.creditLedgerEntry.create({
      data: {
        userId: entry.userId,
        amount: refund,
        currency: 'credits',
        entryType: 'CREATIVE_CANCEL',
        reference: entry.reference,
        metadata: { lane: CREATIVE_LEDGER_LANE, reservationId: entry.id },
      },
    })
    await tx.user.update({
      where: { id: entry.userId },
      data: {
        creativeCreditBalance: { increment: refund },
        creativeCreditBalanceSyncedAt: new Date(),
      },
    })
  })
}
