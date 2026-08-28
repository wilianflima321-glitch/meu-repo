/**
 * Letter cq — Creative quality-tier budget bind (Creative #6, Law XV + XVI).
 *
 * Proves the CapScore → fidelity band cook budget is bound into BOTH hot paths:
 *   world-forge conveyor — scales the CostGuard reserve via
 *     scaleCreativeTokenWeightForFidelity (cloud_max ×2 raises the settle ceiling,
 *     draft ×0.6 lowers it) and fail-closes when a requested bind refuses.
 *   native-gen conveyor — drives retopo maxTrisHint + LOD lodCascadeDepth from the
 *     bound cook budget and fail-closes on tier refusal.
 *
 * Honesty: the tier only scales when the caller opts in; no-qualityTier runs stay
 * backward compatible (unscaled estimate, default lodCascadeDepth=3).
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
  getCreativeCostReservation,
} from '@/lib/production/creative-cost-guard'
import { __resetCreativeFusionTransactionsForTests } from '@/lib/production/creative-fusion-transaction'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { runWorldForgeConveyor } from '@/lib/world-forge/world-forge-conveyor'
import { runNativeGenConveyor } from '@/lib/native-gen/native-gen-conveyor'
import { buildTestIcosphere } from '@/lib/mesh-quality/types'

const baseConveyor = {
  projectId: 'proj_wf_tier',
  userId: 'u1',
  prompt: 'misty forest ridge',
  seed: 99,
  capabilityScore: 70,
  skipLora: true,
}

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
})

describe('world-forge conveyor × quality-tier budget bind (letter cq)', () => {
  it('cloud_max scales the reserve UP — 100×2 → 200; actual 180 settles uncapped, pool 320', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      qualityTier: { capabilityScore: 88 },
      costGuard: { planId: 'pro', estimatedTokenWeight: 100 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 180 },
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier?.ok).toBe(true)
    expect(result.qualityTier?.fidelityBand).toBe('cloud_max')
    if (!result.qualityTier?.ok) return
    expect(result.qualityTier.cook.maxTrisHint).toBe(250_000)
    expect(result.qualityTier.cook.tokenWeightMultiplier).toBe(2)

    const receipt = result.worldForgeSpend
    expect(receipt).toBeTruthy()
    // reserve 200 → balance 300; settle actual 180 ≤ ceiling 200 → refund 20 → 320
    expect(receipt?.estimatedTokenWeight).toBe(200)
    expect(receipt?.totalActualTokens).toBe(180)
    expect(receipt?.capped).toBe(false)
    expect(receipt?.settle?.rawActual).toBe(180)
    expect(receipt?.settle?.cappedActual).toBe(180)
    expect(getCreativeCostReservation(receipt!.reservationId)?.status).toBe('settled')
    expect(adapter.balances.get('u1')).toBe(320)
    // no cap evidence — the ceiling was genuinely raised by the cloud_max multiplier
    expect(
      result.ledger?.events.some((event) => event.title === 'Cost settle capped'),
    ).toBe(false)
  })

  it('draft scales the reserve DOWN — 100×0.6 → 60; actual 80 caps to 60, pool stays 440', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      qualityTier: { capabilityScore: 15 },
      costGuard: { planId: 'pro', estimatedTokenWeight: 100 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 80 },
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier?.ok).toBe(true)
    expect(result.qualityTier?.fidelityBand).toBe('draft')
    if (!result.qualityTier?.ok) return
    expect(result.qualityTier.cook.maxTrisHint).toBe(8_000)
    expect(result.qualityTier.cook.tokenWeightMultiplier).toBe(0.6)

    const receipt = result.worldForgeSpend
    expect(receipt).toBeTruthy()
    // reserve 60 → balance 440; actual 80 → cappedActual 60 → delta 0 → stays 440
    expect(receipt?.estimatedTokenWeight).toBe(60)
    expect(receipt?.totalActualTokens).toBe(80)
    expect(receipt?.capped).toBe(true)
    expect(receipt?.settle?.rawActual).toBe(80)
    expect(receipt?.settle?.cappedActual).toBe(60)
    expect(adapter.balances.get('u1')).toBe(440)
    expect(
      result.ledger?.events.some((event) => event.title === 'Cost settle capped'),
    ).toBe(true)
  })

  it('tier refuse fail-closes BEFORE any reserve — stages empty, spend undefined, pool untouched', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)
    const ledger = createTaskEvidenceLedger({
      taskId: 'wf-tier-refuse',
      projectId: 'proj_wf_tier',
      mission: 'world forge tier refuse',
      ownerAgent: 'WorldForgeTest',
    })

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      qualityTier: { capabilityScore: null },
      costGuard: { planId: 'pro', estimatedTokenWeight: 100 },
      costGuardAdapter: adapter,
      ledger,
    })

    expect(result.success).toBe(false)
    expect(result.stages).toHaveLength(0)
    expect(result.qualityTier).toBeNull()
    expect(result.tierDeniedReason).toContain('Capability Score required')
    expect(result.blockedReason).toBeTruthy()
    expect(result.worldForgeSpend).toBeUndefined()
    // fail-closed BEFORE reserveWorldForgeSpend — the pool is never debited
    expect(adapter.balances.get('u1')).toBe(500)
    expect(
      result.ledger?.events.some((event) => event.title === 'World Forge quality tier refused'),
    ).toBe(true)
  })

  it('unfunded mission still binds the tier — qualityTier set, spend stays undefined', async () => {
    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      qualityTier: { capabilityScore: 88 },
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier?.ok).toBe(true)
    expect(result.qualityTier?.fidelityBand).toBe('cloud_max')
    expect(result.worldForgeSpend).toBeUndefined()
  })

  it('no-qualityTier control — estimate stays unscaled and the ceiling is the raw estimate', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { planId: 'pro', estimatedTokenWeight: 100 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 150 },
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier).toBeUndefined()
    const receipt = result.worldForgeSpend
    expect(receipt).toBeTruthy()
    // no bind → estimate 100 unscaled; actual 150 caps at 100 → pool 500-100 = 400
    expect(receipt?.estimatedTokenWeight).toBe(100)
    expect(receipt?.capped).toBe(true)
    expect(receipt?.settle?.rawActual).toBe(150)
    expect(receipt?.settle?.cappedActual).toBe(100)
    expect(adapter.balances.get('u1')).toBe(400)
    expect(
      result.ledger?.events.some((event) => event.title === 'Cost settle capped'),
    ).toBe(true)
  })
})

describe('native-gen conveyor × quality-tier budget bind (letter cq)', () => {
  it('cloud_max drives retopo maxTrisHint + LOD depth 4 from the cook budget', async () => {
    const result = await runNativeGenConveyor({
      projectId: 'proj_ca_tier',
      userId: 'u1',
      prompt: 'native hero prop',
      capabilityScore: 88,
      dedicatedVramMb: 8192,
      mesh: buildTestIcosphere(2),
      skipOnnx: true,
      qualityTier: { capabilityScore: 88 },
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier?.ok).toBe(true)
    expect(result.qualityTier?.fidelityBand).toBe('cloud_max')
    if (!result.qualityTier?.ok) return
    expect(result.qualityTier.cook.maxTrisHint).toBe(250_000)
    expect(result.qualityTier.cook.lodCascadeDepth).toBe(4)
    expect(result.qualityTier.cook.textureEdgePx).toBe(4096)
    expect(result.qualityTier.cook.cookPasses).toBe(4)

    expect(
      result.notes.some((note) => note.includes('maxTrisHint=250000') && note.includes('cloud_max')),
    ).toBe(true)
    const lod = result.stages.find((stage) => stage.stage === 'lod-cascade')
    expect(lod?.evidence.join(' ')).toContain('lodCascadeDepth=4')
  })

  it('draft drives retopo maxTrisHint + LOD depth 1 — honest GT730-class zero-UI mesh path', async () => {
    const result = await runNativeGenConveyor({
      projectId: 'proj_ca_draft',
      userId: 'u1',
      prompt: 'low-fi prop',
      capabilityScore: 15,
      dedicatedVramMb: 8192,
      mesh: buildTestIcosphere(2),
      skipOnnx: true,
      qualityTier: { capabilityScore: 15 },
    })

    expect(result.success).toBe(true)
    expect(result.zeroUi).toBe(true)
    expect(result.qualityTier?.ok).toBe(true)
    expect(result.qualityTier?.fidelityBand).toBe('draft')
    if (!result.qualityTier?.ok) return
    expect(result.qualityTier.cook.maxTrisHint).toBe(8_000)
    expect(result.qualityTier.cook.lodCascadeDepth).toBe(1)

    expect(
      result.notes.some((note) => note.includes('maxTrisHint=8000') && note.includes('draft')),
    ).toBe(true)
    const lod = result.stages.find((stage) => stage.stage === 'lod-cascade')
    expect(lod?.evidence.join(' ')).toContain('lodCascadeDepth=1')
  })

  it('tier refuse fail-closes — success false, qualityTier null, no stages, note surfaced', async () => {
    const result = await runNativeGenConveyor({
      projectId: 'proj_ca_refuse',
      userId: 'u1',
      prompt: 'must refuse',
      capabilityScore: 88,
      dedicatedVramMb: 8192,
      mesh: buildTestIcosphere(2),
      skipOnnx: true,
      qualityTier: { capabilityScore: null },
    })

    expect(result.success).toBe(false)
    expect(result.qualityTier).toBeNull()
    expect(result.tierDeniedReason).toContain('Capability Score required')
    expect(result.blockedReason).toBeTruthy()
    expect(result.stages).toHaveLength(0)
    expect(result.notes.some((note) => note.includes('quality tier refused:'))).toBe(true)
  })

  it('no-qualityTier stays backward compatible — default lodCascadeDepth=3, no binding field', async () => {
    const result = await runNativeGenConveyor({
      projectId: 'proj_ca_nobind',
      userId: 'u1',
      prompt: 'native hero prop',
      capabilityScore: 72,
      dedicatedVramMb: 8192,
      mesh: buildTestIcosphere(2),
      skipOnnx: true,
    })

    expect(result.success).toBe(true)
    expect(result.qualityTier).toBeUndefined()
    const lod = result.stages.find((stage) => stage.stage === 'lod-cascade')
    expect(lod?.evidence.join(' ')).toContain('lodCascadeDepth=3')
  })
})
