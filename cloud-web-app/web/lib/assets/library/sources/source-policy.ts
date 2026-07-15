import type { AssetLicenseKind, AssetUseCase } from '@/lib/assets/library/catalog/license-policy'
import type { AssetLibrarySourceKind } from '@/lib/assets/library/catalog/manifest'
import type { V29OperationalState } from '@aethel/runtime/v29-internal-spine'

export interface AssetSourceAdapterContract {
  sourceKind: AssetLibrarySourceKind
  label: string
  state: V29OperationalState
  defaultLicenseKind: AssetLicenseKind
  allowedUseCases: AssetUseCase[]
  requiredReceipts: string[]
  prohibitedClaims: string[]
  nextAction: string
}

export function sourceAllowsUseCase(source: AssetSourceAdapterContract, useCase: AssetUseCase): boolean {
  return source.allowedUseCases.includes(useCase)
}
