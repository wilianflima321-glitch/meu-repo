/**
 * J.4 — semantic recall certification soak (fail-closed measured).
 */

import { afterEach, describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  evaluateSemanticRecallSoak,
  getSemanticRecallSoakRecorder,
  J4_SEMANTIC_RECALL_MIN_RATE,
  J4_SEMANTIC_RECALL_MIN_SAMPLES,
  proveSemanticRecallReady,
  scoreSemanticRecallSample,
} from '@/lib/server/vector-index/semantic-recall-soak'
import {
  reindexProjectVectorStore,
  searchVectorIndex,
  stopVectorIndexWatcher,
} from '@/lib/server/vector-index'
import { __resetVectorStoreCacheForTests } from '@/lib/server/vector-index/store'

describe('j4-semantic-recall-soak', () => {
  let root: string
  const projectId = `j4_recall_${Date.now()}`

  afterEach(async () => {
    stopVectorIndexWatcher(projectId)
    __resetVectorStoreCacheForTests()
    getSemanticRecallSoakRecorder().clear()
    if (root) await fs.rm(root, { recursive: true, force: true }).catch(() => {})
  })

  it('empty samples → evidence held (no fake recall@1)', () => {
    const report = evaluateSemanticRecallSoak([])
    expect(report.evidenceStatus).toBe('held')
    expect(report.recallAt1).toBeNull()
    expect(proveSemanticRecallReady([]).ready).toBe(false)
    expect(proveSemanticRecallReady([]).reason).toBe('held_no_measured_samples')
  })

  it('scoreSemanticRecallSample matches expected path substring', () => {
    const hit = scoreSemanticRecallSample('gravity', 'physics.ts', 'src/physics.ts', 'local-hash')
    expect(hit.recallHit).toBe(true)
    const miss = scoreSemanticRecallSample('gravity', 'physics.ts', 'src/ui.ts', 'local-hash')
    expect(miss.recallHit).toBe(false)
  })

  it('proveReady requires ≥5 samples and recall@1 ≥ 80%', () => {
    const lowRecall = Array.from({ length: J4_SEMANTIC_RECALL_MIN_SAMPLES }, () =>
      scoreSemanticRecallSample('q', 'physics.ts', 'ui.ts', 'local-hash'),
    )
    expect(proveSemanticRecallReady(lowRecall).ready).toBe(false)
    expect(proveSemanticRecallReady(lowRecall).reason).toBe('recall_below_threshold')

    const fewHits = [
      scoreSemanticRecallSample('q1', 'physics.ts', 'physics.ts', 'local-hash'),
      scoreSemanticRecallSample('q2', 'physics.ts', 'physics.ts', 'local-hash'),
    ]
    expect(proveSemanticRecallReady(fewHits).ready).toBe(false)
    expect(proveSemanticRecallReady(fewHits).reason).toMatch(/insufficient_samples/)

    const certified = [
      ...Array.from({ length: 4 }, (_, i) =>
        scoreSemanticRecallSample(`q${i}`, 'physics.ts', 'physics.ts', 'local-hash'),
      ),
      scoreSemanticRecallSample('q5', 'physics.ts', 'ui.ts', 'local-hash'),
    ]
    const probe = proveSemanticRecallReady(certified)
    expect(probe.ready).toBe(true)
    expect(probe.report.recallAt1).toBeGreaterThanOrEqual(J4_SEMANTIC_RECALL_MIN_RATE)
  })

  it('live local-hash index achieves recall on fixture queries (measured, not certified until n≥5)', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-j4-recall-'))
    await fs.writeFile(
      path.join(root, 'physics.ts'),
      'export function applyGravity(v: number) { return v - 9.8 }\n',
      'utf8',
    )
    await fs.writeFile(path.join(root, 'ui.ts'), 'export const buttonLabel = "ok"\n', 'utf8')
    await reindexProjectVectorStore({ projectId, rootPath: root })

    const recorder = getSemanticRecallSoakRecorder()
    const fixtures = [
      { query: 'apply gravity physics', expected: 'physics.ts' },
      { query: 'applyGravity export function', expected: 'physics.ts' },
      { query: 'gravity force downward', expected: 'physics.ts' },
    ]

    for (const fx of fixtures) {
      const result = await searchVectorIndex({
        projectId,
        query: fx.query,
        topK: 1,
      })
      recorder.recordFromSearch({
        query: fx.query,
        expectedFilePathIncludes: fx.expected,
        topHitFilePath: result.hits[0]?.filePath ?? null,
        embedProvider: result.embedProvider,
      })
    }

    const report = recorder.report()
    expect(report.evidenceStatus).toBe('measured')
    expect(report.hitCount).toBeGreaterThanOrEqual(1)
    expect(report.recallAt1).toBeGreaterThan(0)
    expect(recorder.proveReady().ready).toBe(false)
    expect(recorder.proveReady().reason).toMatch(/insufficient_samples/)
  })
})
