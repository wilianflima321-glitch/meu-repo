import { createHash } from 'node:crypto'

import {
  validateMarketplaceAssetLicense,
  type LicenseValidationDecision,
  type MarketplaceAssetLicense,
} from './license-validator'

export type AssetDeclaredOrigin = 'self-created' | 'purchased' | 'cc-licensed' | 'ai-generated' | 'derivative'
export type AssetReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged'

export type AssetProvenanceEntry = {
  assetId: string
  uploaderUserId: string
  uploadedAt: string
  fileName?: string
  sizeBytes?: number
  contentHash: string
  perceptualHash?: string
  declaredLicense: MarketplaceAssetLicense
  declaredOrigin: AssetDeclaredOrigin
  sourceUrl?: string
  licenseProof?: {
    url: string
    verifiedAt?: string
  }
  reviewedBy?: string
  reviewedAt?: string
  reviewStatus: AssetReviewStatus
  reviewNotes?: string
  parentAssetId?: string
  licenseDecision: LicenseValidationDecision
  blockers: string[]
}

export type AssetProvenanceInput = {
  assetId: string
  uploaderUserId: string
  uploadedAt?: Date | string
  fileName?: string
  sizeBytes?: number
  content?: Buffer | Uint8Array | string
  contentHash?: string
  perceptualHash?: string
  declaredLicense?: string | null
  declaredOrigin: AssetDeclaredOrigin
  sourceUrl?: string
  licenseProofUrl?: string
  parentAssetId?: string
}

export type AssetProvenanceReleaseDecision = {
  releaseReady: boolean
  blockers: string[]
  warnings: string[]
}

function hashContent(content: Buffer | Uint8Array | string): string {
  return createHash('sha256').update(content).digest('hex')
}

function normalizeHash(input: { content?: Buffer | Uint8Array | string; contentHash?: string }): string {
  if (input.content) return hashContent(input.content)
  const hash = input.contentHash?.trim().toLowerCase()
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new Error('Asset provenance requires a SHA-256 content hash or content bytes.')
  }
  return hash
}

export function createAssetProvenanceEntry(input: AssetProvenanceInput): AssetProvenanceEntry {
  const contentHash = normalizeHash(input)
  const uploadedAt = input.uploadedAt instanceof Date
    ? input.uploadedAt.toISOString()
    : input.uploadedAt ?? new Date().toISOString()
  const licenseDecision = validateMarketplaceAssetLicense({
    license: input.declaredLicense,
    proofUrl: input.licenseProofUrl,
    commercialUse: true,
    redistribution: true,
  })
  const blockers = [...licenseDecision.blockers]

  if (input.declaredOrigin !== 'self-created' && !input.sourceUrl) {
    blockers.push('Non-original marketplace assets require a source URL.')
  }

  if (input.declaredOrigin === 'derivative' && !input.parentAssetId) {
    blockers.push('Derivative assets require a parent asset reference.')
  }

  return {
    assetId: input.assetId,
    uploaderUserId: input.uploaderUserId,
    uploadedAt,
    fileName: input.fileName,
    sizeBytes: input.sizeBytes,
    contentHash,
    perceptualHash: input.perceptualHash,
    declaredLicense: licenseDecision.normalizedLicense,
    declaredOrigin: input.declaredOrigin,
    sourceUrl: input.sourceUrl,
    licenseProof: input.licenseProofUrl ? { url: input.licenseProofUrl } : undefined,
    reviewStatus: blockers.length > 0 ? 'rejected' : 'pending',
    parentAssetId: input.parentAssetId,
    licenseDecision,
    blockers,
  }
}

export function assertAssetProvenanceReleaseReady(entry: AssetProvenanceEntry): AssetProvenanceReleaseDecision {
  const blockers = [...entry.blockers]
  const warnings = [...entry.licenseDecision.warnings]

  if (entry.reviewStatus !== 'approved') {
    blockers.push(`Asset review status is ${entry.reviewStatus}; approval is required before publication.`)
  }

  if (!entry.contentHash || !/^[a-f0-9]{64}$/.test(entry.contentHash)) {
    blockers.push('Asset content hash is missing or invalid.')
  }

  if (!entry.licenseDecision.allowed) {
    blockers.push('Asset license decision is not allowed.')
  }

  return {
    releaseReady: blockers.length === 0,
    blockers,
    warnings,
  }
}

