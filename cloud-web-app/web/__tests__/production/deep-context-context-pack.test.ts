import { describe, expect, it } from 'vitest'

import type { DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'
import { buildDeepContextPack, validateDeepContextPack } from '@/lib/production/deep-context-context-pack'

const snapshot: DeepContextMemorySnapshot = {
  version: 1,
  projectId: 'project-1',
  updatedAt: '2026-05-26T14:00:00.000Z',
  chunks: [
    {
      id: 'world-approved',
      projectId: 'project-1',
      category: 'world',
      title: 'World economy rule',
      content: 'Solar magic powers shops, travel and faction reputation across the city.',
      tags: ['world', 'magic', 'faction'],
      sourceRefs: ['docs/world.md'],
      evidenceRefs: ['evidence://world-rule'],
      importance: 0.9,
      tokenEstimate: 18,
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T12:00:00.000Z',
    },
    {
      id: 'release-draft',
      projectId: 'project-1',
      category: 'gameplay',
      title: 'Draft release mechanic',
      content: 'Faction boss fight draft has not been reviewed yet.',
      tags: ['gameplay', 'boss', 'faction'],
      sourceRefs: [],
      evidenceRefs: [],
      importance: 0.7,
      tokenEstimate: 16,
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T13:00:00.000Z',
    },
  ],
}

describe('deep context context pack', () => {
  it('builds a bounded model-aware context pack with deterministic cache key', () => {
    const pack = buildDeepContextPack({
      snapshot,
      query: 'magic faction world',
      mode: 'creative',
      surface: 'ide',
      model: 'claude-opus-4.5',
      maxTokens: 1_000,
      readReceiptRefs: ['read://world-approved'],
    })

    expect(pack.status).toBe('available')
    expect(pack.modelMaxInputTokens).toBe(200_000)
    expect(pack.selectedItems.map((item) => item.chunk.id)).toContain('world-approved')
    expect(pack.cacheKey).toMatch(/^[a-f0-9]{24}$/)
    expect(pack.context).toContain('CONTEXT GOVERNANCE')
    expect(validateDeepContextPack(pack)).toEqual([])
  })

  it('holds release memory without evidence and asks for review', () => {
    const pack = buildDeepContextPack({
      snapshot,
      query: 'faction boss release',
      mode: 'release',
      surface: 'cloud-agent',
      includeHeld: true,
      readReceiptRefs: ['read://world-approved'],
    })

    expect(pack.requiresEvidence).toBe(true)
    expect(pack.status).toBe('held')
    expect(pack.heldItems.map((item) => item.chunk.id)).toContain('release-draft')
    expect(pack.nextAction).toContain('Add evidence')
    expect(validateDeepContextPack(pack)).toEqual([])
  })

  it('blocks broad autonomous work when memory is missing', () => {
    const pack = buildDeepContextPack({
      snapshot: null,
      query: 'build the complete game',
      mode: 'gameplay',
    })

    expect(pack.status).toBe('blocked')
    expect(pack.projectId).toBeNull()
    expect(pack.context).toContain('Project memory is missing')
    expect(pack.warnings).toEqual(expect.arrayContaining(['Project memory snapshot is missing.']))
  })
})
