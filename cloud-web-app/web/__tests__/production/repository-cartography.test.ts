import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  readRepositoryCartographyManifestFromSettings,
  RepositoryArtifactInput,
  REPOSITORY_CARTOGRAPHY_SETTINGS_KEY,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

const generatedAt = '2026-05-04T18:00:00.000Z'

function buildGameFilmArtifacts(): RepositoryArtifactInput[] {
  return [
    { path: '.aethelrules', sizeBytes: 3_000 },
    { path: 'README.md', sizeBytes: 8_000 },
    { path: 'package.json', sizeBytes: 2_400 },
    { path: 'docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md', sizeBytes: 32_000 },
    { path: 'story/creative-bible.md', sizeBytes: 24_000 },
    { path: 'src/game/combat/BossController.ts', sizeBytes: 42_000, symbols: ['BossController'] },
    { path: 'src/game/physics/HitReactionSystem.ts', sizeBytes: 38_000, symbols: ['HitReactionSystem'] },
    { path: 'cinematics/shot_001.timeline.json', sizeBytes: 130_000 },
    { path: 'levels/forest_boss_arena.umap', sizeBytes: 75_000_000, license: 'internal' },
    {
      path: 'external/hf/boss-rig/Boss.fbx',
      sizeBytes: 380_000_000,
      sourceKind: 'huggingface-hub',
      sourceUrl: 'https://huggingface.co/datasets/aethel/boss-rig',
      hash: 'sha256-boss-rig',
    },
    {
      path: 'external/hf/boss-rig/Boss_COPY.fbx',
      sizeBytes: 380_000_000,
      sourceKind: 'huggingface-hub',
      sourceUrl: 'https://huggingface.co/datasets/aethel/boss-rig',
      hash: 'sha256-boss-rig',
    },
    { path: 'tests/playtest/boss-combo.spec.ts', sizeBytes: 16_000 },
  ]
}

describe('repository cartography', () => {
  it('maps giant game and film repositories into evidence-first context strategy', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt,
      artifacts: buildGameFilmArtifacts(),
    })

    expect(manifest.version).toBe(1)
    expect(manifest.sourceKinds).toContain('huggingface-hub')
    expect(manifest.totals.totalFiles).toBe(12)
    expect(manifest.totals.domainCounts['engine-code']).toBeGreaterThanOrEqual(2)
    expect(manifest.totals.domainCounts['film-shot']).toBeGreaterThanOrEqual(1)
    expect(manifest.totals.domainCounts['game-scene']).toBeGreaterThanOrEqual(1)
    expect(manifest.totals.strategyCounts['external-mirror']).toBe(2)
    expect(manifest.contextBudget.externalMirrorBytes).toBe(760_000_000)
    expect(manifest.contextBudget.estimatedChunkCount).toBeGreaterThan(10)
    expect(manifest.contextBudget.retrievalBatches.map((batch) => batch.id)).toEqual(
      expect.arrayContaining(['read-canonical-contracts', 'mirror-external-metadata', 'manual-review-queue'])
    )
    expect(manifest.contextBudget.guardrails.join(' ')).toContain('Never load the full repository')
    expect(manifest.contextPlan.mustReadFirst).toEqual(
      expect.arrayContaining([
        '.aethelrules',
        'README.md',
        'package.json',
        'story/creative-bible.md',
      ])
    )
    expect(manifest.contextPlan.doNotInvent.join(' ')).toContain('Do not create demo/prototype replacements')
    expect(manifest.contextPlan.doNotInvent.join(' ')).toContain('GB-scale external repositories')
    expect(manifest.contextBudget.retrievalBatches.find((batch) => batch.id === 'mirror-external-metadata')?.surfaces).toEqual(
      expect.arrayContaining(['external/hf/boss-rig/Boss.fbx', 'external/hf/boss-rig/Boss_COPY.fbx'])
    )
    expect(manifest.agentHandoffs.map((handoff) => handoff.agent)).toEqual(
      expect.arrayContaining([
        'Producer Agent',
        'Research Agent',
        'Asset Librarian Agent',
        'Gameplay Engineer Agent',
        'Cinematic Editor Agent',
        'QA Agent',
        'Performance Agent',
      ])
    )
  })

  it('detects duplicates, license gaps, and no-invention guardrails before agents edit', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt,
      artifacts: buildGameFilmArtifacts(),
    })

    expect(manifest.duplicateGroups).toHaveLength(1)
    expect(manifest.duplicateGroups[0].reason).toBe('hash')
    expect(manifest.duplicateGroups[0].paths).toEqual(
      expect.arrayContaining(['external/hf/boss-rig/Boss.fbx', 'external/hf/boss-rig/Boss_COPY.fbx'])
    )
    expect(manifest.criticalGaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining(['gap-license-provenance', 'gap-duplicate-surfaces', 'gap-external-mirror'])
    )
    expect(manifest.criticalGaps.find((gap) => gap.id === 'gap-license-provenance')?.severity).toBe('blocker')
    expect(manifest.contextPlan.doNotInvent.join(' ')).toContain('unlicensed assets')
    expect(manifest.contextPlan.doNotInvent.join(' ')).not.toContain('invent lore')
  })

  it('merges cartography into the Project Brain, Mission Ledger, and production graphs', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt,
      artifacts: buildGameFilmArtifacts(),
    })
    const state = buildDefaultAgenticProductionState({
      projectName: 'Boss fight vertical slice',
      projectType: 'unreal',
      now: '2026-05-04T17:00:00.000Z',
    })
    const merged = mergeRepositoryCartographyIntoProductionState(state, manifest)

    expect(merged.updatedAt).toBe(generatedAt)
    expect(merged.ledger[0]).toMatchObject({
      id: 'repo-cartography',
      state: 'needs-approval',
      ownerAgent: 'Producer Agent',
    })
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain('Repository cartography coverage')
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain('external-mirror metadata')
    expect(merged.brain.risks.join(' ')).toContain('Media assets need license/provenance review')
    expect(merged.graphs.assetGraph[0]).toMatchObject({
      id: 'repo-cartography-assetGraph',
      status: 'blocked',
      ownerAgent: 'Asset Librarian Agent',
      evidenceRefs: [`repo-cartography:${manifest.id}`],
    })
    expect(merged.graphs.evidenceGraph[0]).toMatchObject({
      id: 'repo-cartography-evidenceGraph',
      status: 'ready',
    })
    expect(merged.runtimePolicy.requiresHumanApproval).toBe(true)
  })

  it('raises story and validation gaps when a game repo lacks creative and playtest context', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'empty-action-game',
      generatedAt,
      artifacts: [
        { path: 'src/game/combat/ComboSystem.ts', sizeBytes: 31_000 },
        { path: 'content/hero.glb', sizeBytes: 22_000_000, license: 'internal' },
      ],
    })

    expect(manifest.criticalGaps.map((gap) => gap.id)).toEqual(
      expect.arrayContaining(['gap-story-bible', 'gap-playtest-validation', 'gap-project-rules', 'gap-build-contract'])
    )
    expect(manifest.contextPlan.doNotInvent.join(' ')).toContain('Do not invent lore')
    expect(manifest.agentHandoffs.find((handoff) => handoff.agent === 'Producer Agent')?.priority).toBe('critical')
  })

  it('classifies root-level documentation folders without requiring a leading slash', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'root-docs',
      generatedAt,
      artifacts: [
        { path: 'docs/story-bible.md', sizeBytes: 12_000 },
        { path: 'docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md', sizeBytes: 32_000 },
      ],
    })

    expect(manifest.totals.domainCounts['story-doc']).toBe(2)
    expect(manifest.totals.domainCounts.unknown).toBe(0)
    expect(manifest.criticalGaps.map((gap) => gap.id)).not.toContain('gap-unknown-surfaces')
    expect(manifest.contextPlan.mustReadFirst).toEqual(
      expect.arrayContaining(['docs/story-bible.md', 'docs/master/106_AI_GAME_FILM_PRODUCTION_CONTRACT_2026-05-04.md'])
    )
  })

  it('persists and reads the latest manifest from project settings', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt,
      artifacts: buildGameFilmArtifacts(),
    })
    const settings = writeRepositoryCartographyManifestToSettings({ theme: 'dark' }, manifest)

    expect(settings[REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]).toMatchObject({ id: manifest.id })
    expect(readRepositoryCartographyManifestFromSettings(settings)).toMatchObject({
      id: manifest.id,
      projectId: 'boss-fight',
      surfaces: expect.arrayContaining([expect.objectContaining({ path: '.aethelrules' })]),
    })
    expect(readRepositoryCartographyManifestFromSettings({ [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: { version: 1 } })).toBeNull()
  })
})
