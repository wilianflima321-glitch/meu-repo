import { describe, expect, it, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { getPlanById } from '@/lib/plans'
import { getModelCostMultiplier } from '@/lib/credit-wallet-costs'
import { getModelTokenWeight } from '@/lib/ai/model-cost-weights'
import {
  __resetSpendResolverForTests,
  decideSpendLane,
} from '@/lib/ai/spend-resolver'
import {
  applyBrushStroke,
  createFlatHeightfield,
  heightfieldHonestyReport,
  saveHeightfieldToWorkspace,
  loadHeightfieldFromWorkspace,
} from '@/lib/production/terrain-heightfield-authority'

describe('6A.3 weight unification', () => {
  it('wallet multiplier equals model-cost-weights (no parallel tables)', () => {
    expect(getModelCostMultiplier('anthropic/claude-sonnet-4')).toBe(
      getModelTokenWeight('anthropic/claude-sonnet-4'),
    )
    expect(getModelCostMultiplier('anthropic/claude-opus-4')).toBe(200)
    expect(getModelCostMultiplier('openai/gpt-4o-mini')).toBe(1)
  })
})

describe('Focus 2B heightfield authority', () => {
  it('sculpt stroke changes samples and honesty becomes live after persist', async () => {
    const prev = process.env.AETHEL_WORKSPACE_ROOT
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-terrain-'))
    process.env.AETHEL_WORKSPACE_ROOT = tmp

    try {
      let doc = createFlatHeightfield({ resolution: 33 })
      expect(heightfieldHonestyReport(doc).status).toBe('empty')
      const before = doc.heights[16 * 33 + 16]
      doc = applyBrushStroke(doc, { u: 0.5, v: 0.5, radius: 0.15, strength: 0.4 })
      expect(doc.heights[16 * 33 + 16]).toBeGreaterThan(before)
      expect(doc.meta.strokeCount).toBe(1)

      await saveHeightfieldToWorkspace({
        userId: 'u-terrain',
        projectId: 'p-terrain',
        terrainId: 'default',
        document: doc,
      })

      const loaded = await loadHeightfieldFromWorkspace({
        userId: 'u-terrain',
        projectId: 'p-terrain',
        terrainId: 'default',
      })
      expect(loaded).not.toBeNull()
      expect(loaded!.meta.strokeCount).toBe(1)
      expect(heightfieldHonestyReport(loaded).status).toBe('live')
      expect(heightfieldHonestyReport(loaded).mock).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.AETHEL_WORKSPACE_ROOT
      else process.env.AETHEL_WORKSPACE_ROOT = prev
      await fs.rm(tmp, { recursive: true, force: true })
    }
  })
})

describe('chat spend single path policy', () => {
  beforeEach(() => {
    __resetSpendResolverForTests()
  })

  it('subscription path never requires wallet when Fast remains', () => {
    const pro = getPlanById('pro')!
    const decision = decideSpendLane({
      userId: 'u1',
      planId: 'pro',
      planLimits: pro.limits,
      modelId: 'openai/gpt-4o-mini',
      estimatedRawTokens: 2000,
      usage: {
        tokensFastUsed: 0,
        tokensPremiumRawUsed: 0,
        tokensWeightedUsed: 0,
        walletBalance: 0,
      },
    })
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.lane).toBe('subscription_fast')
  })
})
