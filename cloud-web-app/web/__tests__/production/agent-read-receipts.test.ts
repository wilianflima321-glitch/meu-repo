import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState, PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildRepositoryCartographyManifest } from '@/lib/production/repository-cartography'
import { buildResearchIntelligencePacket } from '@/lib/production/research-intelligence-bridge'
import {
  AGENT_READ_RECEIPTS_SETTINGS_KEY,
  buildAgentReadReceiptState,
  evaluateAgentReadinessForApply,
  mergeAgentReadReceiptsIntoProductionState,
  readAgentReadReceiptStateFromSettings,
  writeAgentReadReceiptStateToSettings,
} from '@/lib/production/agent-read-receipts'

const generatedAt = '2026-05-12T12:00:00.000Z'
const readAt = '2026-05-12T12:05:00.000Z'

function buildManifest() {
  return buildRepositoryCartographyManifest({
    projectId: 'read-receipts-project',
    generatedAt,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 1200 },
      { path: 'story/creative-bible.md', sizeBytes: 24_000 },
      { path: 'src/game/combat/BossController.ts', sizeBytes: 41_000, symbols: ['BossController'] },
      {
        path: 'assets/characters/boss.glb',
        sizeBytes: 220_000_000,
        sourceKind: 'huggingface-hub',
        sourceUrl: 'https://huggingface.co/datasets/aethel/boss-kit',
      },
    ],
  })
}

function buildPacket(manifest = buildManifest()) {
  return buildResearchIntelligencePacket({
    projectId: manifest.projectId,
    generatedAt,
    repositoryManifest: manifest,
    mission: 'Improve boss combat with sourced evidence and no invented asset facts.',
    evidence: [
      {
        title: 'Boss combat readability benchmark',
        sourceKind: 'official-docs',
        url: 'https://docs.example.com/combat/readability',
        claim: 'Boss attack windups need visible anticipation frames before damage windows.',
        confidence: 0.91,
        relatedPaths: ['src/game/combat/BossController.ts'],
      },
      {
        title: 'Candidate boss kit on Hugging Face',
        sourceKind: 'huggingface-hub',
        url: 'https://huggingface.co/datasets/aethel/boss-kit',
        claim: 'External boss assets must be metadata-mirrored before download.',
        confidence: 0.8,
        relatedPaths: ['assets/characters/boss.glb'],
      },
    ],
  })
}

describe('agent read receipts', () => {
  it('deduplicates receipts and keeps the latest reading evidence first', () => {
    const state = buildAgentReadReceiptState({
      projectId: 'read-receipts-project',
      receipts: [
        { id: 'same', agent: 'Gameplay Engineer Agent', kind: 'repository-cartography', ref: 'old', readAt: generatedAt },
        { id: 'same', agent: 'Gameplay Engineer Agent', kind: 'repository-cartography', ref: 'new', readAt },
        { agent: 'Research Agent', kind: 'external-tool-plan', ref: 'hf-metadata-first', readAt: generatedAt },
      ],
    })

    expect(state.receipts).toHaveLength(2)
    expect(state.receipts[0]).toMatchObject({ id: 'same', ref: 'new' })
  })

  it('blocks enforced apply when Repository Cartography has not been produced', () => {
    const decision = evaluateAgentReadinessForApply({
      agent: 'Gameplay Engineer Agent',
      targetPaths: ['src/game/combat/BossController.ts'],
      enforceReadReceipts: true,
      manifest: null,
      receiptState: null,
    })

    expect(decision).toMatchObject({
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_CARTOGRAPHY_REQUIRED',
      status: 428,
    })
  })

  it('requires the current cartography manifest before target-surface edits', () => {
    const manifest = buildManifest()
    const decision = evaluateAgentReadinessForApply({
      agent: 'Gameplay Engineer Agent',
      targetPaths: ['src/game/combat/BossController.ts'],
      enforceReadReceipts: true,
      manifest,
      receiptState: buildAgentReadReceiptState({ projectId: manifest.projectId, receipts: [] }),
    })

    expect(decision).toMatchObject({
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_CARTOGRAPHY_UNREAD',
      status: 428,
    })
  })

  it('blocks research-derived edits when research has blocker conflicts', () => {
    const manifest = buildManifest()
    const conflictingPacket = buildResearchIntelligencePacket({
      projectId: manifest.projectId,
      generatedAt,
      repositoryManifest: manifest,
      evidence: [
        {
          title: 'Contradictory combat advice',
          sourceKind: 'web',
          claim: 'Skip anticipation frames for faster boss attacks.',
          confidence: 0.92,
          relatedPaths: ['src/game/combat/BossController.ts'],
          conflictWithRepo: true,
        },
      ],
    })
    const state = buildAgentReadReceiptState({
      projectId: manifest.projectId,
      receipts: [{ agent: 'Producer Agent', kind: 'repository-cartography', ref: manifest.id, readAt }],
    })

    const decision = evaluateAgentReadinessForApply({
      agent: 'Gameplay Engineer Agent',
      targetPaths: ['src/game/combat/BossController.ts'],
      enforceReadReceipts: true,
      manifest,
      researchPacket: conflictingPacket,
      receiptState: state,
    })

    expect(decision).toMatchObject({
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_RESEARCH_BLOCKED',
      status: 409,
    })
    expect(decision.metadata.blockers.join(' ')).toContain('research conflicts with repository evidence')
  })

  it('passes when the coordinator has read cartography, research, and the target surface', () => {
    const manifest = buildManifest()
    const packet = buildPacket(manifest)
    const surface = manifest.surfaces.find((item) => item.path === 'src/game/combat/BossController.ts')
    expect(surface).toBeTruthy()

    const receiptState = buildAgentReadReceiptState({
      projectId: manifest.projectId,
      receipts: [
        { id: 'cartography-read', agent: 'Producer Agent', kind: 'repository-cartography', ref: manifest.id, readAt },
        { id: 'research-read', agent: 'Producer Agent', kind: 'research-intelligence', ref: packet.id, readAt },
        { id: 'surface-read', agent: 'Producer Agent', kind: 'repo-surface', ref: surface!.id, path: surface!.path, readAt },
      ],
    })

    const decision = evaluateAgentReadinessForApply({
      agent: 'Gameplay Engineer Agent',
      targetPaths: ['src/game/combat/BossController.ts'],
      enforceReadReceipts: true,
      manifest,
      researchPacket: packet,
      receiptState,
    })

    expect(decision).toMatchObject({ allowed: true, enforcement: 'passed' })
    expect(decision.metadata.acceptedReceiptIds).toEqual(['cartography-read', 'research-read', 'surface-read'])
  })

  it('merges read receipt coverage into Project Brain and the Mission Ledger', () => {
    const receiptState = buildAgentReadReceiptState({
      projectId: 'read-receipts-project',
      receipts: [{ id: 'cartography-read', agent: 'Producer Agent', kind: 'repository-cartography', ref: 'manifest-1', readAt }],
    })
    const state = buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'game' })
    const merged = mergeAgentReadReceiptsIntoProductionState(state, receiptState)

    expect(merged.ledger[0]).toMatchObject({ id: 'agent-read-receipts', ownerAgent: 'Producer Agent' })
    expect(merged.brain.technicalBible.constraints.join(' ')).toContain('Agent applies require read receipts')
  })

  it('persists receipts in project settings', () => {
    const receiptState = buildAgentReadReceiptState({
      projectId: 'settings-project',
      receipts: [{ agent: 'Producer Agent', kind: 'repository-cartography', ref: 'manifest-1', readAt }],
    })
    const settings = writeAgentReadReceiptStateToSettings({ [PRODUCTION_STATE_SETTINGS_KEY]: { version: 1 } }, receiptState)

    expect(settings[AGENT_READ_RECEIPTS_SETTINGS_KEY]).toMatchObject({ projectId: 'settings-project' })
    expect(readAgentReadReceiptStateFromSettings(settings)).toMatchObject({ receipts: expect.any(Array) })
    expect(readAgentReadReceiptStateFromSettings({ [AGENT_READ_RECEIPTS_SETTINGS_KEY]: { version: 1 } })).toBeNull()
  })
})
