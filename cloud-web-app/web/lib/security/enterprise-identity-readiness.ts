import { getSamlReadiness, type SamlReadiness } from '@/lib/security/saml'
import { isScimConfigured } from '@/lib/security/scim'

export type EnterpriseIdentityProtocol = 'saml' | 'scim'
export type EnterpriseIdentityStage = 'not-configured' | 'readiness' | 'admin-assisted' | 'self-serve-ga'

export interface EnterpriseIdentityProtocolReadiness {
  protocol: EnterpriseIdentityProtocol
  configured: boolean
  stage: EnterpriseIdentityStage
  safeClaim: string
  requiredEvidence: string[]
  gaBlockers: string[]
}

export interface EnterpriseIdentityReadinessReport {
  version: 1
  generatedAt: string
  overallStage: EnterpriseIdentityStage
  supportedProtocols: EnterpriseIdentityProtocol[]
  protocols: EnterpriseIdentityProtocolReadiness[]
  safePublicClaims: string[]
  forbiddenClaims: string[]
  nextAction: string
}

export interface EnterpriseIdentityReadinessInput {
  saml?: SamlReadiness
  scimConfigured?: boolean
  selfServeOrgConfig?: boolean
  signedAuditProof?: boolean
  automatedCertificateRotation?: boolean
  generatedAt?: string
}

function stageRank(stage: EnterpriseIdentityStage): number {
  return {
    'not-configured': 0,
    readiness: 1,
    'admin-assisted': 2,
    'self-serve-ga': 3,
  }[stage]
}

function chooseSamlStage(input: {
  saml: SamlReadiness
  selfServeOrgConfig: boolean
  signedAuditProof: boolean
  automatedCertificateRotation: boolean
}): EnterpriseIdentityStage {
  if (!input.saml.configured) return 'readiness'
  if (input.selfServeOrgConfig && input.signedAuditProof && input.automatedCertificateRotation) return 'self-serve-ga'
  return 'admin-assisted'
}

function chooseScimStage(input: {
  scimConfigured: boolean
  selfServeOrgConfig: boolean
  signedAuditProof: boolean
}): EnterpriseIdentityStage {
  if (!input.scimConfigured) return 'readiness'
  if (input.selfServeOrgConfig && input.signedAuditProof) return 'self-serve-ga'
  return 'admin-assisted'
}

function samlBlockers(input: {
  saml: SamlReadiness
  selfServeOrgConfig: boolean
  signedAuditProof: boolean
  automatedCertificateRotation: boolean
}) {
  const blockers: string[] = []
  if (!input.saml.configured) blockers.push('Configure IdP entity ID, SSO URL, and signing certificate before enabling SAML login.')
  if (!input.saml.requestSigningConfigured) blockers.push('Enable signed AuthnRequests before enterprise GA.')
  if (!input.selfServeOrgConfig) blockers.push('Ship per-organization self-serve IdP configuration UI before claiming self-serve GA.')
  if (!input.signedAuditProof) blockers.push('Attach signed audit proof for metadata changes, ACS attempts, and failed assertions.')
  if (!input.automatedCertificateRotation) blockers.push('Add automated certificate rotation and expiry alerts.')
  return blockers
}

function scimBlockers(input: {
  scimConfigured: boolean
  selfServeOrgConfig: boolean
  signedAuditProof: boolean
}) {
  const blockers: string[] = []
  if (!input.scimConfigured) blockers.push('Configure a scoped SCIM bearer token before enabling provisioning.')
  if (!input.selfServeOrgConfig) blockers.push('Ship per-organization SCIM token management and rotation UI before claiming self-serve GA.')
  if (!input.signedAuditProof) blockers.push('Attach signed audit proof for SCIM create, update, suspend, and delete operations.')
  return blockers
}

export function buildEnterpriseIdentityReadiness(input: EnterpriseIdentityReadinessInput = {}): EnterpriseIdentityReadinessReport {
  const saml = input.saml ?? getSamlReadiness()
  const scimConfigured = input.scimConfigured ?? isScimConfigured()
  const selfServeOrgConfig = input.selfServeOrgConfig ?? process.env.AETHEL_ENTERPRISE_IDENTITY_SELF_SERVE === 'true'
  const signedAuditProof = input.signedAuditProof ?? process.env.AETHEL_ENTERPRISE_IDENTITY_SIGNED_AUDIT === 'true'
  const automatedCertificateRotation =
    input.automatedCertificateRotation ?? process.env.AETHEL_SAML_AUTOMATED_CERT_ROTATION === 'true'

  const samlStage = chooseSamlStage({ saml, selfServeOrgConfig, signedAuditProof, automatedCertificateRotation })
  const scimStage = chooseScimStage({ scimConfigured, selfServeOrgConfig, signedAuditProof })

  const protocols: EnterpriseIdentityProtocolReadiness[] = [
    {
      protocol: 'saml',
      configured: saml.configured,
      stage: samlStage,
      safeClaim:
        samlStage === 'self-serve-ga'
          ? 'SAML is self-serve GA for configured enterprise organizations.'
          : 'SAML is enterprise-ready as a readiness/admin-assisted flow until every GA blocker is closed.',
      requiredEvidence: [
        'SP metadata URL',
        'IdP metadata or entity ID',
        'ACS validation result',
        'request signing state',
        'signed audit proof',
      ],
      gaBlockers: samlBlockers({ saml, selfServeOrgConfig, signedAuditProof, automatedCertificateRotation }),
    },
    {
      protocol: 'scim',
      configured: scimConfigured,
      stage: scimStage,
      safeClaim:
        scimStage === 'self-serve-ga'
          ? 'SCIM is self-serve GA for configured enterprise organizations.'
          : 'SCIM is a supported provisioning contract with admin-assisted rollout until token rotation and audit proof are self-serve.',
      requiredEvidence: [
        'ServiceProviderConfig response',
        'Users collection response',
        'user lifecycle audit event',
        'token rotation proof',
        'signed audit proof',
      ],
      gaBlockers: scimBlockers({ scimConfigured, selfServeOrgConfig, signedAuditProof }),
    },
  ]

  const overallStage = protocols.reduce<EnterpriseIdentityStage>((current, protocol) =>
    stageRank(protocol.stage) < stageRank(current) ? protocol.stage : current
  , 'self-serve-ga')
  const blockerCount = protocols.reduce((sum, protocol) => sum + protocol.gaBlockers.length, 0)

  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    overallStage,
    supportedProtocols: ['saml', 'scim'],
    protocols,
    safePublicClaims: [
      'SAML metadata, login redirect, ACS fail-safe, and SCIM lifecycle contracts are implemented.',
      'Enterprise identity must be described as readiness/admin-assisted unless self-serve org config, signed audit proof, and rotation evidence are present.',
      'Aethel must not claim SAML/SCIM self-serve GA while any gaBlockers remain.',
    ],
    forbiddenClaims: [
      'Do not claim zero-touch enterprise SSO for all organizations without org-scoped configuration evidence.',
      'Do not claim SCIM GA without token rotation, signed audit proof, and lifecycle evidence.',
      'Do not claim SAML assertion validation is complete if ACS is still fail-safe only.',
    ],
    nextAction:
      blockerCount === 0
        ? 'Enterprise identity can be marketed as self-serve GA for configured organizations.'
        : 'Keep public copy cautious; close GA blockers before claiming self-serve enterprise identity.',
  }
}
