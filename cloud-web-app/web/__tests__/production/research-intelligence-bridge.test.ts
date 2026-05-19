import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState, PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildRepositoryCartographyManifest } from '@/lib/production/repository-cartography'
import {
  buildResearchIntelligencePacket,
  mergeResearchIntelligenceIntoProductionState,
  readResearchIntelligencePacketFromSettings,
  RESEARCH_INTELLIGENCE_SETTINGS_KEY,
  writeResearchIntelligencePacketToSettings,
} from '@/lib/production/research-intelligence-bridge'

const generatedAt = '2026-05-12T12:00:00.000Z'

function buildManifest() {
  return buildRepositoryCartographyManifest({
    projectId: 'boss-fight-research',
    generatedAt,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 1200 },
      { path: 'story/creative-bible.md', sizeBytes: 24_000 },
      { path: 'src/game/combat/BossController.ts', sizeBytes: 41_000, symbols: ['BossController'] },
      { path: 'assets/characters/boss.glb', sizeBytes: 220_000_000, sourceKind: 'huggingface-hub', sourceUrl: 'https://huggingface.co/datasets/aethel/boss-kit' },
      { path: 'tests/playtest/boss.spec.ts', sizeBytes: 8_000 },
    ],
  })
}

describe('research intelligence bridge', () => {
  it('links external research claims to repository cartography without treating web research as repo truth', () => {
    const manifest = buildManifest()
    const packet = buildResearchIntelligencePacket({
      projectId: 'boss-fight-research',
      generatedAt,
      repositoryManifest: manifest,
      mission: 'Improve boss combat feel with sourced evidence.',
      evidence: [
        {
          title: 'Boss combat readability benchmark',
          sourceKind: 'official-docs',
          url: 'https://docs.example.com/combat/readability',
          claim: 'Boss attack windups need visible anticipation frames before damage windows.',
          confidence: 0.92,
          relatedPaths: ['src/game/combat/BossController.ts'],
        },
        {
          title: 'Boss kit candidate on Hugging Face',
          url: 'https://huggingface.co/datasets/aethel/boss-kit',
          claim: 'External boss kit may provide rigged reference assets.',
          confidence: 0.8,
          relatedPaths: ['assets/characters/boss.glb'],
        },
        {
          title: 'Cloud dashboard setup browser run',
          sourceKind: 'browser-operator',
          claim: 'The deployment provider toggle appears available after login.',
          confidence: 0.5,
          requiresBrowserReplay: true,
          requiresHumanApproval: true,
        },
      ],
    })

    expect(packet.contextLinks.repositoryManifestId).toBe(manifest.id)
    expect(packet.contextLinks.relatedSurfaceCount).toBe(2)
    expect(packet.claims[0]).toMatchObject({
      status: 'confirmed-by-repo',
      repoSurfaceIds: expect.arrayContaining([expect.stringContaining('bosscontroller')]),
    })
    expect(packet.sources[1]).toMatchObject({ sourceKind: 'huggingface-hub' })
    expect(packet.externalToolPlan.map((plan) => plan.id)).toEqual(
      expect.arrayContaining(['hf-metadata-first', 'browser-replay-capture', 'web-research-citation-pass'])
    )
    expect(packet.guardrails.join(' ')).toContain('Hugging Face Hub usage starts with metadata')
    expect(packet.risks.map((risk) => risk.id)).toEqual(
      expect.arrayContaining(['browser-operator-replay-required', 'huggingface-metadata-first'])
    )
  })

  it('blocks autonomous edits when research conflicts with mapped repo evidence', () => {
    const packet = buildResearchIntelligencePacket({
      projectId: 'conflict-project',
      generatedAt,
      repositoryManifest: buildManifest(),
      evidence: [
        {
          title: 'Contradictory camera advice',
          sourceKind: 'web',
          claim: 'Use instant camera cuts during melee combos.',
          confidence: 0.9,
          relatedPaths: ['src/game/combat/BossController.ts'],
          conflictWithRepo: true,
        },
      ],
    })

    expect(packet.claims[0].status).toBe('conflicts-with-repo')
    expect(packet.risks[0]).toMatchObject({ id: 'research-conflicts-with-repo', severity: 'blocker' })
  })

  it('merges research into Project Brain, Mission Ledger, and evidence validation graphs', () => {
    const manifest = buildManifest()
    const packet = buildResearchIntelligencePacket({
      projectId: 'boss-fight-research',
      generatedAt,
      repositoryManifest: manifest,
      evidence: [
        {
          title: 'Combat benchmark',
          sourceKind: 'official-docs',
          claim: 'Telegraph attacks before damage frames.',
          confidence: 0.9,
          relatedPaths: ['src/game/combat/BossController.ts'],
        },
      ],
    })
    const state = buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal' })
    const merged = mergeResearchIntelligenceIntoProductionState(state, packet)

    expect(merged.ledger[0]).toMatchObject({ id: 'research-intelligence', ownerAgent: 'Research Agent' })
    expect(merged.graphs.evidenceGraph[0]).toMatchObject({ id: 'research-intelligence-evidenceGraph' })
    expect(merged.graphs.validationGraph[0]).toMatchObject({ id: 'research-intelligence-validationGraph' })
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain('Research intelligence coverage')
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain(manifest.id)
  })

  it('persists the latest research packet in project settings', () => {
    const packet = buildResearchIntelligencePacket({
      projectId: 'settings-project',
      generatedAt,
      evidence: [{ title: 'Official docs', sourceKind: 'official-docs', claim: 'Use source-backed claims.', confidence: 0.8 }],
    })
    const settings = writeResearchIntelligencePacketToSettings({ [PRODUCTION_STATE_SETTINGS_KEY]: { version: 1 } }, packet)

    expect(settings[RESEARCH_INTELLIGENCE_SETTINGS_KEY]).toMatchObject({ id: packet.id })
    expect(readResearchIntelligencePacketFromSettings(settings)).toMatchObject({ projectId: 'settings-project' })
    expect(readResearchIntelligencePacketFromSettings({ [RESEARCH_INTELLIGENCE_SETTINGS_KEY]: { version: 1 } })).toBeNull()
  })
})
