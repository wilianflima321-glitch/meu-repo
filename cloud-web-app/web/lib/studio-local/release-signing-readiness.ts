export type StudioLocalSigningStatus = 'available' | 'beta' | 'held' | 'planned'

export type StudioLocalSigningEvidenceInput = {
  windows?: {
    artifactSigningAccountConfigured?: boolean
    identityValidated?: boolean
    signCommandConfigured?: boolean
    ciSecretsConfigured?: boolean
  }
  macos?: {
    developerIdApplicationConfigured?: boolean
    ciCertificateImported?: boolean
    notarizationConfigured?: boolean
    stapleCheckConfigured?: boolean
  }
  linux?: {
    appImageBuilt?: boolean
    debBuilt?: boolean
    sha256Published?: boolean
    provenanceAttestationPublished?: boolean
  }
  updater?: {
    createUpdaterArtifactsEnabled?: boolean
    publicKeyConfigured?: boolean
    httpsEndpointConfigured?: boolean
    rollbackChannelDocumented?: boolean
  }
  release?: {
    checksumsPublished?: boolean
    smokeInstallEvidence?: boolean
    malwareScanEvidence?: boolean
  }
}

export type StudioLocalSigningLane = {
  id: 'windows-artifact-signing' | 'macos-notarization' | 'linux-provenance' | 'tauri-updater' | 'release-attestation'
  label: string
  status: StudioLocalSigningStatus
  requiredEvidence: string[]
  blockers: string[]
  nextAction: string
}

export type StudioLocalSigningReadiness = {
  schemaVersion: 1
  capability: 'aethel.studio-local.signing.readiness'
  status: StudioLocalSigningStatus
  publicInstallerEligible: boolean
  signedInstallerClaimAllowed: boolean
  lanes: StudioLocalSigningLane[]
  blockers: string[]
  requiredEvidence: string[]
  nextAction: string
}

const REQUIRED_SIGNING_EVIDENCE = [
  'Windows Azure Artifact Signing or EV/OV signing evidence',
  'macOS Developer ID Application certificate',
  'macOS notarization and staple evidence',
  'Linux SHA256 checksums and provenance attestation',
  'Tauri updater artifacts, public key, HTTPS endpoint, and rollback channel',
  'Smoke install evidence for Windows, macOS, and Linux',
  'Malware scan or release trust evidence',
]

function laneStatus(blockers: string[], betaWhenClear = false): StudioLocalSigningStatus {
  if (blockers.length > 0) return 'held'
  return betaWhenClear ? 'beta' : 'available'
}

function createLane(
  id: StudioLocalSigningLane['id'],
  label: string,
  requiredEvidence: string[],
  blockers: string[],
  nextAction: string,
  betaWhenClear = false,
): StudioLocalSigningLane {
  return {
    id,
    label,
    status: laneStatus(blockers, betaWhenClear),
    requiredEvidence,
    blockers,
    nextAction,
  }
}

export function buildStudioLocalSigningReadiness(
  input: StudioLocalSigningEvidenceInput = {},
): StudioLocalSigningReadiness {
  const windowsBlockers = [
    input.windows?.artifactSigningAccountConfigured ? null : 'Windows Artifact Signing or EV/OV signing account is not configured.',
    input.windows?.identityValidated ? null : 'Windows signing identity validation evidence is missing.',
    input.windows?.signCommandConfigured ? null : 'Tauri Windows signCommand evidence is missing.',
    input.windows?.ciSecretsConfigured ? null : 'Windows signing CI secrets evidence is missing.',
  ].filter(Boolean) as string[]

  const macosBlockers = [
    input.macos?.developerIdApplicationConfigured ? null : 'macOS Developer ID Application certificate evidence is missing.',
    input.macos?.ciCertificateImported ? null : 'macOS CI certificate import evidence is missing.',
    input.macos?.notarizationConfigured ? null : 'macOS notarization workflow evidence is missing.',
    input.macos?.stapleCheckConfigured ? null : 'macOS staple validation evidence is missing.',
  ].filter(Boolean) as string[]

  const linuxBlockers = [
    input.linux?.appImageBuilt ? null : 'Linux AppImage release artifact evidence is missing.',
    input.linux?.debBuilt ? null : 'Linux deb release artifact evidence is missing.',
    input.linux?.sha256Published ? null : 'Linux SHA256 checksum publication evidence is missing.',
    input.linux?.provenanceAttestationPublished ? null : 'Linux provenance attestation evidence is missing.',
  ].filter(Boolean) as string[]

  const updaterBlockers = [
    input.updater?.createUpdaterArtifactsEnabled ? null : 'Tauri createUpdaterArtifacts evidence is missing.',
    input.updater?.publicKeyConfigured ? null : 'Tauri updater public key evidence is missing.',
    input.updater?.httpsEndpointConfigured ? null : 'Tauri updater HTTPS endpoint evidence is missing.',
    input.updater?.rollbackChannelDocumented ? null : 'Updater rollback channel evidence is missing.',
  ].filter(Boolean) as string[]

  const releaseBlockers = [
    input.release?.checksumsPublished ? null : 'Cross-platform checksum manifest evidence is missing.',
    input.release?.smokeInstallEvidence ? null : 'Smoke install evidence for all public installers is missing.',
    input.release?.malwareScanEvidence ? null : 'Release malware scan or trust evidence is missing.',
  ].filter(Boolean) as string[]

  const lanes: StudioLocalSigningLane[] = [
    createLane(
      'windows-artifact-signing',
      'Windows Artifact Signing',
      ['Artifact Signing account', 'identity validation', 'Tauri signCommand', 'CI secrets'],
      windowsBlockers,
      'Configure Azure Artifact Signing or an equivalent EV/OV signing path and attach CI artifact evidence.',
    ),
    createLane(
      'macos-notarization',
      'macOS Developer ID + notarization',
      ['Developer ID Application certificate', 'CI certificate import', 'notarization', 'staple check'],
      macosBlockers,
      'Add Developer ID signing, notarization, stapling, and verification evidence before public DMG release.',
    ),
    createLane(
      'linux-provenance',
      'Linux packages + provenance',
      ['AppImage', 'deb', 'SHA256 checksums', 'provenance attestation'],
      linuxBlockers,
      'Publish package artifacts with checksums and provenance before presenting Linux as release-ready.',
      true,
    ),
    createLane(
      'tauri-updater',
      'Tauri updater',
      ['createUpdaterArtifacts', 'pubkey', 'HTTPS endpoint', 'rollback channel'],
      updaterBlockers,
      'Enable signed updater artifacts, HTTPS feed, public key, and rollback policy before auto-update claims.',
    ),
    createLane(
      'release-attestation',
      'Release attestation',
      ['checksum manifest', 'smoke install evidence', 'malware scan evidence'],
      releaseBlockers,
      'Attach install smoke tests, checksums, and release trust evidence before a public installer CTA.',
    ),
  ]

  const blockers = lanes.flatMap((lane) => lane.blockers)
  const publicInstallerEligible = blockers.length === 0

  return {
    schemaVersion: 1,
    capability: 'aethel.studio-local.signing.readiness',
    status: publicInstallerEligible ? 'available' : 'held',
    publicInstallerEligible,
    signedInstallerClaimAllowed: publicInstallerEligible,
    lanes,
    blockers,
    requiredEvidence: REQUIRED_SIGNING_EVIDENCE,
    nextAction: publicInstallerEligible
      ? 'Public installer CTA is allowed; keep checksums, updater signatures, and rollback evidence attached to each release.'
      : 'Keep Studio Local in request-beta mode until signing, notarization, updater, checksum, and install evidence are attached.',
  }
}
