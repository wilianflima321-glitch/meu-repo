import { describe, expect, it, beforeEach } from 'vitest'
import { getPlanById } from '@/lib/plans'
import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import { runExpensiveCreativeViaBridge } from '@/lib/production/creative-bridge-http-dispatch'
import { dispatchCreativeArtifact } from '@/lib/production/creative-artifact-bridge'

describe('creative-bridge-http-dispatch', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
  })

  const proPlan = getPlanById('pro')!
  const freePlan = getPlanById('free')!

  it('blocks free plan without creative domain (GENERATION_PLAN_REQUIRED)', async () => {
    const result = await runExpensiveCreativeViaBridge(
      {
        userId: 'u-free',
        route: '/api/ai/image/generate',
        kind: 'image',
        prompt: 'a castle',
        providerName: 'dalle',
        execute: async () => {
          throw new Error('should not run')
        },
      },
      {
        requireEntitlements: async () => ({ plan: freePlan, source: 'free' }),
        hasByok: async () => false,
        createAdapter: () => createMemoryCostGuardLedger(),
        dispatch: dispatchCreativeArtifact,
      },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    const body = await result.response.json()
    expect(body.error).toBe('GENERATION_PLAN_REQUIRED')
    expect(result.response.status).toBe(402)
  })

  it('dispatches through CreativeBridge and returns artifact payload', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u-pro', 1_000_000)

    const result = await runExpensiveCreativeViaBridge(
      {
        userId: 'u-pro',
        route: '/api/ai/image/generate',
        kind: 'image',
        prompt: 'hero concept',
        units: 1,
        quality: 'standard',
        providerName: 'dalle',
        execute: async () => ({
          artifactId: 'https://cdn.example/img.png',
          previewUrl: 'https://cdn.example/img.png',
          data: { images: [{ url: 'https://cdn.example/img.png' }] },
        }),
      },
      {
        requireEntitlements: async () => ({ plan: proPlan, source: 'subscription' }),
        hasByok: async () => false,
        createAdapter: () => ledger,
        dispatch: dispatchCreativeArtifact,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.images[0].url).toBe('https://cdn.example/img.png')
    expect(result.headers['X-Aethel-Creative-Bridge']).toBe('1')
    expect(result.evidenceReceiptId.length).toBeGreaterThan(0)
    expect(result.estimatedCostTokens).toBeGreaterThan(0)
  })

  it('rejects empty artifact success (Law XVI)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u-pro', 1_000_000)

    const result = await runExpensiveCreativeViaBridge(
      {
        userId: 'u-pro',
        route: '/api/ai/image/generate',
        kind: 'image',
        prompt: 'empty',
        providerName: 'dalle',
        execute: async () => ({
          artifactId: '',
          empty: true,
          data: { images: [] },
        }),
      },
      {
        requireEntitlements: async () => ({ plan: proPlan, source: 'subscription' }),
        hasByok: async () => false,
        createAdapter: () => ledger,
        dispatch: dispatchCreativeArtifact,
      },
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    const body = await result.response.json()
    expect(body.blockedReason).toBe('empty_artifact')
    expect(result.response.status).toBe(422)
  })

  it('maps CostGuard free+BYOK path when creative domain allowed via starter', async () => {
    const starter = getPlanById('starter')!
    const ledger = createMemoryCostGuardLedger()
    // no grant — BYOK path should not debit
    ledger.enableByok('u-byok')

    const result = await runExpensiveCreativeViaBridge(
      {
        userId: 'u-byok',
        route: '/api/ai/music/generate',
        kind: 'music',
        prompt: 'ambient loop',
        units: 30,
        providerName: 'suno',
        execute: async () => ({
          artifactId: 'task-1',
          data: { result: { taskId: 'task-1', status: 'pending' } },
        }),
      },
      {
        requireEntitlements: async () => ({ plan: starter, source: 'subscription' }),
        hasByok: async () => true,
        createAdapter: () => ledger,
        dispatch: dispatchCreativeArtifact,
      },
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.result.taskId).toBe('task-1')
  })
})
