import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  __resetCreativeCostGuardForTests,
  createMemoryCostGuardLedger,
} from '@/lib/production/creative-cost-guard'
import {
  buildVectorIndexReadiness,
  createByokCloudEmbedProvider,
  createLocalHashEmbedProvider,
  getVectorIndexStats,
  probeSqliteVecExtension,
  reindexProjectVectorStore,
  reindexProjectWithByokEmbed,
  resolveVectorEmbedProvider,
  searchVectorIndex,
  stopVectorIndexWatcher,
  VECTOR_EMBED_DIM,
} from '@/lib/server/vector-index'
import {
  __resetSqliteVecProbeForTests,
  __setSqliteVecProbeForTests,
} from '@/lib/server/vector-index/sqlite-vec-probe'

describe('J.4 deepen — BYOK embed + sqlite-vec honesty', () => {
  let root: string
  const projectId = `j4_byok_${Date.now()}`

  afterEach(async () => {
    stopVectorIndexWatcher(projectId)
    __resetCreativeCostGuardForTests()
    __resetSqliteVecProbeForTests()
    if (root) await fs.rm(root, { recursive: true, force: true }).catch(() => {})
  })

  it('sqlite-vec probe reports HELD without claiming extension', () => {
    __resetSqliteVecProbeForTests()
    const probe = probeSqliteVecExtension()
    expect(probe.status).toBe('held')
    expect(probe.sqliteVecExtension).toBe(false)
    expect(probe.loaded).toBe(false)
    expect(probe.reason.toLowerCase()).toMatch(/held|fallback|not installed|not certified/)
  })

  it('readiness is PARTIAL — never trueSemanticRecall on local-hash', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-ready-'))
    await fs.writeFile(path.join(root, 'a.ts'), 'export const jumpPad = 1\n', 'utf8')
    await reindexProjectVectorStore({ projectId, rootPath: root })

    const readiness = buildVectorIndexReadiness({ projectId })
    expect(readiness.status).toBe('partial')
    expect(readiness.capabilityStatus).toBe('PARTIAL')
    expect(readiness.searchQuality).toBe('lexical-hash')
    expect(readiness.trueSemanticRecall).toBe(false)
    expect(readiness.platformPaysEmbeddings).toBe(false)
    expect(readiness.sqliteVecStatus).toBe('held')
    expect(readiness.blockers).toContain('native_sqlite_vec_extension_held')
    expect(readiness.blockers).toContain('true_semantic_recall_requires_byok_cloud_index')
  })

  it('free tier / missing BYOK key cannot resolve byok-cloud (fail-closed, local-hash ok)', async () => {
    const denied = await resolveVectorEmbedProvider({
      userId: 'u_free',
      projectId,
      mode: 'byok-cloud',
      estimatedEmbedChars: 100,
      planId: 'free',
    })
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.reason).toBe('BYOK_CLOUD_EMBED_REQUIRES_KEY')
      expect(denied.fallbackLocalHashAllowed).toBe(true)
    }

    const local = await resolveVectorEmbedProvider({
      userId: 'u_free',
      projectId,
      mode: 'local-hash',
      estimatedEmbedChars: 100,
      planId: 'free',
    })
    expect(local.ok).toBe(true)
    if (local.ok) {
      expect(local.searchQuality).toBe('lexical-hash')
      expect(local.provider.kind).toBe('local-hash')
    }
  })

  it('createByokCloudEmbedProvider never uses platform env key when apiKey empty', () => {
    const prev = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = 'sk-platform-must-not-be-used'
    try {
      expect(createByokCloudEmbedProvider({ apiKey: '' })).toBeNull()
      expect(createByokCloudEmbedProvider({ apiKey: '   ' })).toBeNull()
    } finally {
      if (prev === undefined) delete process.env.OPENAI_API_KEY
      else process.env.OPENAI_API_KEY = prev
    }
  })

  it('BYOK cloud provider embeds via supplied key (mocked fetch)', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [{ index: 0, embedding: Array.from({ length: VECTOR_EMBED_DIM }, (_, i) => i * 0.001) }],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch

    const provider = createByokCloudEmbedProvider({
      apiKey: 'sk-test-byok',
      fetchImpl,
    })
    expect(provider).not.toBeNull()
    const vectors = await provider!.embed(['hello vector'])
    expect(vectors).toHaveLength(1)
    expect(vectors[0]).toHaveLength(VECTOR_EMBED_DIM)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]
    const auth = (init.headers as Record<string, string>).Authorization
    expect(auth).toBe('Bearer sk-test-byok')
    expect(auth).not.toContain('platform')
  })

  it('search with byok-cloud without key falls back to lexical-hash (no platform pay)', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-search-'))
    await fs.writeFile(
      path.join(root, 'physics.ts'),
      'export function applyGravity(v: number) { return v - 9.8 }\n',
      'utf8',
    )
    await reindexProjectVectorStore({ projectId, rootPath: root })

    const result = await searchVectorIndex({
      projectId,
      query: 'apply gravity physics',
      topK: 3,
      embedMode: 'byok-cloud',
      userId: 'u1',
      planId: 'free',
      // no byokApiKey
    })
    expect(result.modeUsed).toBe('local-hash')
    expect(result.searchQuality).toBe('lexical-hash')
    expect(result.deniedReason).toBe('BYOK_CLOUD_EMBED_REQUIRES_KEY')
    expect(result.hits.length).toBeGreaterThan(0)
    expect(result.hits[0].filePath).toContain('physics')
  })

  it('byok-cloud search against local-hash index denies semantic (index mismatch)', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-mismatch-'))
    await fs.writeFile(path.join(root, 'x.ts'), 'export const x = 1\n', 'utf8')
    await reindexProjectVectorStore({
      projectId,
      rootPath: root,
      embed: createLocalHashEmbedProvider(),
    })

    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')

    const result = await searchVectorIndex({
      projectId,
      query: 'x',
      embedMode: 'byok-cloud',
      byokApiKey: 'sk-test',
      userId: 'u1',
      planId: 'pro',
      costGuardAdapter: adapter,
    })
    expect(result.modeUsed).toBe('local-hash')
    expect(result.deniedReason).toMatch(/BYOK_INDEX_REQUIRED/)
  })

  it('reindexProjectWithByokEmbed fail-closed without key', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-reindex-'))
    await fs.writeFile(path.join(root, 'y.ts'), 'export const y = 2\n', 'utf8')
    const denied = await reindexProjectWithByokEmbed({
      userId: 'u_free',
      projectId,
      rootPath: root,
      planId: 'free',
    })
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.reason).toBe('BYOK_CLOUD_EMBED_REQUIRES_KEY')
  })

  it('stats expose sqliteVecStatus held + lexical searchQuality', async () => {
    __setSqliteVecProbeForTests({
      status: 'held',
      loaded: false,
      sqliteVecExtension: false,
      reason: 'test held',
    })
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-stats-'))
    await fs.writeFile(path.join(root, 'z.ts'), 'export const z = 3\n', 'utf8')
    await reindexProjectVectorStore({ projectId, rootPath: root })
    const stats = getVectorIndexStats(projectId)
    expect(stats.sqliteVecExtension).toBe(false)
    expect(stats.sqliteVecStatus).toBe('held')
    expect(stats.searchQuality).toBe('lexical-hash')
    expect(stats.embedProvider).toBe('local-hash')
  })
})
