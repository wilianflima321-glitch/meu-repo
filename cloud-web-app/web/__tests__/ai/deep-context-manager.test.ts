import { describe, expect, it } from 'vitest'

import {
  DeepContextManager,
  InMemoryDeepContextPersistenceAdapter,
} from '@/lib/ai/deep-context-manager'

describe('DeepContextManager', () => {
  it('persists and reloads project memory through an adapter', async () => {
    const adapter = new InMemoryDeepContextPersistenceAdapter()
    const manager = new DeepContextManager({ projectId: 'game-1', adapter })
    await manager.initialize('game-1')
    const chunk = await manager.memorize(
      'rules',
      'Magic consumes stamina and cannot be used during tower stun.',
      ['magic', 'stamina', 'tower'],
      {
        id: 'rule-magic-stamina',
        title: 'Combat magic rule',
        sourceRefs: ['docs/creative-bible.md'],
        evidenceRefs: ['bible:combat-rules'],
        importance: 0.9,
        now: '2026-05-26T14:00:00.000Z',
      }
    )

    const reloaded = new DeepContextManager({ projectId: 'game-1', adapter })
    await reloaded.initialize('game-1')
    const recalled = await reloaded.recallRelevantChunks('tower stamina magic', { requireEvidence: true })

    expect(chunk.tokenEstimate).toBeGreaterThan(1)
    expect(recalled.chunks.map((item) => item.id)).toContain('rule-magic-stamina')
    expect(recalled.context).toContain('evidence:bible:combat-rules')
  })

  it('ranks relevant chunks and respects token/chunk budgets', async () => {
    const manager = new DeepContextManager({ projectId: 'film-1' })
    await manager.initialize('film-1')
    await manager.memorize('shot', 'Opening shot: rainy neon street, slow dolly, no explosions.', ['rain', 'neon', 'opening'], {
      id: 'shot-opening',
      evidenceRefs: ['shotlist:intro'],
      importance: 0.8,
    })
    await manager.memorize('character', 'Hero is quiet, avoids violence, and protects the courier.', ['hero', 'courier'], {
      id: 'character-hero',
      evidenceRefs: ['bible:hero'],
      importance: 0.7,
    })
    await manager.memorize('asset', 'City marketplace pack is 4GB and must remain metadata-only until licensed.', ['city', 'marketplace'], {
      id: 'asset-city-pack',
      evidenceRefs: ['license:city-pack'],
      importance: 0.6,
    })

    const result = await manager.recallRelevantChunks('neon opening courier city', {
      maxChunks: 2,
      maxTokens: 60,
      requireEvidence: true,
      includeHeld: true,
    })

    expect(result.chunks).toHaveLength(2)
    expect(result.heldChunks.length).toBeGreaterThanOrEqual(1)
    expect(result.estimatedTokens).toBeLessThanOrEqual(60)
    expect(result.context).toContain('shot-opening')
  })

  it('holds chunks without evidence when evidence is required', async () => {
    const manager = new DeepContextManager({ projectId: 'asset-1' })
    await manager.initialize('asset-1')
    await manager.memorize('asset', 'Dragon mesh draft from an AI generator, not final.', ['dragon', 'mesh'], {
      id: 'asset-dragon-draft',
      sourceRefs: ['assets/dragon.glb'],
      importance: 0.9,
    })

    const result = await manager.recallRelevantChunks('dragon mesh final', {
      requireEvidence: true,
      includeHeld: true,
    })

    expect(result.chunks).toEqual([])
    expect(result.heldChunks.map((chunk) => chunk.id)).toContain('asset-dragon-draft')
    expect(result.warnings.join(' ')).toContain('held')
  })

  it('creates a bounded agent snapshot with rules, status, refs and warnings', async () => {
    const manager = new DeepContextManager({ projectId: 'aaa-vertical-slice' })
    await manager.initialize('aaa-vertical-slice')
    await manager.memorize('rules', 'No final release without playtest, performance trace, license and human approval.', ['release', 'playtest'], {
      id: 'rule-release-hold',
      evidenceRefs: ['release-policy:v1'],
      importance: 1,
    })
    await manager.memorize('gameplay', 'The first vertical slice contains one arena, two abilities and one enemy archetype.', ['vertical-slice', 'arena'], {
      id: 'gameplay-scope',
      evidenceRefs: ['scope:v1'],
      importance: 0.9,
    })

    const snapshot = await manager.getSnapshotForAgent({ maxTokens: 1_000, requireEvidence: true })

    expect(snapshot).toContain('ACTIVE WORLD RULES')
    expect(snapshot).toContain('CURRENT STORY / GAMEPLAY STATUS')
    expect(snapshot).toContain('evidence:release-policy:v1')
    expect(snapshot).toContain('evidence:scope:v1')
    expect(snapshot.length).toBeLessThan(8_000)
  })
})
