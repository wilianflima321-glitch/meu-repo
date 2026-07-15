/**
 * Letter bx — Live clay OBJ/GLB poll → 3D Quality Pipeline.
 * Mocked provider HTTP only — no real API keys required in CI.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildMinimalObjFixture,
  parseObjToRawMesh,
} from '@/lib/mesh-quality/clay-provider-adapters'
import {
  buildMinimalGlbFixture,
  createMeshyPollClient,
  createTripoPollClient,
  createLumaPollClient,
  createClayPollClient,
  parseGlbToRawMesh,
  pollClayJobUntilReady,
  resolveLiveClayMesh,
  LIVE_CLAY_POLL_WIRED,
  LIVE_CLAY_POLL_LETTER,
  type FetchLike,
} from '@/lib/mesh-quality/clay-live-poll'
import { runLiveClayPollIntoQualityPipeline } from '@/lib/mesh-quality/live-clay-quality-bridge'
import { probeMeshQualityHonesty } from '@/lib/mesh-quality/mesh-quality-honesty'
import { countTriangles } from '@/lib/mesh-quality/types'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import { __resetCreativeFusionTransactionsForTests } from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
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

function bytesResponse(
  bytes: Uint8Array,
  contentType: string,
  status = 200,
): Awaited<ReturnType<FetchLike>> {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    async text() {
      return new TextDecoder().decode(bytes)
    },
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
    async json() {
      return {}
    },
  }
}

describe('Live clay poll honesty (bx)', () => {
  it('flips liveClayPollReady only when path wired', () => {
    expect(LIVE_CLAY_POLL_WIRED).toBe(true)
    expect(LIVE_CLAY_POLL_LETTER).toBe('bx')
    const honesty = probeMeshQualityHonesty({
      conveyorProven: true,
      liveClayPollProven: true,
    })
    expect(honesty.liveClayPollReady).toBe(true)
    expect(honesty.modules.liveClayPoll).toBe(true)
    expect(honesty.tripoOnlyShipAllowed).toBe(false)
  })

  it('does not flip when explicitly unproven', () => {
    const honesty = probeMeshQualityHonesty({ liveClayPollProven: false })
    expect(honesty.liveClayPollReady).toBe(false)
  })
})

describe('GLB / OBJ parse fixtures (bx)', () => {
  it('parses minimal GLB fixture to non-empty mesh', () => {
    const glb = buildMinimalGlbFixture()
    const mesh = parseGlbToRawMesh(glb)
    expect(mesh).not.toBeNull()
    expect(countTriangles(mesh!)).toBeGreaterThan(0)
    expect(mesh!.positions.length).toBeGreaterThanOrEqual(9)
  })

  it('parses OBJ fixture', () => {
    const mesh = parseObjToRawMesh(buildMinimalObjFixture())
    expect(mesh).not.toBeNull()
    expect(countTriangles(mesh!)).toBe(12)
  })
})

describe('Provider poll clients (bx)', () => {
  it('Meshy poll completes with OBJ url preference', async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (String(url).includes('meshy.ai')) {
        return jsonResponse({
          status: 'SUCCEEDED',
          progress: 100,
          model_urls: {
            glb: 'https://cdn.example/clay.glb',
            obj: 'https://cdn.example/clay.obj',
          },
        })
      }
      throw new Error(`unexpected url ${url}`)
    }
    const client = createMeshyPollClient({ apiKey: 'test-meshy', fetchImpl })
    const poll = await client.pollJob('task-m1')
    expect(poll.status).toBe('completed')
    expect(poll.modelUrl).toBe('https://cdn.example/clay.obj')
    expect(poll.objUrl).toBe('https://cdn.example/clay.obj')
  })

  it('Tripo poll fails empty-honest', async () => {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({
        data: { status: 'failed', message: 'provider_rejected', progress: 0 },
      })
    const client = createTripoPollClient({ apiKey: 'test-tripo', fetchImpl })
    const poll = await client.pollJob('task-t1')
    expect(poll.status).toBe('failed')
    expect(poll.error).toContain('provider_rejected')
  })

  it('Luma webhook-ready payload normalizes completed', () => {
    const client = createLumaPollClient({ apiKey: 'test-luma', fetchImpl: async () => jsonResponse({}) })
    const poll = client.fromWebhookPayload({
      id: 'gen-1',
      state: 'completed',
      assets: { obj: 'https://cdn.example/luma.obj' },
    })
    expect(poll?.status).toBe('completed')
    expect(poll?.modelUrl).toBe('https://cdn.example/luma.obj')
  })

  it('createClayPollClient fail-closed without BYOK key', () => {
    expect(createClayPollClient('tripo', {})).toBeNull()
    expect(createClayPollClient('meshy', { MESHY_API_KEY: 'k' })).not.toBeNull()
  })

  it('pollClayJobUntilReady times out empty-honest', async () => {
    const client = createMeshyPollClient({
      apiKey: 'k',
      fetchImpl: async () => jsonResponse({ status: 'IN_PROGRESS', progress: 10 }),
    })
    const result = await pollClayJobUntilReady({
      client,
      taskId: 'slow',
      maxAttempts: 2,
      intervalMs: 0,
      sleep: async () => undefined,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.blockedReason).toBe('clay_poll_timeout')
  })
})

describe('resolveLiveClayMesh → conveyor (bx)', () => {
  it('polls Meshy → downloads OBJ → mesh', async () => {
    const obj = buildMinimalObjFixture(1)
    const fetchImpl: FetchLike = async (url) => {
      const u = String(url)
      if (u.includes('meshy.ai')) {
        return jsonResponse({
          status: 'SUCCEEDED',
          model_urls: { obj: 'https://cdn.example/clay.obj' },
        })
      }
      if (u.includes('clay.obj')) {
        return bytesResponse(new TextEncoder().encode(obj), 'text/plain')
      }
      throw new Error(`unexpected ${u}`)
    }

    const resolved = await resolveLiveClayMesh({
      provider: 'meshy',
      taskId: 'm-ready',
      keys: { MESHY_API_KEY: 'k' },
      fetchImpl,
      maxAttempts: 2,
      intervalMs: 0,
    })
    expect(resolved.ok).toBe(true)
    expect(resolved.mesh).toBeDefined()
    expect(countTriangles(resolved.mesh!)).toBeGreaterThan(0)
    expect(resolved.receipt.status).toBe('closed')
  })

  it('empty-honest when job failed', async () => {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({
        data: { status: 'failed', message: 'oob_prompt' },
      })
    const resolved = await resolveLiveClayMesh({
      provider: 'tripo',
      taskId: 't-fail',
      keys: { TRIPO_API_KEY: 'k' },
      fetchImpl,
    })
    expect(resolved.ok).toBe(false)
    expect(resolved.blockedReason).toContain('oob_prompt')
    expect(resolved.receipt.status).toBe('rejected')
  })

  it('fail-closed without BYOK', async () => {
    const resolved = await resolveLiveClayMesh({
      provider: 'luma',
      taskId: 'x',
      keys: {},
    })
    expect(resolved.ok).toBe(false)
    expect(resolved.blockedReason).toBe('BYOK_MISSING_FOR_LUMA')
  })

  it('downloads GLB when only glb url present', async () => {
    const glb = buildMinimalGlbFixture()
    const fetchImpl: FetchLike = async (url) => {
      const u = String(url)
      if (u.includes('meshy.ai')) {
        return jsonResponse({
          status: 'SUCCEEDED',
          model_urls: { glb: 'https://cdn.example/clay.glb' },
        })
      }
      if (u.includes('clay.glb')) {
        return bytesResponse(glb, 'model/gltf-binary')
      }
      throw new Error(`unexpected ${u}`)
    }
    const resolved = await resolveLiveClayMesh({
      provider: 'meshy',
      taskId: 'm-glb',
      keys: { MESHY_API_KEY: 'k' },
      fetchImpl,
    })
    expect(resolved.ok).toBe(true)
    expect(resolved.mesh).toBeDefined()
  })
})

describe('runLiveClayPollIntoQualityPipeline (bx)', () => {
  it('CostGuard reject — settle:0 path (fail-closed Zero-UI)', async () => {
    const obj = buildMinimalObjFixture()
    const fetchImpl: FetchLike = async (url) => {
      if (String(url).includes('meshy.ai')) {
        return jsonResponse({
          status: 'SUCCEEDED',
          model_urls: { obj: 'https://cdn.example/clay.obj' },
        })
      }
      return bytesResponse(new TextEncoder().encode(obj), 'text/plain')
    }
    const adapter = createMemoryCostGuardLedger()
    // free / no BYOK → deny
    const result = await runLiveClayPollIntoQualityPipeline({
      projectId: 'p-bx',
      userId: 'u1',
      prompt: 'clay knight',
      clayJob: { provider: 'meshy', taskId: 'm1' },
      pollKeys: { MESHY_API_KEY: 'k' },
      fetchImpl,
      costGuardAdapter: adapter,
      planId: 'free',
    })
    expect(result.success).toBe(false)
    expect(result.liveClayPollReady).toBe(true)
    expect(result.blockedReason).toBeTruthy()
  })

  it('poll → ingest → retopo conveyor when BYOK present', async () => {
    const obj = buildMinimalObjFixture(2)
    const fetchImpl: FetchLike = async (url) => {
      if (String(url).includes('tripo3d.ai')) {
        return jsonResponse({
          data: {
            status: 'success',
            progress: 100,
            output: { model: 'https://cdn.example/t.glb', obj: 'https://cdn.example/t.obj' },
          },
        })
      }
      return bytesResponse(new TextEncoder().encode(obj), 'text/plain')
    }
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const result = await runLiveClayPollIntoQualityPipeline({
      projectId: 'p-bx',
      userId: 'u1',
      prompt: 'dark fantasy clay',
      clayJob: { provider: 'tripo', taskId: 't-ready' },
      pollKeys: { TRIPO_API_KEY: 'k' },
      fetchImpl,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
      targetTriangles: 200,
      capabilityScore: 80,
      writePackEntry: false,
    })
    expect(result.success).toBe(true)
    expect(result.liveClayPollReady).toBe(true)
    expect(result.livePollLetter).toBe('bx')
    expect(result.tripoOnlyShipAllowed).toBe(false)
    expect(result.mesh).toBeDefined()
    expect(result.stages.some((s) => s.stage === 'clay-ingest' && s.status === 'closed')).toBe(true)
    expect(result.stages.some((s) => s.stage === 'auto-retopo' && s.status === 'closed')).toBe(true)
  })

  it('webhook payload short-circuits poll on completed', async () => {
    const obj = buildMinimalObjFixture()
    const fetchImpl: FetchLike = async (url) => {
      if (String(url).includes('cdn.example')) {
        return bytesResponse(new TextEncoder().encode(obj), 'text/plain')
      }
      throw new Error('poll HTTP should not run when webhook completed')
    }
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const result = await runLiveClayPollIntoQualityPipeline({
      projectId: 'p-bx',
      userId: 'u1',
      prompt: 'webhook clay',
      clayJob: { provider: 'luma', taskId: 'gen-wh' },
      pollKeys: { LUMA_API_KEY: 'k' },
      fetchImpl,
      webhookPayload: {
        id: 'gen-wh',
        state: 'completed',
        assets: { obj: 'https://cdn.example/wh.obj' },
      },
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
      targetTriangles: 100,
      capabilityScore: 90,
    })
    expect(result.success).toBe(true)
    expect(result.pollReceipt?.status).toBe('closed')
  })

  it('requires cost guard adapter', async () => {
    const result = await runLiveClayPollIntoQualityPipeline({
      projectId: 'p',
      userId: 'u',
      prompt: 'x',
      clayJob: { provider: 'meshy', taskId: 't' },
      pollKeys: { MESHY_API_KEY: 'k' },
    })
    expect(result.success).toBe(false)
    expect(result.blockedReason).toBe('cost_guard_adapter_required')
  })
})
