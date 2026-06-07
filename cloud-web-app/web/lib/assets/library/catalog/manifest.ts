import {
  evaluateAssetLicensePolicy,
  type AssetLicenseKind,
  type AssetLicensePolicyResult,
  type AssetUseCase,
} from '@/lib/assets/library/catalog/license-policy'
import type { V29OperationalState } from '@/lib/runtime/v29-internal-spine'

export type AssetLibrarySourceKind = 'polyhaven' | 'sketchfab' | 'ambientcg' | 'freesound' | 'first-party' | 'ai-generated'
export type AssetLibraryAssetKind = 'model' | 'material' | 'hdri' | 'audio' | 'texture' | 'kitbash-pack'

export interface AssetQualityChecklist {
  provenanceRef?: string | null
  licenseRef?: string | null
  sourceManifestRef?: string | null
  checksum?: string | null
  pbrMaps?: {
    baseColor?: boolean
    normal?: boolean
    roughness?: boolean
    metallicOrSpecular?: boolean
  }
  pbrCompressionReportRef?: string | null
  lodManifestRef?: string | null
  lodLevels?: Array<'LOD0' | 'LOD1' | 'LOD2' | 'LOD3'>
  collisionProxyRef?: string | null
  navmeshProxyRef?: string | null
  performanceTraceRef?: string | null
  humanReviewRef?: string | null
}

export interface AssetLibraryCatalogEntryInput {
  id: string
  title: string
  assetKind: AssetLibraryAssetKind
  sourceKind: AssetLibrarySourceKind
  sourceUrl?: string | null
  author?: string | null
  thumbnailUrl?: string | null
  licenseKind: AssetLicenseKind
  useCase: AssetUseCase
  attributionRef?: string | null
  commercialTermsRef?: string | null
  qualityChecklist: AssetQualityChecklist
  humanApproved?: boolean
  tags?: string[]
}

export interface AssetLibraryCatalogEntry extends AssetLibraryCatalogEntryInput {
  version: 1
  state: V29OperationalState
  installAllowed: boolean
  finalClaimAllowed: false
  requiredEvidence: string[]
  missingEvidence: string[]
  blockers: string[]
  licensePolicy: AssetLicensePolicyResult
  cachePolicy: 'metadata-only-until-approved' | 'cache-source-after-license-review'
  nextAction: string
  humanReviewRequired: true
}

export const ASSET_LIBRARY_REQUIRED_EVIDENCE = [
  'license/provenance receipt',
  'source asset manifest',
  'checksum receipt',
  'PBR texture compression report',
  'LOD0/LOD1/LOD2/LOD3 manifest',
  'collision/navmesh proxy report',
  'viewport performance trace',
  'human art-direction approval',
] as const

function compact(values: Array<string | null | undefined | false>): string[] {
  return values.filter((value): value is string => Boolean(value))
}

function hasAllLodLevels(levels?: AssetQualityChecklist['lodLevels']): boolean {
  const set = new Set(levels ?? [])
  return ['LOD0', 'LOD1', 'LOD2', 'LOD3'].every((level) => set.has(level as 'LOD0' | 'LOD1' | 'LOD2' | 'LOD3'))
}

function hasCompletePbrMaps(checklist: AssetQualityChecklist): boolean {
  const maps = checklist.pbrMaps
  return Boolean(maps?.baseColor && maps.normal && maps.roughness && maps.metallicOrSpecular)
}

export function evaluateAssetLibraryCatalogEntry(
  input: AssetLibraryCatalogEntryInput,
): Pick<
  AssetLibraryCatalogEntry,
  'state' | 'installAllowed' | 'requiredEvidence' | 'missingEvidence' | 'blockers' | 'licensePolicy' | 'cachePolicy' | 'nextAction'
> {
  const licensePolicy = evaluateAssetLicensePolicy({
    licenseKind: input.licenseKind,
    useCase: input.useCase,
    sourceUrl: input.sourceUrl,
    licenseRef: input.qualityChecklist.licenseRef,
    checksum: input.qualityChecklist.checksum,
    attributionRef: input.attributionRef,
    commercialTermsRef: input.commercialTermsRef,
    humanApproved: input.humanApproved,
    prohibitedByProvider: input.sourceKind === 'ai-generated' && input.useCase !== 'browser-preview',
  })
  const missingEvidence = compact([
    input.qualityChecklist.provenanceRef ? null : 'license/provenance receipt',
    input.qualityChecklist.sourceManifestRef ? null : 'source asset manifest',
    input.qualityChecklist.checksum ? null : 'checksum receipt',
    hasCompletePbrMaps(input.qualityChecklist) && input.qualityChecklist.pbrCompressionReportRef
      ? null
      : 'PBR texture compression report',
    hasAllLodLevels(input.qualityChecklist.lodLevels) && input.qualityChecklist.lodManifestRef
      ? null
      : 'LOD0/LOD1/LOD2/LOD3 manifest',
    input.qualityChecklist.collisionProxyRef && input.qualityChecklist.navmeshProxyRef
      ? null
      : 'collision/navmesh proxy report',
    input.qualityChecklist.performanceTraceRef ? null : 'viewport performance trace',
    input.qualityChecklist.humanReviewRef && input.humanApproved ? null : 'human art-direction approval',
  ])
  const blockers = [
    ...licensePolicy.blockers,
    ...(input.sourceKind === 'ai-generated' && input.useCase !== 'browser-preview'
      ? ['AI-generated assets remain draft-only until replaced or upgraded through curated/Studio Local lanes.']
      : []),
  ]
  const state: V29OperationalState =
    blockers.length > 0
      ? 'blocked'
      : licensePolicy.state === 'held' || missingEvidence.length > 0
        ? 'held'
        : licensePolicy.state === 'human_review_required'
          ? 'human_review_required'
          : 'available'

  return {
    state,
    installAllowed: state === 'available',
    requiredEvidence: [...ASSET_LIBRARY_REQUIRED_EVIDENCE],
    missingEvidence,
    blockers,
    licensePolicy,
    cachePolicy: state === 'available' ? 'cache-source-after-license-review' : 'metadata-only-until-approved',
    nextAction:
      state === 'available'
        ? 'Asset can be installed into a governed preview lane; final/public claims remain blocked until release review.'
        : blockers.length > 0
          ? 'Choose a compliant source or resolve provider/license blockers before install.'
          : 'Attach quality, provenance, LOD/PBR/collision/performance, and human review receipts before install.',
  }
}

export function buildAssetLibraryCatalogEntry(input: AssetLibraryCatalogEntryInput): AssetLibraryCatalogEntry {
  const evaluation = evaluateAssetLibraryCatalogEntry(input)
  return {
    ...input,
    version: 1,
    finalClaimAllowed: false,
    humanReviewRequired: true,
    ...evaluation,
  }
}
