import { describe, expect, it } from 'vitest'

import {
  buildMultiResolutionProjectMemory,
  planGbScaleProjectIndexing,
  planProjectMemoryRetrieval,
} from '@/lib/production/multi-resolution-project-memory'
import { buildRepositoryCartographyManifest, type RepositoryArtifactInput } from '@/lib/production/repository-cartography'
import { buildResearchIntelligencePacket } from '@/lib/production/research-intelligence-bridge'

const generatedAt = '2026-05-13T04:10:00.000Z'

function artifacts(): RepositoryArtifactInput[] {
  return [
    { path: '.aethelrules', sizeBytes: 2_000 },
    { path: 'README.md', sizeBytes: 8_000 },
    { path: 'src/app/page.tsx', sizeBytes: 24_000, symbols: ['HomePage'] },
    { path: 'src/game/combat/BossController.ts', sizeBytes: 44_000, symbols: ['BossController'] },
    { path: 'story/creative-bible.md', sizeBytes: 18_000 },
    {
      path: 'external/huggingface/hero-pack/hero.glb',
      sizeBytes: 540_000_000,
      sourceKind: 'huggingface-hub',
      sourceUrl: 'https://huggingface.co/datasets/aethel/hero-pack',
      hash: 'sha256-hero',
    },
    { path: 'cinematics/intro.timeline.json', sizeBytes: 120_000 },
    { path: 'tests/playtest/boss.spec.ts', sizeBytes: 11_000 },
  ]
}

describe('multi-resolution project memory', () => {
  it('turns cartography and research into layered memory without raw GB context', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'aaa-slice',
      generatedAt,
      artifacts: artifacts(),
    })
    const researchPacket = buildResearchIntelligencePacket({
      projectId: 'aaa-slice',
      generatedAt,
      repositoryManifest: manifest,
      evidence: [
        {
          title: 'Hero rig dataset card',
          sourceKind: 'huggingface-hub',
          url: 'https://huggingface.co/datasets/aethel/hero-pack',
          claim: 'Hero asset requires metadata-first license review.',
          confidence: 0.9,
          relatedPaths: ['external/huggingface/hero-pack/hero.glb'],
        },
      ],
    })

    const memory = buildMultiResolutionProjectMemory({ manifest, researchPacket, generatedAt })

    expect(memory.totalBytes).toBeGreaterThan(500_000_000)
    expect(memory.noRawContextRules.join(' ')).toContain('Never dump an entire GB-scale repository')
    expect(memory.retrievalPolicy.join(' ')).toContain('metadata-only shards')
    expect(memory.shards.map((shard) => shard.layer)).toEqual(
      expect.arrayContaining(['project-overview', 'domain-summary', 'surface-index', 'symbol-index', 'asset-metadata', 'external-research'])
    )
    expect(memory.shards.find((shard) => shard.id === 'external-research')?.requiresReadReceipt).toBe(true)
    expect(memory.shards.find((shard) => shard.title.includes('hero.glb'))?.strategy).toBe('metadata-only')
  })

  it('plans retrieval by budget and holds human-review shards instead of loading everything', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'aaa-slice',
      generatedAt,
      artifacts: artifacts(),
    })
    const memory = buildMultiResolutionProjectMemory({ manifest, generatedAt })
    const plan = planProjectMemoryRetrieval({
      memory,
      mission: 'Improve gameplay boss combat and validate asset license',
      requestedPaths: ['src/game/combat/BossController.ts', 'external/huggingface/hero-pack/hero.glb'],
      maxTokenBudget: 16_000,
    })

    expect(plan.selectedShardIds).toContain('project-overview')
    expect(plan.estimatedTokens).toBeLessThanOrEqual(16_000)
    expect(plan.metadataRefs.join(' ')).toContain('hero.glb')
    expect(plan.nextAction).toMatch(/read receipts|human\/license/)
  })

  it('routes GB-scale memory through workers, cloud, metadata, or held lanes without blocking UI', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'aaa-slice',
      generatedAt,
      artifacts: artifacts(),
    })
    const memory = buildMultiResolutionProjectMemory({ manifest, generatedAt })
    const plan = planGbScaleProjectIndexing({
      memory,
      allowCloudIndexing: true,
      runtime: {
        availableRamBytes: 24_000_000_000,
        availableDiskBytes: 800_000_000_000,
        thermalState: 'nominal',
        cpuLoadPercent: 22,
        localCacheBytes: 0,
        webGpuAvailable: true,
        browserOperatorReplayAvailable: true,
      },
    })

    expect(plan.canRunOnUiThread).toBe(false)
    expect(plan.metadataOnlyRefs.join(' ')).toContain('huggingface.co')
    expect(plan.shardPlans.some((shard) => shard.cacheTier === 'metadata-only')).toBe(true)
    expect(plan.shardPlans.every((shard) => shard.lane !== 'ui-safe' || shard.estimatedBytes <= 256_000)).toBe(true)
    expect(plan.shardPlans.some((shard) => ['local-worker', 'local-sidecar', 'cloud-indexer', 'human-review'].includes(shard.lane))).toBe(true)
  })

  it('holds or cloud-routes indexing when local runtime is weak', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'aaa-slice',
      generatedAt,
      artifacts: artifacts(),
    })
    const memory = buildMultiResolutionProjectMemory({ manifest, generatedAt })
    const plan = planGbScaleProjectIndexing({
      memory,
      allowCloudIndexing: false,
      runtime: {
        availableRamBytes: 768_000_000,
        availableDiskBytes: 600_000_000,
        thermalState: 'critical',
        cpuLoadPercent: 95,
        localCacheBytes: 0,
        webGpuAvailable: false,
        browserOperatorReplayAvailable: false,
      },
    })

    expect(plan.heldBytes).toBeGreaterThan(0)
    expect(plan.blockers.join(' ')).toContain('held')
    expect(plan.nextAction).toContain('Pause apply')
  })
})
