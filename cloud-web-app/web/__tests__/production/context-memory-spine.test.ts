import { describe, expect, it } from 'vitest'

import {
  buildContextMemorySpinePlan,
  validateContextMemorySpinePlan,
} from '@/lib/production/context-memory-spine'
import {
  buildMultiResolutionProjectMemory,
  planGbScaleProjectIndexing,
  planProjectMemoryRetrieval,
} from '@/lib/production/multi-resolution-project-memory'
import { buildRepositoryCartographyManifest, type RepositoryArtifactInput } from '@/lib/production/repository-cartography'

const generatedAt = '2026-05-26T12:00:00.000Z'

function artifacts(): RepositoryArtifactInput[] {
  return [
    { path: '.aethelrules', sizeBytes: 1_800 },
    { path: 'README.md', sizeBytes: 6_000 },
    { path: 'src/game/combat/AbilitySystem.ts', sizeBytes: 48_000, symbols: ['AbilitySystem'] },
    { path: 'src/game/world/WorldStreaming.ts', sizeBytes: 76_000, symbols: ['WorldStreaming'] },
    { path: 'docs/creative-bible.md', sizeBytes: 32_000 },
    {
      path: 'external/huggingface/city-pack/city.glb',
      sizeBytes: 920_000_000,
      sourceKind: 'huggingface-hub',
      sourceUrl: 'https://huggingface.co/datasets/aethel/city-pack',
      hash: 'sha256-city',
    },
    { path: 'cinematics/intro.timeline.json', sizeBytes: 180_000 },
    { path: 'tests/playtest/smoke.spec.ts', sizeBytes: 14_000 },
  ]
}

function memoryFixture() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'context-spine',
    generatedAt,
    artifacts: artifacts(),
  })
  return buildMultiResolutionProjectMemory({ manifest, generatedAt })
}

function smallMemoryFixture() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'context-spine-small',
    generatedAt,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 1_800 },
      { path: 'README.md', sizeBytes: 6_000 },
      { path: 'src/app/page.tsx', sizeBytes: 18_000, symbols: ['HomePage'] },
      { path: 'tests/playtest/smoke.spec.ts', sizeBytes: 14_000 },
    ],
  })
  return buildMultiResolutionProjectMemory({ manifest, generatedAt })
}

describe('context memory spine', () => {
  it('blocks broad autonomous work when project memory is missing', () => {
    const plan = buildContextMemorySpinePlan({
      mission: 'Build the whole game from memory',
      surface: 'web',
      conversationHistoryChars: 12_000,
    })

    expect(plan.status).toBe('blocked')
    expect(plan.blockers.join(' ')).toContain('Project memory')
    expect(validateContextMemorySpinePlan(plan)).toEqual([])
  })

  it('uses summary/index lanes and read receipts instead of dumping large memory into the IDE', () => {
    const memory = memoryFixture()
    const retrievalPlan = planProjectMemoryRetrieval({
      memory,
      mission: 'Improve game combat and world streaming quality',
      requestedPaths: ['src/game/combat/AbilitySystem.ts', 'external/huggingface/city-pack/city.glb'],
      maxTokenBudget: 16_000,
    })
    const plan = buildContextMemorySpinePlan({
      mission: 'Improve game combat and world streaming quality',
      surface: 'ide',
      model: 'claude-sonnet',
      memory,
      retrievalPlan,
      evidenceRefs: ['repo-cartography:context-spine'],
      conversationHistoryChars: 20_000,
    })

    expect(plan.status).toBe('needs-review')
    expect(plan.requiresReadReceipts).toBe(true)
    expect(plan.compressionLane).not.toBe('direct-context')
    expect(plan.hallucinationControls.join(' ')).toContain('read receipts')
    expect(validateContextMemorySpinePlan(plan)).toEqual([])
  })

  it('holds indexing on weak devices instead of slowing the browser or hallucinating assets', () => {
    const memory = memoryFixture()
    const retrievalPlan = planProjectMemoryRetrieval({
      memory,
      mission: 'Create a cinematic city scene with licensed assets',
      requestedPaths: ['external/huggingface/city-pack/city.glb'],
      maxTokenBudget: 32_000,
    })
    const indexingPlan = planGbScaleProjectIndexing({
      memory,
      allowCloudIndexing: false,
      runtime: {
        availableRamBytes: 900_000_000,
        availableDiskBytes: 600_000_000,
        thermalState: 'critical',
        cpuLoadPercent: 96,
        localCacheBytes: 0,
        webGpuAvailable: false,
        browserOperatorReplayAvailable: false,
      },
    })
    const plan = buildContextMemorySpinePlan({
      mission: 'Create a cinematic city scene with licensed assets',
      surface: 'web',
      model: 'gpt-4.1',
      memory,
      retrievalPlan,
      indexingPlan,
      evidenceRefs: ['asset-card:city-pack'],
      readReceiptRefs: ['memory:project-overview'],
      conversationHistoryChars: 4_000,
    })

    expect(plan.status).toBe('held')
    expect(plan.canUseUiThread).toBe(false)
    expect(plan.requiresHumanReview).toBe(true)
    expect(plan.compressionLane).toBe('human-review')
    expect(plan.deviceControls.join(' ')).toContain('Never index GB-scale projects')
    expect(validateContextMemorySpinePlan(plan)).toEqual([])
  })

  it('allows cloud-agent work only after evidence and read receipts exist within budget', () => {
    const memory = smallMemoryFixture()
    const retrievalPlan = planProjectMemoryRetrieval({
      memory,
      mission: 'Review symbol index and playtest evidence',
      requestedPaths: ['tests/playtest/smoke.spec.ts'],
      maxTokenBudget: 12_000,
    })
    const plan = buildContextMemorySpinePlan({
      mission: 'Review symbol index and playtest evidence',
      surface: 'cloud-agent',
      model: 'gemini-pro',
      memory,
      retrievalPlan,
      evidenceRefs: ['playtest:smoke', 'repo-cartography:context-spine'],
      readReceiptRefs: retrievalPlan.selectedShardIds.map((id) => `read:${id}`),
      conversationHistoryChars: 8_000,
      requestedMaxInputTokens: 64_000,
    })

    expect(plan.status).toBe('available')
    expect(plan.requiresReadReceipts).toBe(false)
    expect(plan.plannedInputTokens).toBeLessThanOrEqual(plan.usableInputTokens)
    expect(validateContextMemorySpinePlan(plan)).toEqual([])
  })
})
