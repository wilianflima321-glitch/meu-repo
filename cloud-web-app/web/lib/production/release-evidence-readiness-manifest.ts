import { RELEASE_EVIDENCE_READINESS_CAPABILITY } from '@/lib/production/release-evidence-readiness.contracts'
import type {
  ReleaseEvidencePackageManifest,
  ReleaseEvidencePackageManifestInput,
  ReleaseEvidencePackageManifestVerification,
} from '@/lib/production/release-evidence-readiness.contracts'

export function buildReleaseEvidencePackageManifest(
  input: ReleaseEvidencePackageManifestInput,
): ReleaseEvidencePackageManifest {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const baseManifest = {
    version: 1 as const,
    packageId: `release-evidence:${input.projectId ?? 'project'}:${input.snapshot.updatedAt}`,
    capability: RELEASE_EVIDENCE_READINESS_CAPABILITY as typeof RELEASE_EVIDENCE_READINESS_CAPABILITY,
    generatedAt,
    generatedBy: input.generatedBy ?? 'Aethel Release Evidence Readiness',
    project: {
      id: input.projectId ?? null,
      name: input.projectName ?? null,
      domain: input.state.brain.domain,
      objective: input.state.brain.objective,
    },
    readiness: {
      status: input.snapshot.status,
      scorePercent: input.snapshot.scorePercent,
      coveredRequiredLanes: input.snapshot.coveredRequiredLanes,
      totalRequiredLanes: input.snapshot.totalRequiredLanes,
      releaseReady: false as const,
      humanApprovalRequired: true as const,
      manualPublishRequired: true as const,
    },
    claimPolicy: {
      allowedClaims: [
        'Evidence package generated',
        'Human review state recorded when present',
        'Manual publish remains required',
      ],
      prohibitedClaims: [
        'final',
        'AAA sozinho',
        'Unreal-grade',
        'Pixel Streaming available without configured runtime',
        'automatic public release',
      ],
    },
    lanes: input.snapshot.lanes.map((lane) => ({
      id: lane.id,
      status: lane.status,
      required: lane.required,
      evidenceCount: lane.evidenceRefs.length,
      missingEvidence: lane.missingEvidence,
      blockers: lane.blockers,
    })),
    evidenceRefs: input.snapshot.evidenceRefs,
    runtimePolicy: input.state.runtimePolicy,
    nextAction: input.snapshot.nextAction,
  }
  const integrityHash = `fnv1a:${fnv1a(canonicalStringify(baseManifest))}`

  return {
    ...baseManifest,
    integrityHash,
  }
}

export function verifyReleaseEvidencePackageManifest(
  manifest: ReleaseEvidencePackageManifest,
): ReleaseEvidencePackageManifestVerification {
  const expectedHash = manifest.integrityHash
  const { integrityHash: _integrityHash, ...withoutHash } = manifest
  const actualHash = `fnv1a:${fnv1a(canonicalStringify(withoutHash))}`
  const errors = unique([
    ...(actualHash === expectedHash ? [] : ['Manifest integrity hash does not match package contents.']),
    ...(manifest.capability === RELEASE_EVIDENCE_READINESS_CAPABILITY ? [] : ['Manifest capability is not release evidence readiness.']),
    ...(manifest.readiness.releaseReady === false ? [] : ['Manifest cannot claim releaseReady=true.']),
    ...(manifest.readiness.manualPublishRequired === true ? [] : ['Manifest must require a separate manual publish action.']),
    ...(manifest.claimPolicy.prohibitedClaims.includes('automatic public release') ? [] : ['Manifest claim policy must prohibit automatic public release.']),
  ], 40)

  return {
    valid: errors.length === 0,
    actualHash,
    expectedHash,
    errors,
    releaseReady: false,
    manualPublishRequired: true,
  }
}

function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
    .join(',')}}`
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}
