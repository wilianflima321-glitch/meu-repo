/**
 * J.4 — BYOK reindex → semantic recall certification (mock provider + gate logic).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import {
  assertFreeTierStaysLocalHash,
  createMockByokEmbedProviderForCert,
  evaluateJ4ByokEmbedGate,
  runJ4ByokSemanticCertification,
} from '@/lib/server/vector-index/j4-byok-semantic-cert'
import {
  createByokCloudEmbedProvider,
  J4_SEMANTIC_RECALL_MIN_SAMPLES,
  reindexProjectWithByokEmbed,
  stopVectorIndexWatcher,
  VECTOR_EMBED_DIM,
} from '@/lib/server/vector-index'
import { __resetVectorStoreCacheForTests } from '@/lib/server/vector-index/store'

describe('j4-byok-semantic-cert', () => {
  let root: string
  const projectId = `j4_cert_${Date.now()}`

  afterEach(async () => {
    stopVectorIndexWatcher(projectId)
    __resetCreativeCostGuardForTests()
    __resetVectorStoreCacheForTests()
    if (root) await fs.rm(root, { recursive: true, force: true }).catch(() => {})
  })

  it('free tier without BYOK key → gate denied, local-hash allowed', async () => {
    const gate = await evaluateJ4ByokEmbedGate({
      userId: 'u_free',
      projectId,
      planId: 'free',
    })
    expect(gate.byokCloudAllowed).toBe(false)
    expect(gate.localHashAllowed).toBe(true)
    expect(gate.platformPayBlocked).toBe(true)
    expect(gate.reason).toBe('BYOK_CLOUD_EMBED_REQUIRES_KEY')

    const stayLocal = await assertFreeTierStaysLocalHash({
      userId: 'u_free',
      projectId,
      planId: 'free',
    })
    expect(stayLocal.ok).toBe(true)
    if (stayLocal.ok) expect(stayLocal.provider.kind).toBe('local-hash')
  })

  it('createByokCloudEmbedProvider never uses platform OPENAI_API_KEY', () => {
    const prev = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-platform-forbidden'
    try {
      expect(createByokCloudEmbedProvider({ apiKey: '' })).toBeNull()
    } finally {
      if (prev === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = prev
    }
  })

  it('reindexProjectWithByokEmbed fail-closed without BYOK key', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-cert-deny-'))
    await fs.writeFile(path.join(root, 'a.ts'), 'export const a = 1\n', 'utf8')
    const denied = await reindexProjectWithByokEmbed({
      userId: 'u1',
      projectId,
      rootPath: root,
      planId: 'free',
    })
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.reason).toBe('BYOK_CLOUD_EMBED_REQUIRES_KEY')
  })

  it('mock BYOK reindex → recall certification passes on fixture corpus', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-cert-'))
    await fs.writeFile(
      path.join(root, 'physics.ts'),
      'export function applyGravity(v: number) { return v - 9.8 }\n',
      'utf8',
    )
    await fs.writeFile(path.join(root, 'ui.ts'), 'export const buttonLabel = "ok"\n', 'utf8')

    const mockEmbed = createMockByokEmbedProviderForCert()
    const fixtures = [
      { query: 'apply gravity physics force', expectedFilePathIncludes: 'physics.ts' },
      { query: 'applyGravity downward', expectedFilePathIncludes: 'physics.ts' },
      { query: 'gravity mass velocity', expectedFilePathIncludes: 'physics.ts' },
      { query: 'physics applyGravity export', expectedFilePathIncludes: 'physics.ts' },
      { query: 'force gravity physics module', expectedFilePathIncludes: 'physics.ts' },
    ]

    const report = await runJ4ByokSemanticCertification({
      projectId,
      rootPath: root,
      fixtures,
      embed: mockEmbed,
    })

    expect(report.reindexOk).toBe(true)
    expect(report.embedProvider).toBe('byok-cloud')
    expect(report.searchQuality).toBe('byok-semantic')
    expect(report.platformPayBlocked).toBe(true)
    expect(report.recallProbe.report.sampleCount).toBeGreaterThanOrEqual(
      J4_SEMANTIC_RECALL_MIN_SAMPLES,
    )
    expect(report.certified).toBe(true)
    expect(report.gateReason).toBe('j4_byok_semantic_recall_certified')
  })

  it('BYOK cloud provider via mocked fetch (never platform key)', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: Array.from({ length: VECTOR_EMBED_DIM }, (_, i) => i * 0.01) }],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch

    const provider = createByokCloudEmbedProvider({
      apiKey: 'sk-byok-test',
      fetchImpl,
    })
    expect(provider).not.toBeNull()
    const vectors = await provider!.embed(['semantic query'])
    expect(vectors[0]).toHaveLength(VECTOR_EMBED_DIM)

    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u_pro')
    const gate = await evaluateJ4ByokEmbedGate({
      userId: 'u_pro',
      projectId,
      planId: 'pro',
      byokApiKey: 'sk-byok-test',
      costGuardAdapter: adapter,
    })
    expect(gate.byokCloudAllowed).toBe(true)
    expect(gate.platformPayBlocked).toBe(true)
  })
})
