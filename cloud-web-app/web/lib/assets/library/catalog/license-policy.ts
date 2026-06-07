import type { V29OperationalState } from '@/lib/runtime/v29-internal-spine'

export type AssetLicenseKind =
  | 'cc0'
  | 'cc-by'
  | 'cc-by-sa'
  | 'commercial-license'
  | 'proprietary-owned'
  | 'unknown'
  | 'restricted'

export type AssetUseCase = 'browser-preview' | 'public-demo' | 'client-delivery' | 'marketplace-redistribution'

export interface AssetLicensePolicyInput {
  licenseKind: AssetLicenseKind
  useCase: AssetUseCase
  sourceUrl?: string | null
  licenseRef?: string | null
  checksum?: string | null
  attributionRef?: string | null
  commercialTermsRef?: string | null
  humanApproved?: boolean
  prohibitedByProvider?: boolean
}

export interface AssetLicensePolicyResult {
  state: V29OperationalState
  allowed: boolean
  blockers: string[]
  requiredReceipts: string[]
  missingReceipts: string[]
  nextAction: string
  redistributionAllowed: boolean
  humanReviewRequired: true
}

export const ASSET_LICENSE_REQUIRED_RECEIPTS = [
  'license/provenance receipt',
  'source asset manifest',
  'checksum receipt',
] as const

const REDISTRIBUTABLE_LICENSES: AssetLicenseKind[] = ['cc0', 'commercial-license', 'proprietary-owned']
const HUMAN_REVIEW_USE_CASES: AssetUseCase[] = ['public-demo', 'client-delivery', 'marketplace-redistribution']

function compact(values: Array<string | null | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value))
}

function requiredReceiptsForLicense(input: AssetLicensePolicyInput): string[] {
  return compact([
    ...ASSET_LICENSE_REQUIRED_RECEIPTS,
    input.licenseKind === 'cc-by' || input.licenseKind === 'cc-by-sa' ? 'attribution receipt' : null,
    input.licenseKind === 'commercial-license' ? 'commercial terms receipt' : null,
  ])
}

export function evaluateAssetLicensePolicy(input: AssetLicensePolicyInput): AssetLicensePolicyResult {
  const requiredReceipts = requiredReceiptsForLicense(input)
  const blockers = [
    ...(input.prohibitedByProvider ? ['Provider policy prohibits this use case.'] : []),
    ...(input.licenseKind === 'unknown' ? ['License is unknown; asset cannot be used in governed builds.'] : []),
    ...(input.licenseKind === 'restricted' ? ['License is restricted; asset cannot be installed or redistributed.'] : []),
    ...(input.useCase === 'marketplace-redistribution' && !REDISTRIBUTABLE_LICENSES.includes(input.licenseKind)
      ? ['Marketplace redistribution requires CC0, owned, or explicit commercial redistribution terms.']
      : []),
  ]
  const missingReceipts = compact([
    input.sourceUrl ? null : 'source asset manifest',
    input.licenseRef ? null : 'license/provenance receipt',
    input.checksum ? null : 'checksum receipt',
    input.licenseKind === 'cc-by' || input.licenseKind === 'cc-by-sa'
      ? input.attributionRef
        ? null
        : 'attribution receipt'
      : null,
    input.licenseKind === 'commercial-license'
      ? input.commercialTermsRef
        ? null
        : 'commercial terms receipt'
      : null,
  ])
  const needsHumanReview = HUMAN_REVIEW_USE_CASES.includes(input.useCase) && input.humanApproved !== true
  const state: V29OperationalState =
    blockers.length > 0
      ? 'blocked'
      : missingReceipts.length > 0
        ? 'held'
        : needsHumanReview
          ? 'human_review_required'
          : 'available'

  return {
    state,
    allowed: state === 'available',
    blockers,
    requiredReceipts,
    missingReceipts,
    nextAction:
      blockers.length > 0
        ? 'Choose a different source or attach a legal override before import.'
        : missingReceipts.length > 0
          ? 'Attach license, provenance, source, checksum, and attribution receipts before import.'
          : needsHumanReview
            ? 'Request human license review before public, client, or marketplace use.'
            : 'License receipts are complete for this use case.',
    redistributionAllowed: REDISTRIBUTABLE_LICENSES.includes(input.licenseKind) && input.licenseKind !== 'unknown',
    humanReviewRequired: true,
  }
}
