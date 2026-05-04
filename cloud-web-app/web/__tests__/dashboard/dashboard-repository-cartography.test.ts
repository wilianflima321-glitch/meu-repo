import { describe, expect, it } from 'vitest'

import { buildDashboardRepositoryCartographySnapshot } from '@/components/dashboard/dashboard-repository-cartography'
import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  buildRepositoryContextBudgetExecutionState,
  mergeRepositoryContextBudgetExecutionPatch,
} from '@/lib/production/repository-context-budget-execution'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
} from '@/lib/production/repository-cartography'

const now = '2026-05-04T12:00:00.000Z'

describe('dashboard repository cartography', () => {
  it('asks agents to map the repository before editing large projects', () => {
    const snapshot = buildDashboardRepositoryCartographySnapshot({})

    expect(snapshot.status).toBe('attention')
    expect(snapshot.nextAction).toBe('Run cartography')
    expect(snapshot.signals).toContainEqual({ label: 'Files', value: 'Not mapped', status: 'attention' })
    expect(snapshot.contextBudget.summary).toBe('Run scan to plan context slices')
    expect(snapshot.agents.map((agent) => agent.label)).toContain('Research Agent')
    expect(snapshot.guardrails).toContain('Do not load GB-scale assets directly into chat context.')
  })

  it('surfaces ready cartography as compact context gates and agent lanes', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1800 },
        { path: 'package.json', sizeBytes: 4000 },
        { path: 'docs/story-bible.md', sizeBytes: 12000 },
        { path: 'src/game/combat/CharacterController.ts', sizeBytes: 24000 },
        { path: 'assets/hero.glb', sizeBytes: 8 * 1024 * 1024, license: 'CC0' },
        { path: 'levels/arena.umap', sizeBytes: 2 * 1024 * 1024, license: 'Studio-owned' },
        { path: 'tests/playtest/boss-loop.spec.ts', sizeBytes: 9000 },
      ],
    })
    const productionState = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
      manifest
    )
    const contextBudgetExecution = mergeRepositoryContextBudgetExecutionPatch(
      buildRepositoryContextBudgetExecutionState({ projectId: 'boss-fight', manifest, now }),
      { batchId: 'read-canonical-contracts', status: 'complete' },
      now
    )
    const snapshot = buildDashboardRepositoryCartographySnapshot({
      productionState,
      manifest,
      contextBudgetExecution,
    })

    expect(snapshot.status).toBe('ready')
    expect(snapshot.statusLabel).toBe('Ready')
    expect(snapshot.signals).toContainEqual({ label: 'Graphs', value: '6/6', status: 'ready' })
    expect(snapshot.signals).toContainEqual({ label: 'Risk', value: 'Clear', status: 'ready' })
    expect(snapshot.contextBudget.summary).toContain('batches done')
    expect(snapshot.contextBudget.batches).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Read', value: expect.stringMatching(/\/\d+$/), status: 'ready' })])
    )
    expect(snapshot.agents.map((agent) => agent.label)).toEqual(
      expect.arrayContaining(['Asset Librarian Agent', 'Gameplay Engineer Agent', 'Producer Agent', 'QA Agent'])
    )
    expect(snapshot.summary).toContain('Mapped 7 files')
  })

  it('blocks agent confidence when cartography finds provenance or duplicate risks', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'cinematic-pack',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1800 },
        { path: 'docs/story-bible.md', sizeBytes: 12000 },
        { path: 'assets/hero.glb', sizeBytes: 64 * 1024 * 1024 },
        { path: 'assets/copy/hero.glb', sizeBytes: 64 * 1024 * 1024 },
        {
          path: 'models/external/city-pack.glb',
          sizeBytes: 310 * 1024 * 1024,
          sourceKind: 'huggingface-hub',
          sourceUrl: 'https://huggingface.co/example/city-pack',
        },
      ],
    })
    const productionState = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Cinematic pack', projectType: 'unreal', now }),
      manifest
    )
    const snapshot = buildDashboardRepositoryCartographySnapshot({ productionState, manifest })

    expect(snapshot.status).toBe('blocked')
    expect(snapshot.statusLabel).toBe('Blocked')
    expect(snapshot.signals.some((signal) => signal.label === 'Risk' && signal.status === 'blocked')).toBe(true)
    expect(snapshot.contextBudget.batches.find((batch) => batch.label === 'Index/Mirror')?.status).toBe('attention')
    expect(snapshot.agents.map((agent) => agent.label)).toContain('Research Agent')
    expect(snapshot.guardrails.join(' ')).toContain('Media assets need license/provenance review')
  })
})
