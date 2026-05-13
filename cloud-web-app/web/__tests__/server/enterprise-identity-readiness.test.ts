import { describe, expect, it } from 'vitest'

import { buildEnterpriseIdentityReadiness } from '@/lib/security/enterprise-identity-readiness'
import type { SamlReadiness } from '@/lib/security/saml'

function samlReadiness(configured: boolean): SamlReadiness {
  return {
    configured,
    spEntityId: 'https://studio.aethel.dev/api/auth/saml/metadata',
    acsUrl: 'https://studio.aethel.dev/api/auth/saml/acs',
    metadataUrl: 'https://studio.aethel.dev/api/auth/saml/metadata',
    idpEntityId: configured ? 'https://idp.example.com' : undefined,
    ssoUrl: configured ? 'https://idp.example.com/sso' : undefined,
    certificateConfigured: configured,
    requestSigningConfigured: configured,
    loginUrl: 'https://studio.aethel.dev/api/auth/saml/login',
  }
}

describe('enterprise identity readiness', () => {
  it('keeps SAML and SCIM as readiness/admin-assisted until self-serve GA evidence exists', () => {
    const report = buildEnterpriseIdentityReadiness({
      saml: samlReadiness(true),
      scimConfigured: true,
      selfServeOrgConfig: false,
      signedAuditProof: false,
      automatedCertificateRotation: false,
      generatedAt: '2026-05-13T00:00:00.000Z',
    })

    expect(report.overallStage).toBe('admin-assisted')
    expect(report.safePublicClaims.join(' ')).toContain('readiness/admin-assisted')
    expect(report.forbiddenClaims.join(' ')).toContain('SCIM GA')
    expect(report.protocols.find((protocol) => protocol.protocol === 'saml')?.gaBlockers).toContain(
      'Ship per-organization self-serve IdP configuration UI before claiming self-serve GA.',
    )
    expect(report.nextAction).toContain('Keep public copy cautious')
  })

  it('allows self-serve GA only when protocol configuration, signed audit proof, and rotation evidence are present', () => {
    const report = buildEnterpriseIdentityReadiness({
      saml: samlReadiness(true),
      scimConfigured: true,
      selfServeOrgConfig: true,
      signedAuditProof: true,
      automatedCertificateRotation: true,
      generatedAt: '2026-05-13T00:00:00.000Z',
    })

    expect(report.overallStage).toBe('self-serve-ga')
    expect(report.protocols.every((protocol) => protocol.gaBlockers.length === 0)).toBe(true)
    expect(report.nextAction).toContain('self-serve GA')
  })

  it('does not mark unconfigured protocols as GA even when product shell exists', () => {
    const report = buildEnterpriseIdentityReadiness({
      saml: samlReadiness(false),
      scimConfigured: false,
      selfServeOrgConfig: true,
      signedAuditProof: true,
      automatedCertificateRotation: true,
    })

    expect(report.overallStage).toBe('readiness')
    expect(report.protocols.find((protocol) => protocol.protocol === 'scim')?.gaBlockers[0]).toContain('SCIM bearer token')
    expect(report.protocols.find((protocol) => protocol.protocol === 'saml')?.safeClaim).toContain('admin-assisted')
  })
})
