import type { AssetLicenseKind, AssetUseCase } from '@/lib/assets/library/catalog/license-policy'
import type { AssetSourceAdapterContract } from '@/lib/assets/library/sources/source-policy'

export function buildSketchfabSourceAdapter(input: {
  licenseKind?: AssetLicenseKind
  commercialTermsReviewed?: boolean
} = {}): AssetSourceAdapterContract {
  const licenseKind = input.licenseKind ?? 'unknown'
  const commercialOrOwned = licenseKind === 'commercial-license' || licenseKind === 'proprietary-owned'
  const cc0 = licenseKind === 'cc0'
  const allowedUseCases: AssetUseCase[] =
    cc0 || commercialOrOwned
      ? ['browser-preview', 'public-demo', 'client-delivery', 'marketplace-redistribution']
      : ['browser-preview']

  return {
    sourceKind: 'sketchfab',
    label: 'Sketchfab licensed marketplace',
    state: licenseKind === 'unknown' ? 'held' : input.commercialTermsReviewed || cc0 ? 'needs-review' : 'human_review_required',
    defaultLicenseKind: licenseKind,
    allowedUseCases,
    requiredReceipts: [
      'license/provenance receipt',
      'source asset manifest',
      'checksum receipt',
      'attribution receipt',
      'commercial terms receipt',
      'human art-direction approval',
    ],
    prohibitedClaims: ['final asset', 'marketplace redistribution without explicit rights', 'production ready'],
    nextAction:
      licenseKind === 'unknown'
        ? 'Resolve the Sketchfab license before import.'
        : input.commercialTermsReviewed || cc0
          ? 'Attach attribution, checksum, quality ledger, and human review before install.'
          : 'Request commercial/legal review before public, client, or redistribution use.',
  }
}
