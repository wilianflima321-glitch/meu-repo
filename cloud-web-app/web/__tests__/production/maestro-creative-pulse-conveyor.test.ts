/**
 * Creative #1 — Maestro pulse conveyor nucleus (Law XVI Trava I).
 *
 * Proves the reserve→hold→dispatch lifecycle: `evaluateMaestroCreativePulse` HOLDS the CostGuard
 * reservation (no reserve→immediate-cancel TOCTOU), `dispatchMaestroCreativePulse` reuses the SAME
 * held reservation through the canonical CreativeBridge choke (single reserve → settle), the actual
 * spend receipt is tied to that reservation, and release/cancel refunds the hold. Fail-closed
 * paths: no held reservation, consumed reservation, and request drift (domain/estimate mismatch).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
  getCreativeCostReservation,
} from '@/lib/production/creative-cost-guard'
import {
  dispatchMaestroCreativePulse,
  evaluateMaestroCreativePulse,
  probeMaestroCreativePulseReadiness,
  releaseMaestroCreativePulseReservation,
} from '@/lib/production/maestro-creative-pulse'
import {
  __resetCreativeFusionTransactionsForTests,
  beginCreativeFusionTransaction,
  createMemoryFusionScopeStore,
  type CreativeFusionTransactionRecord,
} from '@/lib/production/creative-fusion-transaction'
import type { CreativeArtifactRequest } from '@/lib/production/creative-artifact-bridge'

describe('maestro pulse conveyor nucleus (Creative #1)', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
    __resetCreativeFusionTransactionsForTests()
  })

  /** Trava II: write-domain dispatch (bt-graph) requires an open FusionTx before the conveyor gate. */
  async function openFusionTx(projectId = 'proj_conveyor'): Promise<CreativeFusionTransactionRecord> {
    return beginCreativeFusionTransaction({
      projectId,
      yDocScope: 'manifest',
      store: createMemoryFusionScopeStore(),
    })
  }

  const pulseInput = {
    projectId: 'proj_conveyor',
    userId: 'u1',
    intent: 'Generate a stealth AI behavior tree',
    creationKind: 'game' as const,
    domain: 'bt-graph' as const,
    capabilityScore: 52,
    costGuard: { estimatedTokenWeight: 200, planId: 'pro', usageBucketId: 'bucket_1' },
  }

  const buildRequest = (overrides: Partial<CreativeArtifactRequest> = {}): CreativeArtifactRequest => ({
    domain: pulseInput.domain,
    prompt: pulseInput.intent,
    projectId: pulseInput.projectId,
    userId: pulseInput.userId,
    costGuard: { estimatedTokenWeight: 200, planId: 'pro', usageBucketId: 'bucket_1' },
    requiresFusionWrite: true,
    ...overrides,
  })

  it('HOLDS the reservation — no reserve→cancel→re-reserve TOCTOU', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return

    // The hold persists: balance is debited by the estimate and the reservation is still 'reserved'.
    expect(ledger.balances.get('u1')).toBe(10_000 - 200)
    const held = getCreativeCostReservation(pulse.value.reservationId)
    expect(held?.status).toBe('reserved')
    expect(pulse.value.reservationFunding).toBe('usage_bucket')
    expect(pulse.value.reservationSettleCeiling).toBe(1)
    expect(pulse.value.reservationEstimatedTokenWeight).toBe(200)
    expect(pulse.value.evidenceRefs.some((r) => r.startsWith('reservation:'))).toBe(true)
  })

  it('dispatch reuses the SAME held reservation (single reserve → settle) and ties the receipt', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return
    const tx = await openFusionTx()

    const { result } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({ fusionTransactionId: tx.id }),
      adapter: ledger,
      provider: async ({ reservationId }) => {
        // The provider receives the SAME reservation the pulse held — the conveyor token.
        expect(reservationId).toBe(pulse.value.reservationId)
        return {
          artifactId: 'bt-scaffold-1',
          provider: 'test-provider',
          costUsd: 0.01,
          actualTokenWeight: 150,
        }
      },
    })

    expect(result.success).toBe(true)
    // Receipt tied to the SAME held reservation — no second reserve, no TOCTOU.
    expect(result.reservationId).toBe(pulse.value.reservationId)
    // Settle debits actual (150) and refunds the remaining hold (50).
    expect(ledger.balances.get('u1')).toBe(10_000 - 150)
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('settled')
  })

  it('caps runaway actual at the held reservation settle ceiling (default 1.0×)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return
    const tx = await openFusionTx()

    const { result, ledger: dispatchLedger } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({ fusionTransactionId: tx.id }),
      adapter: ledger,
      provider: async () => ({
        artifactId: 'bt-scaffold-2',
        provider: 'test-provider',
        costUsd: 0.05,
        actualTokenWeight: 600, // 3× estimate — capped at 200 by the held ceiling
      }),
    })

    expect(result.success).toBe(true)
    expect(result.actualTokenWeight).toBe(600) // reported actual is surfaced…
    expect(ledger.balances.get('u1')).toBe(10_000 - 200) // …but debit is capped at the ceiling
    // The cap is ledger evidence, not a silent absorb — the receipt's chain ties to the real charge.
    expect(getCreativeCostReservation(pulse.value.reservationId)?.settleCeilingMultiplier).toBe(1)
    expect(dispatchLedger.events.some((e) => e.title === 'Cost settle capped')).toBe(true)
    expect(dispatchLedger.events.find((e) => e.title === 'Cost settle capped')?.summary).toContain(
      'capped to 200',
    )
  })

  it('pulse respects a caller-proposed settle ceiling (clamped by CostGuard)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(
      {
        ...pulseInput,
        costGuard: { ...pulseInput.costGuard, settleCeilingMultiplier: 2 },
      },
      ledger,
    )
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return
    expect(pulse.value.reservationSettleCeiling).toBe(2)
  })

  it('release refunds the full hold and later dispatch fails closed', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return

    await releaseMaestroCreativePulseReservation(pulse.value, ledger)
    expect(ledger.balances.get('u1')).toBe(10_000)
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('cancelled')
    // Idempotent: a second release is a no-op — no double refund, no stranded error path.
    await releaseMaestroCreativePulseReservation(pulse.value, ledger)
    expect(ledger.balances.get('u1')).toBe(10_000)
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('cancelled')

    // Dispatch after release — the Bridge rejects the consumed reservation, no double-reserve.
    // Trava II: an open FusionTx is still required for the bt-graph write domain before the conveyor gate.
    const tx = await openFusionTx()
    const { result } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({ fusionTransactionId: tx.id }),
      adapter: ledger,
      provider: async () => {
        throw new Error('must not be called — reservation consumed')
      },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('cost_guard_denied')
    // No provider call, no double-charge.
    expect(ledger.balances.get('u1')).toBe(10_000)
  })

  it('conveyor dispatch with no held reservation fails closed without reserving fresh', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return

    // A verdict that lost its reservation identity (e.g. an aborted pulse path).
    const { result, ledger: dispatchLedger } = await dispatchMaestroCreativePulse({
      verdict: { ...pulse.value, reservationId: '' },
      request: buildRequest(),
      adapter: ledger,
      provider: async () => {
        throw new Error('must not be called — no reservation to convey')
      },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('cost_guard_denied')
    // The real held reservation remains untouched — the failed dispatch reserved nothing.
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('reserved')
    expect(dispatchLedger.events.some((e) => e.title === 'Conveyor dispatch refused')).toBe(true)
  })

  it('Bridge rejects request drift (domain mismatch) against the held reservation', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return

    const { result } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({ domain: 'image', requiresFusionWrite: false }),
      adapter: ledger,
      provider: async () => {
        throw new Error('must not be called — drifted reservation')
      },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('cost_guard_denied')
    // Held reservation still reserved; nothing was double-reserved or settled.
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('reserved')
    expect(ledger.balances.get('u1')).toBe(10_000 - 200)
  })

  it('Bridge rejects request drift (estimate mismatch) against the held reservation', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return
    const tx = await openFusionTx()

    const { result } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({
        costGuard: { estimatedTokenWeight: 999, planId: 'pro', usageBucketId: 'bucket_1' },
        fusionTransactionId: tx.id,
      }),
      adapter: ledger,
      provider: async () => {
        throw new Error('must not be called — drifted reservation')
      },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('cost_guard_denied')
    expect(ledger.balances.get('u1')).toBe(10_000 - 200)
  })

  it('provider failure cancels the held reservation (refund), not the pulse hold chain', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)
    const pulse = await evaluateMaestroCreativePulse(pulseInput, ledger)
    expect(pulse.ok).toBe(true)
    if (!pulse.ok) return
    const tx = await openFusionTx()

    const { result } = await dispatchMaestroCreativePulse({
      verdict: pulse.value,
      request: buildRequest({ fusionTransactionId: tx.id }),
      adapter: ledger,
      provider: async () => {
        throw new Error('provider exploded')
      },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('provider_down')
    expect(result.reservationId).toBe(pulse.value.reservationId)
    // The Bridge cancels the held reservation — full refund, no stranded hold.
    expect(ledger.balances.get('u1')).toBe(10_000)
    expect(getCreativeCostReservation(pulse.value.reservationId)?.status).toBe('cancelled')
  })

  it('probe reports the conveyor nucleus while J.12 stays STOPPED', () => {
    const probe = probeMaestroCreativePulseReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.conveyorNucleus).toBe(true)
    expect(probe.orchestratorProdShipped).toBe(false)
    expect(probe.j12Stopped).toBe(true)
    expect(probe.miniIaMayOrchestrate).toBe(false)
  })
})
