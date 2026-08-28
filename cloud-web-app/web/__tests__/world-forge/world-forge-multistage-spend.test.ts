/**
 * Letter cc — World Forge multi-stage CostGuard spend (Creative #5).
 *
 * Proves Law XVI Trava I on the world-forge conveyor:
 *   reserve ONE held reservation before ANY stage →
 *   per-stage budget allocation (Σ == estimate) →
 *   per-stage actual attribution (never invented; skipped stages charge 0) →
 *   settle ONCE (settle-ceiling caps runaways; 'Cost settle capped' evidence)
 *   or cancel (full refund) on ANY fail-closed stage.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createMemoryCostGuardLedger,
  getCreativeCostReservation,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  __resetCreativeFusionTransactionsForTests,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import { runWorldForgeConveyor } from '@/lib/world-forge/world-forge-conveyor'
import {
  WORLD_FORGE_SPEND_LORA_CLAY_READY,
  WORLD_FORGE_SPEND_NATIVE_ONNX_READY,
  WORLD_FORGE_SPEND_UNREAL_WORLD_PARTITION_CLAIM,
  WORLD_FORGE_STAGE_BUDGET_WEIGHTS,
  WORLD_FORGE_STAGE_IDS,
  allocateWorldForgeSpendStages,
  attributeWorldForgeStageActual,
  probeWorldForgeMultistageSpendReadiness,
} from '@/lib/world-forge/world-forge-multistage-spend'

const baseConveyor = {
  projectId: 'proj_wf_spend',
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

describe('world-forge multi-stage spend — allocation (letter cc)', () => {
  it('weight table normalizes to 1 and covers all 9 stages', () => {
    expect(WORLD_FORGE_STAGE_IDS).toHaveLength(9)
    const sum = WORLD_FORGE_STAGE_IDS.reduce(
      (acc, stage) => acc + WORLD_FORGE_STAGE_BUDGET_WEIGHTS[stage]!,
      0,
    )
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9)
    expect(WORLD_FORGE_STAGE_BUDGET_WEIGHTS['lora-inject']).toBe(0.3)
  })

  it('allocateWorldForgeSpendStages sums EXACTLY to the estimate (floor + remainder on largest)', () => {
    const stages = allocateWorldForgeSpendStages(120)
    const sum = stages.reduce((acc, record) => acc + record.allocatedTokens, 0)
    expect(sum).toBe(120)
    expect(stages.find((record) => record.stage === 'lora-inject')?.allocatedTokens).toBe(36)
    for (const record of stages) {
      expect(record.status).toBe('held')
      expect(record.actualTokens).toBe(0)
      expect(record.allocatedTokens).toBeGreaterThanOrEqual(0)
    }
  })

  it('attributeWorldForgeStageActual fails closed on unknown stage and invalid actual', () => {
    const stages = allocateWorldForgeSpendStages(100)
    const held = {
      reservationId: 'res-1',
      userId: 'u1',
      projectId: 'p1',
      funding: 'usage_bucket' as const,
      settleCeilingMultiplier: 1,
      estimatedTokenWeight: 100,
      stages,
    }

    const unknown = attributeWorldForgeStageActual(held, 'not-a-stage' as never, 10)
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.code).toBe('unknown_stage')

    const negative = attributeWorldForgeStageActual(held, 'sdf-sculpt', -1)
    expect(negative.ok).toBe(false)
    if (!negative.ok) expect(negative.code).toBe('invalid_actual')

    const nan = attributeWorldForgeStageActual(held, 'sdf-sculpt', Number.NaN)
    expect(nan.ok).toBe(false)
    if (!nan.ok) expect(nan.code).toBe('invalid_actual')
  })

  it('attribute is pure — returns a new held without mutating the input', () => {
    const stages = allocateWorldForgeSpendStages(100)
    const held = {
      reservationId: 'res-1',
      userId: 'u1',
      projectId: 'p1',
      funding: 'usage_bucket' as const,
      settleCeilingMultiplier: 1,
      estimatedTokenWeight: 100,
      stages,
    }
    const result = attributeWorldForgeStageActual(held, 'sdf-sculpt', 10)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.held).not.toBe(held)
    // original untouched
    expect(held.stages.find((record) => record.stage === 'sdf-sculpt')?.actualTokens).toBe(0)
    expect(result.held.stages.find((record) => record.stage === 'sdf-sculpt')?.actualTokens).toBe(10)
    expect(
      result.held.stages.find((record) => record.stage === 'sdf-sculpt')?.status,
    ).toBe('closed')
  })
})

describe('world-forge conveyor × multi-stage spend (Trava I)', () => {
  it('denies free tier without BYOK BEFORE any stage — stages empty, spend null, no pool debit', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
    })

    expect(result.success).toBe(false)
    expect(result.stages).toHaveLength(0)
    expect(result.worldForgeSpend).toBeNull()
    expect(result.spendDeniedReason).toContain('Free tier requires BYOK')
    // fail-closed BEFORE any reservePool call — the pool is never touched
    expect(adapter.balances.get('u1')).toBe(500)
  })

  it('appends durable "World Forge CostGuard denied" evidence when a ledger is carried', async () => {
    const adapter = createMemoryCostGuardLedger()
    const ledger = createTaskEvidenceLedger({
      taskId: 'wf-spend-deny',
      projectId: 'proj_wf_spend',
      mission: 'world forge deny ledger',
      ownerAgent: 'WorldForgeTest',
    })

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      ledger,
      costGuard: { estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
    })

    expect(result.worldForgeSpend).toBeNull()
    expect(result.spendDeniedReason).toBeTruthy()
    expect(result.ledger?.events.some((event) => event.title === 'World Forge CostGuard denied')).toBe(
      true,
    )
  })

  it('funded conveyor settles ONCE on success — single held reservation, pool 500 → 440', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 60 },
    })

    expect(result.success).toBe(true)
    const receipt = result.worldForgeSpend
    expect(receipt).toBeTruthy()
    expect(receipt?.status).toBe('settled')
    expect(receipt?.funding).toBe('usage_bucket')
    expect(receipt?.totalActualTokens).toBe(60)
    expect(receipt?.capped).toBe(false)
    expect(getCreativeCostReservation(receipt!.reservationId)?.status).toBe('settled')
    // reserve 120 → balance 380; settle 60 → refund delta 60 → 440
    expect(adapter.balances.get('u1')).toBe(440)
    expect(
      result.ledger?.events.some((event) => event.title === 'World Forge mission settled'),
    ).toBe(true)
  })

  it('caps runaway actual at the settle ceiling — "Cost settle capped" evidence, pool 380', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 999 },
    })

    expect(result.success).toBe(true)
    const receipt = result.worldForgeSpend
    expect(receipt?.capped).toBe(true)
    expect(receipt?.settle?.rawActual).toBe(999)
    expect(receipt?.settle?.cappedActual).toBe(120)
    // totalActualTokens = raw per-stage attribution (honest); the capped CHARGE is settle.cappedActual
    expect(receipt?.totalActualTokens).toBe(999)
    // reserve 120 → 380; capped settle 120 → delta 0 → stays 380 (never overdraws)
    expect(adapter.balances.get('u1')).toBe(380)
    expect(result.ledger?.events.some((event) => event.title === 'Cost settle capped')).toBe(true)
  })

  it('BYOK funding never debits the pool', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)
    adapter.enableByok('u1')

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 60 },
    })

    expect(result.success).toBe(true)
    const receipt = result.worldForgeSpend
    expect(receipt?.funding).toBe('byok')
    expect(receipt?.capped).toBe(false)
    // BYOK never debits the pool — balance untouched
    expect(adapter.balances.get('u1')).toBe(500)
  })

  it('skipped stage never receives actual attribution (honesty — no invented spend)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      skipLora: true,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
      // caller passes lora actual but the stage was skipped — it must NOT be attributed
      stageActuals: { 'lora-inject': 36, 'sdf-sculpt': 24 },
    })

    expect(result.success).toBe(true)
    const loraRecord = result.worldForgeSpend?.stages.find(
      (record) => record.stage === 'lora-inject',
    )
    expect(loraRecord?.status).toBe('skipped')
    expect(loraRecord?.actualTokens).toBe(0)
    expect(result.worldForgeSpend?.totalActualTokens).toBe(24)
    // reserve 120 → 380; settle 24 → refund 96 → 476
    expect(adapter.balances.get('u1')).toBe(476)
  })

  it('fusion abort refunds the full hold — sabotaged FusionScopeStore (Trava II fail-closed)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    const sabotagedStore: FusionScopeStore = {
      getSnapshot: () => JSON.stringify({ sabotage: true }),
      applySnapshot: () => {
        throw new Error('applySnapshot sabotage')
      },
      captureRevertPoint: () => undefined,
    }

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      fusionStore: sabotagedStore,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: adapter,
      stageActuals: { 'sdf-sculpt': 40 },
    })

    expect(result.success).toBe(false)
    const receipt = result.worldForgeSpend
    expect(receipt?.status).toBe('cancelled')
    expect(receipt?.funding).toBe('usage_bucket')
    expect(result.stages.find((stage) => stage.stage === 'fusion-viewport')?.status).toBe('rejected')
    // full refund on ANY fail-closed stage
    expect(adapter.balances.get('u1')).toBe(500)
    expect(
      result.ledger?.events.some((event) => event.title === 'World Forge mission refunded'),
    ).toBe(true)
  })

  it('conveyor catch path refunds the full hold (settle adapter failure)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 500)

    // settlePool explodes AFTER a successful run — the outer catch must cancel/refund
    const explodingAdapter = {
      ...adapter,
      settlePool: async () => {
        throw new Error('settle boom')
      },
    }

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuard: { planId: 'pro', estimatedTokenWeight: 120 },
      costGuardAdapter: explodingAdapter,
      stageActuals: { 'sdf-sculpt': 40 },
    })

    expect(result.success).toBe(false)
    expect(result.blockedReason).toContain('settle boom')
    expect(result.worldForgeSpend?.status).toBe('cancelled')
    // cancelPool refunds the full 120 hold even though settle blew up
    expect(adapter.balances.get('u1')).toBe(500)
  })

  it('unfunded / zero-UI conveyor leaves worldForgeSpend undefined and never touches CostGuard', async () => {
    const adapter = createMemoryCostGuardLedger()

    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      costGuardAdapter: adapter,
    })

    expect(result.success).toBe(true)
    expect(result.worldForgeSpend).toBeUndefined()
    expect(result.spendDeniedReason).toBeUndefined()
    // no costGuard funding requested → no reservation ever created
    expect(adapter.balances.size).toBe(0)
  })

  it('unfunded zero-UI run carries the caller ledger untouched', async () => {
    const ledger = createTaskEvidenceLedger({
      taskId: 'wf-spend-untouched',
      projectId: 'proj_wf_spend',
      mission: 'world forge unfunded',
      ownerAgent: 'WorldForgeTest',
    })
    const result = await runWorldForgeConveyor({
      ...baseConveyor,
      ledger,
    })
    expect(result.success).toBe(true)
    expect(result.worldForgeSpend).toBeUndefined()
    expect(result.ledger).toBe(ledger)
    // only the seeded 'Mission accepted' event — no spend event appended (unfunded)
    expect(result.ledger?.events).toHaveLength(1)
  })
})

describe('world-forge multi-stage spend — probe honesty (letter cc)', () => {
  it('probe self-verifies one real reserve→settle round trip and stays honest', async () => {
    const probe = await probeWorldForgeMultistageSpendReadiness()

    expect(probe.status).toBe('PARTIAL')
    expect(probe.ready).toBe(true)
    expect(probe.weightsSumTo1).toBe(true)
    expect(probe.allocationSumsToEstimate).toBe(true)
    expect(probe.singleHeldReservationRoundTrip).toBe(true)
    expect(probe.unrealWorldPartitionClaim).toBe(false)
    expect(probe.loraClayReady).toBe(false)
    expect(probe.nativeOnnxReady).toBe(false)
  })

  it('honesty constants never claim Unreal World Partition / Nanite / LoRA clay / native ONNX', () => {
    expect(WORLD_FORGE_SPEND_UNREAL_WORLD_PARTITION_CLAIM).toBe(false)
    expect(WORLD_FORGE_SPEND_NATIVE_ONNX_READY).toBe(false)
    expect(WORLD_FORGE_SPEND_LORA_CLAY_READY).toBe(false)
  })
})
