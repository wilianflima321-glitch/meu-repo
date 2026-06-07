export type V29SidecarInstallOs = 'windows' | 'macos' | 'linux'
export type V29SidecarInstallState = 'available' | 'template-only' | 'held' | 'blocked'
export type V29SidecarInstallChannel = 'stable' | 'beta' | 'nightly'

export const V29_SIDECAR_INSTALL_MANIFEST_SETTINGS_KEY = 'aethelV29SidecarInstallManifest'

export type V29SidecarInstallArtifact = {
  os: V29SidecarInstallOs
  state: V29SidecarInstallState
  templatePath: string
  packageName: string
  version: string
  artifactPatterns: string[]
  buildCommands: string[]
  checksumRef: string | null
  signatureRef: string | null
  smokeTestRef: string | null
  rollbackRef: string | null
  channel: V29SidecarInstallChannel
  evidenceRefs: string[]
  nextAction: string
}

export type V29SidecarInstallManifest = {
  version: 1
  capability: 'AETHEL_V29_SIDECAR_INSTALL_MANIFEST'
  generatedAt: string
  artifacts: V29SidecarInstallArtifact[]
  summary: {
    osTargets: number
    available: number
    templateOnly: number
    held: number
    checksumCoverage: number
    signatureCoverage: number
    smokeCoverage: number
    releaseReady: false
  }
  blockers: string[]
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export const V29_REQUIRED_INSTALL_OS_TARGETS: V29SidecarInstallOs[] = ['windows', 'macos', 'linux']

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function artifactBlockers(artifact: V29SidecarInstallArtifact): string[] {
  const blockers: string[] = []
  if (artifact.state === 'template-only') blockers.push(`${artifact.os}: install artifact is template-only`)
  if (artifact.state === 'held') blockers.push(`${artifact.os}: install artifact is held`)
  if (artifact.state === 'blocked') blockers.push(`${artifact.os}: install artifact is blocked`)
  if (!artifact.checksumRef) blockers.push(`${artifact.os}: checksum receipt is missing`)
  if (!artifact.signatureRef) blockers.push(`${artifact.os}: signature receipt is missing`)
  if (!artifact.smokeTestRef) blockers.push(`${artifact.os}: install smoke test receipt is missing`)
  if (!artifact.rollbackRef) blockers.push(`${artifact.os}: rollback receipt is missing`)
  return blockers
}

function artifactStructuralErrors(artifact: V29SidecarInstallArtifact): string[] {
  const failures: string[] = []
  if (!artifact.templatePath.trim()) failures.push(`${artifact.os}: template path is required`)
  if (!artifact.packageName.trim()) failures.push(`${artifact.os}: package name is required`)
  if (!artifact.version.trim()) failures.push(`${artifact.os}: version is required`)
  if (artifact.artifactPatterns.length === 0) failures.push(`${artifact.os}: artifact patterns are required`)
  if (artifact.buildCommands.length === 0) failures.push(`${artifact.os}: build commands are required`)
  if (artifact.evidenceRefs.length === 0) failures.push(`${artifact.os}: evidence refs are required`)
  if (!artifact.nextAction.trim()) failures.push(`${artifact.os}: next action is required`)
  return failures
}

export function buildV29SidecarInstallManifest(params: {
  generatedAt?: string
  artifacts: V29SidecarInstallArtifact[]
}): V29SidecarInstallManifest {
  const blockers = unique([
    ...params.artifacts.flatMap(artifactBlockers),
    'Human review is required before publishing desktop sidecar installers or update feeds.',
  ])

  return {
    version: 1,
    capability: 'AETHEL_V29_SIDECAR_INSTALL_MANIFEST',
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    artifacts: params.artifacts,
    summary: {
      osTargets: params.artifacts.length,
      available: params.artifacts.filter((artifact) => artifact.state === 'available').length,
      templateOnly: params.artifacts.filter((artifact) => artifact.state === 'template-only').length,
      held: params.artifacts.filter((artifact) => artifact.state === 'held').length,
      checksumCoverage: params.artifacts.filter((artifact) => Boolean(artifact.checksumRef)).length,
      signatureCoverage: params.artifacts.filter((artifact) => Boolean(artifact.signatureRef)).length,
      smokeCoverage: params.artifacts.filter((artifact) => Boolean(artifact.smokeTestRef)).length,
      releaseReady: false,
    },
    blockers,
    claimPolicy: {
      allowedClaims: [
        'desktop runtime templates measured',
        'sidecar installer path is governed',
        'public installer claims remain held',
      ],
      prohibitedClaims: [
        'signed installer',
        'public download ready',
        'desktop ready',
        'native renderer ready',
        'production ready',
        'releaseReady=true',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Publish checksums, signatures, install smoke tests, rollback receipts, and update feed evidence before public desktop release.'
        : 'Installer evidence is complete; request human release review before public claims.',
  }
}

export function validateV29SidecarInstallManifest(manifest: V29SidecarInstallManifest): string[] {
  const failures: string[] = []
  if (manifest.version !== 1) failures.push('invalid sidecar install manifest version')
  if (manifest.capability !== 'AETHEL_V29_SIDECAR_INSTALL_MANIFEST') failures.push('invalid sidecar install capability')
  if (manifest.summary.releaseReady !== false) failures.push('sidecar install manifest cannot set releaseReady=true')
  const present = new Set(manifest.artifacts.map((artifact) => artifact.os))
  for (const os of V29_REQUIRED_INSTALL_OS_TARGETS) {
    if (!present.has(os)) failures.push(`missing required install OS target: ${os}`)
  }
  if (!manifest.claimPolicy.prohibitedClaims.includes('signed installer')) failures.push('signed installer claim must be prohibited')
  if (!manifest.claimPolicy.prohibitedClaims.includes('public download ready')) {
    failures.push('public download ready claim must be prohibited')
  }
  if (!manifest.blockers.some((blocker) => blocker.includes('Human review is required'))) {
    failures.push('human review blocker is required')
  }
  for (const artifact of manifest.artifacts) failures.push(...artifactStructuralErrors(artifact))
  return unique(failures)
}

export function buildV29SidecarInstallArtifact(params: {
  os: V29SidecarInstallOs
  state?: V29SidecarInstallState
  templatePath: string
  packageName: string
  version: string
  artifactPatterns: string[]
  buildCommands: string[]
  checksumRef?: string | null
  signatureRef?: string | null
  smokeTestRef?: string | null
  rollbackRef?: string | null
  channel?: V29SidecarInstallChannel
  evidenceRefs: string[]
  nextAction?: string
}): V29SidecarInstallArtifact {
  return {
    os: params.os,
    state: params.state ?? 'template-only',
    templatePath: params.templatePath,
    packageName: params.packageName,
    version: params.version,
    artifactPatterns: params.artifactPatterns,
    buildCommands: params.buildCommands,
    checksumRef: params.checksumRef ?? null,
    signatureRef: params.signatureRef ?? null,
    smokeTestRef: params.smokeTestRef ?? null,
    rollbackRef: params.rollbackRef ?? null,
    channel: params.channel ?? 'beta',
    evidenceRefs: params.evidenceRefs,
    nextAction:
      params.nextAction ??
      'Convert template into signed installer evidence with checksum, smoke test, rollback, and update feed receipts.',
  }
}

export function readV29SidecarInstallManifestFromSettings(settings: unknown): V29SidecarInstallManifest | null {
  if (!isRecord(settings)) return null
  const candidate = settings[V29_SIDECAR_INSTALL_MANIFEST_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1 || candidate.capability !== 'AETHEL_V29_SIDECAR_INSTALL_MANIFEST') return null
  return candidate as unknown as V29SidecarInstallManifest
}

export function writeV29SidecarInstallManifestToSettings(
  settings: unknown,
  manifest: V29SidecarInstallManifest,
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [V29_SIDECAR_INSTALL_MANIFEST_SETTINGS_KEY]: manifest,
  }
}
