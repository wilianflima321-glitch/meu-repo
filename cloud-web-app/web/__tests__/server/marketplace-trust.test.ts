import { describe, expect, it } from 'vitest'

import {
  assertAssetProvenanceReleaseReady,
  createAssetProvenanceEntry,
} from '@/lib/marketplace/asset-provenance'
import { validateMarketplaceAssetLicense } from '@/lib/marketplace/license-validator'

describe('marketplace trust helpers', () => {
  it('blocks licenses that cannot be redistributed commercially', () => {
    const decision = validateMarketplaceAssetLicense({
      license: 'CC-BY-NC-4.0',
      commercialUse: true,
      redistribution: true,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.blockers.join(' ')).toContain('commercial use')
  })

  it('requires ownership proof for proprietary-owned assets', () => {
    const decision = validateMarketplaceAssetLicense({
      license: 'proprietary-owned',
      commercialUse: true,
      redistribution: true,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.proofRequired).toBe(true)
  })

  it('creates a provenance entry with a deterministic hash', () => {
    const entry = createAssetProvenanceEntry({
      assetId: 'asset_001',
      uploaderUserId: 'user_001',
      content: 'mesh-bytes',
      declaredLicense: 'CC0-1.0',
      declaredOrigin: 'self-created',
      uploadedAt: new Date('2026-05-16T00:00:00.000Z'),
    })

    expect(entry.contentHash).toHaveLength(64)
    expect(entry.reviewStatus).toBe('pending')
    expect(entry.blockers).toEqual([])
  })

  it('keeps assets held until human review approves them', () => {
    const entry = createAssetProvenanceEntry({
      assetId: 'asset_002',
      uploaderUserId: 'user_001',
      content: 'audio-bytes',
      declaredLicense: 'MIT',
      declaredOrigin: 'self-created',
    })

    expect(assertAssetProvenanceReleaseReady(entry).releaseReady).toBe(false)

    const approved = { ...entry, reviewStatus: 'approved' as const }
    expect(assertAssetProvenanceReleaseReady(approved).releaseReady).toBe(true)
  })
})
