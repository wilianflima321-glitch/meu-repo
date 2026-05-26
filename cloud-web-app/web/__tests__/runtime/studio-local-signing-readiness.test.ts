import { describe, expect, it } from 'vitest'

import { buildStudioLocalSigningReadiness } from '@/lib/studio-local/release-signing-readiness'

describe('Studio Local signing readiness', () => {
  it('holds public installer claims by default', () => {
    const readiness = buildStudioLocalSigningReadiness()

    expect(readiness.status).toBe('held')
    expect(readiness.publicInstallerEligible).toBe(false)
    expect(readiness.signedInstallerClaimAllowed).toBe(false)
    expect(readiness.blockers.join(' ')).toContain('Artifact Signing')
    expect(readiness.blockers.join(' ')).toContain('notarization')
    expect(readiness.blockers.join(' ')).toContain('updater')
  })

  it('allows public installer claims only when signing, updater and release evidence are present', () => {
    const readiness = buildStudioLocalSigningReadiness({
      windows: {
        artifactSigningAccountConfigured: true,
        identityValidated: true,
        signCommandConfigured: true,
        ciSecretsConfigured: true,
      },
      macos: {
        developerIdApplicationConfigured: true,
        ciCertificateImported: true,
        notarizationConfigured: true,
        stapleCheckConfigured: true,
      },
      linux: {
        appImageBuilt: true,
        debBuilt: true,
        sha256Published: true,
        provenanceAttestationPublished: true,
      },
      updater: {
        createUpdaterArtifactsEnabled: true,
        publicKeyConfigured: true,
        httpsEndpointConfigured: true,
        rollbackChannelDocumented: true,
      },
      release: {
        checksumsPublished: true,
        smokeInstallEvidence: true,
        malwareScanEvidence: true,
      },
    })

    expect(readiness.status).toBe('available')
    expect(readiness.publicInstallerEligible).toBe(true)
    expect(readiness.signedInstallerClaimAllowed).toBe(true)
    expect(readiness.blockers).toEqual([])
  })
})
