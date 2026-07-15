import type { AssetUseCase } from '@/lib/assets/library/catalog/license-policy'
import type { AssetSourceAdapterContract } from '@/lib/assets/library/sources/source-policy'

export function buildPolyHavenSourceAdapter(input: { enabled?: boolean } = {}): AssetSourceAdapterContract {
  const enabled = input.enabled !== false
  return {
    sourceKind: 'polyhaven',
    label: 'Poly Haven CC0 library',
    state: enabled ? 'needs-review' : 'held',
    defaultLicenseKind: 'cc0',
    allowedUseCases: ['browser-preview', 'public-demo', 'client-delivery', 'marketplace-redistribution'] satisfies AssetUseCase[],
    requiredReceipts: [
      'license/provenance receipt',
      'source asset manifest',
      'checksum receipt',
      'PBR texture compression report',
      'human art-direction approval',
    ],
    prohibitedClaims: ['final asset', 'Unreal-grade', 'production ready'],
    nextAction: enabled
      ? 'Import metadata first, then attach source checksum, quality ledger, and human review before install.'
      : 'Enable Poly Haven sourcing policy before agents can search this source.',
  }
}
