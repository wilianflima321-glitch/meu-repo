import { describe, expect, it } from 'vitest'

import {
  buildAssetLibraryCatalogEntry,
  buildPolyHavenSourceAdapter,
  buildSketchfabSourceAdapter,
  evaluateAssetLicensePolicy,
  sourceAllowsUseCase,
} from '@/lib/assets/library'

const completeQualityChecklist = {
  provenanceRef: 'provenance:polyhaven:asset-1',
  licenseRef: 'license:cc0:polyhaven',
  sourceManifestRef: 'source-manifest:asset-1',
  checksum: 'sha256:asset-1',
  pbrMaps: {
    baseColor: true,
    normal: true,
    roughness: true,
    metallicOrSpecular: true,
  },
  pbrCompressionReportRef: 'pbr-compression:asset-1',
  lodManifestRef: 'lod-manifest:asset-1',
  lodLevels: ['LOD0', 'LOD1', 'LOD2', 'LOD3'] as const,
  collisionProxyRef: 'collision:asset-1',
  navmeshProxyRef: 'navmesh:asset-1',
  performanceTraceRef: 'perf:viewport:asset-1',
  humanReviewRef: 'human-review:art-direction:asset-1',
}

describe('asset library quality spine', () => {
  it('blocks unknown or restricted licenses before any install claim', () => {
    const policy = evaluateAssetLicensePolicy({
      licenseKind: 'unknown',
      useCase: 'client-delivery',
      sourceUrl: 'https://example.com/asset',
      licenseRef: 'license:unknown',
      checksum: 'sha256:unknown',
    })

    expect(policy.state).toBe('blocked')
    expect(policy.allowed).toBe(false)
    expect(policy.blockers).toContain('License is unknown; asset cannot be used in governed builds.')
  })

  it('blocks CC-BY marketplace redistribution without explicit redistribution rights', () => {
    const policy = evaluateAssetLicensePolicy({
      licenseKind: 'cc-by',
      useCase: 'marketplace-redistribution',
      sourceUrl: 'https://example.com/asset',
      licenseRef: 'license:cc-by',
      checksum: 'sha256:asset',
      attributionRef: 'attribution:asset',
      humanApproved: true,
    })

    expect(policy.state).toBe('blocked')
    expect(policy.redistributionAllowed).toBe(false)
    expect(policy.blockers).toContain(
      'Marketplace redistribution requires CC0, owned, or explicit commercial redistribution terms.',
    )
  })

  it('keeps complete CC0 catalog assets installable but never marks final claims ready', () => {
    const entry = buildAssetLibraryCatalogEntry({
      id: 'asset:polyhaven:studio-hdri',
      title: 'Studio HDRI',
      assetKind: 'hdri',
      sourceKind: 'polyhaven',
      sourceUrl: 'https://polyhaven.com/a/studio_small_09',
      licenseKind: 'cc0',
      useCase: 'public-demo',
      qualityChecklist: completeQualityChecklist,
      humanApproved: true,
      tags: ['lighting', 'hdri'],
    })

    expect(entry.state).toBe('available')
    expect(entry.installAllowed).toBe(true)
    expect(entry.finalClaimAllowed).toBe(false)
    expect(entry.missingEvidence).toEqual([])
    expect(entry.requiredEvidence).toContain('LOD0/LOD1/LOD2/LOD3 manifest')
    expect(entry.requiredEvidence).toContain('PBR texture compression report')
    expect(entry.requiredEvidence).toContain('collision/navmesh proxy report')
  })

  it('keeps Sketchfab redistribution held unless license terms are reviewed', () => {
    const sketchfab = buildSketchfabSourceAdapter({ licenseKind: 'cc-by' })

    expect(sketchfab.state).toBe('human_review_required')
    expect(sourceAllowsUseCase(sketchfab, 'marketplace-redistribution')).toBe(false)
    expect(sketchfab.requiredReceipts).toContain('commercial terms receipt')
  })

  it('declares Poly Haven as metadata-first, not final asset proof', () => {
    const polyhaven = buildPolyHavenSourceAdapter()

    expect(polyhaven.state).toBe('needs-review')
    expect(sourceAllowsUseCase(polyhaven, 'client-delivery')).toBe(true)
    expect(polyhaven.prohibitedClaims).toContain('final asset')
  })
})
