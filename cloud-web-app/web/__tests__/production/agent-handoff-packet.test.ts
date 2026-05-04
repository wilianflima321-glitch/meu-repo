import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildAgentHandoffPacket } from '@/lib/production/agent-handoff-packet'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
} from '@/lib/production/repository-cartography'

const now = '2026-05-04T18:30:00.000Z'

describe('agent handoff packet', () => {
  it('gives specialized agents scoped surfaces, evidence, guardrails, and next actions', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'boss-fight',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 2000 },
        { path: 'package.json', sizeBytes: 3000 },
        { path: 'story/creative-bible.md', sizeBytes: 10_000 },
        { path: 'src/game/combat/BossController.ts', sizeBytes: 30_000 },
        { path: 'assets/boss.glb', sizeBytes: 1024 * 1024, license: 'internal' },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 8000 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
      manifest
    )
    const packet = buildAgentHandoffPacket({
      projectId: 'boss-fight',
      agent: 'Gameplay Engineer Agent',
      state,
      manifest,
      generatedAt: now,
    })

    expect(packet.version).toBe(1)
    expect(packet.status).toBe('ready')
    expect(packet.mission.objective).toContain('Boss fight')
    expect(packet.cartography.manifestId).toBe(manifest.id)
    expect(packet.cartography.contextBudget.estimatedChunkCount).toBeGreaterThan(0)
    expect(packet.cartography.contextBudget.retrievalBatches.map((batch) => batch.id)).toEqual(
      expect.arrayContaining(['read-canonical-contracts', 'index-heavy-surfaces'])
    )
    expect(packet.cartography.contextBudget.guardrails.join(' ')).toContain('Never load the full repository')
    expect(packet.cartography.ownedSurfaces).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'src/game/combat/BossController.ts' })])
    )
    expect(packet.cartography.doNotInvent.join(' ')).toContain('Do not create demo/prototype replacements')
    expect(packet.workContract.lane).toBe('gameplay')
    expect(packet.workContract.scopeLock.mode).toBe('diff-only')
    expect(packet.workContract.allowedTools).toEqual(expect.arrayContaining(['playtest-runner', 'viewport-capture']))
    expect(packet.acceptance).toContain('Cite Repository Cartography evidence before edits')
    expect(packet.nextActions.join(' ')).toContain('Map gameplay systems')
  })

  it('blocks confidence when manifest contains high-severity asset gaps', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'cinematic',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 2000 },
        { path: 'story/creative-bible.md', sizeBytes: 10_000 },
        { path: 'assets/hero.glb', sizeBytes: 30 * 1024 * 1024 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Cinematic', projectType: 'unreal', now }),
      manifest
    )
    const packet = buildAgentHandoffPacket({
      projectId: 'cinematic',
      agent: 'Asset Librarian Agent',
      state,
      manifest,
      generatedAt: now,
    })

    expect(packet.status).toBe('blocked')
    expect(packet.blockers.join(' ')).toContain('Media assets need license/provenance review')
    expect(packet.cartography.criticalGaps.map((gap) => gap.id)).toContain('gap-license-provenance')
  })

  it('falls back safely when no manifest is persisted yet', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Web app', projectType: 'web', now })
    const packet = buildAgentHandoffPacket({
      projectId: 'web-app',
      agent: 'Software Engineer Agent',
      state,
      generatedAt: now,
    })

    expect(packet.status).toBe('needs-review')
    expect(packet.cartography.manifestId).toBeNull()
    expect(packet.cartography.doNotInvent).toContain('Do not edit without a fresh Repository Cartography manifest.')
    expect(packet.cartography.contextBudget.guardrails.join(' ')).toContain('Repository Context Budget missing')
    expect(packet.cartography.ownedSurfaces).toEqual([])
    expect(packet.workContract.scopeLock.mode).toBe('read-only')
    expect(packet.workContract.blockedUntil).toContain('Run Repository Cartography before broad edits or asset imports.')
  })
})
