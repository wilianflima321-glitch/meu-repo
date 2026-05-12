import { createSign } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'

export type SamlReadiness = {
  configured: boolean
  spEntityId: string
  acsUrl: string
  metadataUrl: string
  idpEntityId?: string
  ssoUrl?: string
  certificateConfigured: boolean
  requestSigningConfigured: boolean
  loginUrl: string
}

export type SamlAuthnRequestInput = {
  requestId?: string
  issuedAt?: Date
  relayState?: string | null
}

const NAME_ID_FORMAT = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
const SAML_PROTOCOL = 'urn:oasis:names:tc:SAML:2.0:protocol'
const SAML_ASSERTION = 'urn:oasis:names:tc:SAML:2.0:assertion'
const SAML_POST_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
const SAML_REDIRECT_BINDING = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
const RSA_SHA256_SIG_ALG = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'

export function getSamlReadiness(): SamlReadiness {
  const appUrl = getAppUrl()
  const metadataUrl = `${appUrl}/api/auth/saml/metadata`
  const acsUrl = process.env.SAML_ACS_URL || process.env.AETHEL_SAML_ACS_URL || `${appUrl}/api/auth/saml/acs`
  const spEntityId = process.env.SAML_SP_ENTITY_ID || process.env.AETHEL_SAML_SP_ENTITY_ID || metadataUrl
  const idpEntityId = process.env.SAML_IDP_ENTITY_ID || process.env.SAML_ENTITY_ID || undefined
  const ssoUrl = process.env.SAML_SSO_URL || undefined
  const certificateConfigured = Boolean(process.env.SAML_CERTIFICATE)
  const requestSigningConfigured = Boolean(process.env.SAML_REQUEST_SIGNING_PRIVATE_KEY)

  return {
    configured: Boolean(idpEntityId && ssoUrl && certificateConfigured),
    spEntityId,
    acsUrl,
    metadataUrl,
    idpEntityId,
    ssoUrl,
    certificateConfigured,
    requestSigningConfigured,
    loginUrl: `${appUrl}/api/auth/saml/login`,
  }
}

export function buildSamlMetadata(readiness: SamlReadiness = getSamlReadiness()): string {
  const signingCertificate = normalizeCertificate(process.env.SAML_SP_CERTIFICATE)
  const keyDescriptor = signingCertificate
    ? `
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${xmlEscape(signingCertificate)}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${xmlEscape(readiness.spEntityId)}">
  <md:SPSSODescriptor AuthnRequestsSigned="${readiness.requestSigningConfigured ? 'true' : 'false'}" WantAssertionsSigned="true" protocolSupportEnumeration="${SAML_PROTOCOL}">
    ${keyDescriptor}
    <md:NameIDFormat>${NAME_ID_FORMAT}</md:NameIDFormat>
    <md:AssertionConsumerService Binding="${SAML_POST_BINDING}" Location="${xmlEscape(readiness.acsUrl)}" index="0" isDefault="true" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>`
}

export function buildSamlAuthnRequest(input: SamlAuthnRequestInput = {}, readiness: SamlReadiness = getSamlReadiness()): string {
  const id = input.requestId || `_${cryptoRandomId()}`
  const issuedAt = (input.issuedAt || new Date()).toISOString()

  return `<samlp:AuthnRequest xmlns:samlp="${SAML_PROTOCOL}" xmlns:saml="${SAML_ASSERTION}" ID="${xmlEscape(id)}" Version="2.0" IssueInstant="${issuedAt}" Destination="${xmlEscape(readiness.ssoUrl || '')}" AssertionConsumerServiceURL="${xmlEscape(readiness.acsUrl)}" ProtocolBinding="${SAML_POST_BINDING}">
  <saml:Issuer>${xmlEscape(readiness.spEntityId)}</saml:Issuer>
  <samlp:NameIDPolicy Format="${NAME_ID_FORMAT}" AllowCreate="true" />
</samlp:AuthnRequest>`
}

export function buildSamlLoginRedirectUrl(input: SamlAuthnRequestInput = {}) {
  const readiness = getSamlReadiness()
  if (!readiness.configured || !readiness.ssoUrl) {
    return {
      ok: false as const,
      status: 503,
      error: 'SAML_NOT_CONFIGURED',
      readiness,
    }
  }

  const requestXml = buildSamlAuthnRequest(input, readiness)
  const params = new URLSearchParams()
  params.set('SAMLRequest', deflateRawSync(Buffer.from(requestXml, 'utf8')).toString('base64'))

  const relayState = coerceSafeRelayState(input.relayState)
  if (relayState) params.set('RelayState', relayState)

  const signingKey = process.env.SAML_REQUEST_SIGNING_PRIVATE_KEY
  if (signingKey) {
    params.set('SigAlg', RSA_SHA256_SIG_ALG)
    const unsignedQuery = params.toString()
    const signer = createSign('RSA-SHA256')
    signer.update(unsignedQuery)
    signer.end()
    params.set('Signature', signer.sign(signingKey, 'base64'))
  }

  const redirectUrl = new URL(readiness.ssoUrl)
  redirectUrl.search = params.toString()

  return {
    ok: true as const,
    url: redirectUrl.toString(),
    readiness,
  }
}

export function coerceSafeRelayState(input: string | null | undefined): string | undefined {
  const value = input?.trim()
  if (!value) return undefined
  if (value.length > 512) return undefined
  if (!value.startsWith('/') || value.startsWith('//')) return undefined
  if (value.includes('\\')) return undefined
  return value
}

function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

function normalizeCertificate(certificate: string | undefined): string | null {
  if (!certificate) return null
  const normalized = certificate
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '')
    .trim()
  return normalized.length > 0 ? normalized : null
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function cryptoRandomId(): string {
  const bytes = new Uint8Array(16)
  const cryptoLike = globalThis.crypto
  if (cryptoLike?.getRandomValues) {
    cryptoLike.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
