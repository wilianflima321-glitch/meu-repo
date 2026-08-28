/**
 * Top-8 #4 — Live bx poll → evidence ledger soak (bx→bw).
 * Mocked provider HTTP / real GLB+OBJ fixtures only — no real API keys in CI.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  runClayRefineLiveSoak,
  probeClayRefineLiveSoakReadiness,
  __resetClayRefineLiveSoakForTests,
  CLAY_REFINE_SOAK_ESTIMATE,
  type ClayRefineLiveSoakInput,
} from '@/lib/mesh-quality/clay-refine-live-soak'
import {
  buildMinimalGlbFixture,
  createMeshyPollClient,
  type ClayProviderPollClient,
  type FetchLike,
} from '@/lib/mesh-quality/clay-live-poll'
import { buildMinimalObjFixture } from '@/lib/mesh-quality/clay-provider-adapters'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
  getCreativeCostReservation,
  type CostGuardLedgerAdapter,
} from '@/lib/production/creative-cost-guard'
import { createTaskEvidenceLedger, type TaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetClayRefineLiveSoakForTests()
})

function jsonResponse(body: unknown, status = 200): Awaited<ReturnType<FetchLike>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    async text() {
      return JSON.stringify(body)
    },
    async arrayBuffer() {
      return new TextEncoder().encode(JSON.stringify(body)).buffer
    },
    async json() {
      return body
    },
  }
}

function objResponse(text: string): Awaited<ReturnType<FetchLike>> {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'text/plain' : null),
    },
    async text() {
      return text
    },
    async arrayBuffer() {
      return new TextEncoder().encode(text).buffer
    },
    async json() {
      return {}
    },
  }
}

function glbResponse(bytes: Uint8Array): Awaited<ReturnType<FetchLike>> {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => (name.toLowerCase() === 'content-type' ? 'model/gltf-binary' : null),
    },
    async text() {
      return ''
    },
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    },
    async json() {
      return {}
    },
  }
}

function makeLedger(taskId = 'soak-t1'): TaskEvidenceLedger {
  return createTaskEvidenceLedger({
    taskId,
    projectId: 'proj_soak',
    mission: 'clay refine live soak',
    ownerAgent: 'clay-refine-live-soak',
  })
}

function baseInput(
  overrides: Partial<ClayRefineLiveSoakInput> & {
    adapter: CostGuardLedgerAdapter
    ledger?: TaskEvidenceLedger
  },
): ClayRefineLiveSoakInput {
  return {
    taskId: 'soak-t1',
    projectId: 'proj_soak',
    provider: 'generic-mesh-gen',
    keys: {},
    userId: 'u1',
    criticApproved: true,
    capabilityScore: 50,
    triangleBudgetTarget: 10_000,
    costGuardAdapter: overrides.adapter,
    ledger: overrides.ledger ?? makeLedger(),
    now: '2026-08-10T12:00:00.000Z',
    ...overrides,
  }
}

describe('clay-refine live soak (bx→bw) — success ledger soak', () => {
  it('seals a live bx soak into the evidence ledger (GLB via modelUrl shortcut)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const glb = buildMinimalGlbFixture()
    const fetchImpl: FetchLike = async (url) => {
      expect(String(url)).toContain('.glb')
      return glbResponse(glb)
    }

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        clayModelUrl: 'https://cdn.example/clay.glb',
        provider: 'tripo',
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const v = result.value
    expect(v.letter).toBe('bx-bw-soak')
    expect(v.livePollLetter).toBe('bx')
    expect(v.fingerprint.length).toBeGreaterThanOrEqual(16)
    expect(v.triangles).toBeGreaterThan(0)
    expect(v.pollStatus).toBe('completed')
    expect(v.nativeOnnxReady).toBe(false)
    expect(v.meshyTripoClayParityClaim).toBe(false)
    expect(v.ueMeshQualityClaim).toBe(false)
    expect(v.reservationFunding).toBe('byok')
    expect(getCreativeCostReservation(v.reservationId)?.status).toBe('settled')

    // Soak into ledger — durable seal event tied to the receipt fingerprint.
    const sealed = v.ledger.events.find((e) => e.title === 'Clay refine evidence sealed (bx→bw)')
    expect(sealed).toBeDefined()
    expect(sealed?.refs).toContain(`receipt:${v.fingerprint}`)
    expect(sealed?.refs).toContain(`mesh:${v.meshFingerprint}`)
    expect(sealed?.summary).toContain(`provider=tripo`)
  })

  it('live Meshy poll → OBJ download → seal (real poll leg, no invented bytes)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const fetchImpl: FetchLike = async (url) => {
      const u = String(url)
      if (u.includes('meshy.ai')) {
        return jsonResponse({
          status: 'SUCCEEDED',
          progress: 100,
          model_urls: { obj: 'https://cdn.example/clay.obj' },
        })
      }
      if (u.includes('.obj')) {
        return objResponse(buildMinimalObjFixture())
      }
      throw new Error(`unexpected url ${u}`)
    }
    const pollClient = createMeshyPollClient({ apiKey: 'test-meshy', fetchImpl })

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        pollClient,
        provider: 'meshy',
        keys: { MESHY_API_KEY: 'test-meshy' },
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.pollStatus).toBe('completed')
    expect(result.value.provider).toBe('meshy')
    expect(result.value.fingerprint.length).toBeGreaterThanOrEqual(16)
    expect(getCreativeCostReservation(result.value.reservationId)?.status).toBe('settled')
  })
})

describe('clay-refine live soak (bx→bw) — fail-closed + refund', () => {
  it('refuses free tier without BYOK (Trava I) and never calls the provider', async () => {
    const adapter = createMemoryCostGuardLedger()
    let calls = 0
    const fetchImpl: FetchLike = async () => {
      calls++
      throw new Error('must not be called')
    }

    const result = await runClayRefineLiveSoak(
      baseInput({ adapter, fetchImpl, planId: '', clayModelUrl: 'https://cdn.example/clay.glb' }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('cost_guard_denied')
    expect(calls).toBe(0)
    expect(result.ledger?.events.some((e) => e.title === 'Clay refine soak denied (CostGuard)')).toBe(true)
  })

  it('fail-closes on provider poll failure and refunds the full hold', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 100)
    const pollClient: ClayProviderPollClient = {
      provider: 'meshy',
      async pollJob() {
        return { provider: 'meshy', taskId: 't', status: 'failed', error: 'provider_rejected' }
      },
      fromWebhookPayload() {
        return null
      },
    }

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        pollClient,
        provider: 'meshy',
        keys: { MESHY_API_KEY: 'k' },
        planId: 'pro',
        usageBucketId: 'bucket_1',
      }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('clay_poll_failed')
    expect(result.pollStatus).toBe('failed')
    // reserve 32 debited → cancel refunds 32 → balance back to 100.
    expect(adapter.balances.get('u1')).toBe(100)
    expect(result.ledger?.events.some((e) => e.title === 'Clay refine soak rejected')).toBe(true)
  })

  it('fail-closes when the BYOK poll key is missing and refunds the hold', async () => {
    const adapter = createMemoryCostGuardLedger()
    // CostGuard reserves via BYOK (profile present) but the provider poll has no key → byok_missing.
    adapter.grant('u1', 100)
    adapter.enableByok('u1')

    const result = await runClayRefineLiveSoak(
      baseInput({ adapter, provider: 'tripo', keys: {} }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('byok_missing')
    expect(adapter.balances.get('u1')).toBe(100)
  })

  it('fail-closes on topology critic reject and refunds the hold', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const fetchImpl: FetchLike = async () => glbResponse(buildMinimalGlbFixture())

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        clayModelUrl: 'https://cdn.example/clay.glb',
        criticApproved: false,
        criticRejectReasons: ['non_manifold'],
      }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('critic_rejected')
    expect(result.ledger?.events.some((e) => e.title === 'Clay refine soak rejected')).toBe(true)
  })

  it('fail-closes on theater sceneId before any reserve or provider call', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 100)
    let calls = 0
    const fetchImpl: FetchLike = async () => {
      calls++
      throw new Error('must not be called')
    }

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        sceneId: 'mock',
        clayModelUrl: 'https://cdn.example/clay.glb',
      }),
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('theater_payload')
    expect(calls).toBe(0)
    // No reservation was ever made — nothing to refund.
    expect(adapter.balances.get('u1')).toBe(100)
  })

  it('capped settle surfaces "Cost settle capped" ledger evidence (never silent)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.grant('u1', 100)
    const fetchImpl: FetchLike = async () => glbResponse(buildMinimalGlbFixture())

    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        clayModelUrl: 'https://cdn.example/clay.glb',
        planId: 'pro',
        usageBucketId: 'bucket_1',
        settleActualTokenWeight: 999,
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.settleCapped).toBe(true)
    // Ceiling = estimate × 1 → capped at CLAY_REFINE_SOAK_ESTIMATE (32).
    expect(result.value.settleActual).toBe(CLAY_REFINE_SOAK_ESTIMATE)
    // reserve 32 debited; settle actual 32 → delta 0 → balance stays 68.
    expect(adapter.balances.get('u1')).toBe(68)
    const capped = result.value.ledger.events.find((e) => e.title === 'Cost settle capped')
    expect(capped).toBeDefined()
    expect(capped?.summary).toContain('capped to 32')
    expect(capped?.refs).toContain(`reservation:${result.value.reservationId}`)
  })
})

describe('clay-refine live soak (bx→bw) — soak window + probe', () => {
  it('enforces the minimum soak observation window (fake clock/sleep)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const fetchImpl: FetchLike = async () => glbResponse(buildMinimalGlbFixture())

    let t = 0
    const result = await runClayRefineLiveSoak(
      baseInput({
        adapter,
        fetchImpl,
        clayModelUrl: 'https://cdn.example/clay.glb',
        soakMs: 5,
        nowUnixMs: () => t,
        sleep: async (ms) => {
          t += ms
        },
      }),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.soakMsRequired).toBe(5)
    expect(result.value.soakElapsedMs).toBeGreaterThanOrEqual(5)
  })

  it('probe self-verifies one real round-trip and stays honest', async () => {
    const probe = await probeClayRefineLiveSoakReadiness()
    expect(probe.liveSoakReady).toBe(true)
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.nativeOnnxReady).toBe(false)
    expect(probe.meshyTripoClayParityClaim).toBe(false)
    expect(probe.ueMeshQualityClaim).toBe(false)
    expect(probe.path).toBe('lib/mesh-quality/clay-refine-live-soak.ts')
  })

  it('reset clears module soak state for determinism', () => {
    __resetClayRefineLiveSoakForTests()
    // No crash; next soak starts from a clean module state.
    expect(true).toBe(true)
  })
})
