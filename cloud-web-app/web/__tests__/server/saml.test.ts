import { inflateRawSync } from 'node:zlib'

import { afterEach, describe, expect, it } from 'vitest'

import {
  buildSamlLoginRedirectUrl,
  buildSamlMetadata,
  coerceSafeRelayState,
  getSamlReadiness,
} from '@/lib/security/saml'

const ENV_KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'APP_URL',
  'SAML_ENTITY_ID',
  'SAML_IDP_ENTITY_ID',
  'SAML_SSO_URL',
  'SAML_CERTIFICATE',
  'SAML_SP_ENTITY_ID',
  'AETHEL_SAML_SP_ENTITY_ID',
  'SAML_ACS_URL',
  'AETHEL_SAML_ACS_URL',
  'SAML_SP_CERTIFICATE',
  'SAML_REQUEST_SIGNING_PRIVATE_KEY',
] as const

const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = ORIGINAL_ENV[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function configureSaml() {
  process.env.NEXT_PUBLIC_APP_URL = 'https://studio.aethel.dev'
  process.env.SAML_ENTITY_ID = 'https://idp.example.com/saml'
  process.env.SAML_SSO_URL = 'https://idp.example.com/sso'
  process.env.SAML_CERTIFICATE = '-----BEGIN CERTIFICATE-----\nabc123\n-----END CERTIFICATE-----'
}

describe('saml enterprise helpers', () => {
  afterEach(restoreEnv)

  it('stays explicitly not configured until IdP entity, SSO URL, and certificate exist', () => {
    restoreEnv()
    delete process.env.SAML_ENTITY_ID
    delete process.env.SAML_SSO_URL
    delete process.env.SAML_CERTIFICATE

    const readiness = getSamlReadiness()

    expect(readiness.configured).toBe(false)
    expect(readiness.metadataUrl).toBe('http://localhost:3000/api/auth/saml/metadata')
    expect(readiness.loginUrl).toBe('http://localhost:3000/api/auth/saml/login')
  })

  it('generates SP metadata that an IdP admin can import without exposing secrets', () => {
    configureSaml()
    process.env.SAML_SP_ENTITY_ID = 'https://studio.aethel.dev/saml/sp'
    process.env.SAML_SP_CERTIFICATE = '-----BEGIN CERTIFICATE-----\nspcert\n-----END CERTIFICATE-----'

    const metadata = buildSamlMetadata(getSamlReadiness())

    expect(metadata).toContain('entityID="https://studio.aethel.dev/saml/sp"')
    expect(metadata).toContain('AssertionConsumerService')
    expect(metadata).toContain('https://studio.aethel.dev/api/auth/saml/acs')
    expect(metadata).toContain('<ds:X509Certificate>spcert</ds:X509Certificate>')
    expect(metadata).not.toContain('SAML_REQUEST_SIGNING_PRIVATE_KEY')
  })

  it('builds a redirect-binding AuthnRequest with safe relay state only', () => {
    configureSaml()
    const result = buildSamlLoginRedirectUrl({
      requestId: '_aethel-test-request',
      issuedAt: new Date('2026-05-12T00:00:00.000Z'),
      relayState: '/dashboard?tab=security',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('Expected SAML redirect URL')

    const url = new URL(result.url)
    const request = url.searchParams.get('SAMLRequest')
    expect(url.origin).toBe('https://idp.example.com')
    expect(url.searchParams.get('RelayState')).toBe('/dashboard?tab=security')
    expect(request).toBeTruthy()

    const xml = inflateRawSync(Buffer.from(String(request), 'base64')).toString('utf8')
    expect(xml).toContain('ID="_aethel-test-request"')
    expect(xml).toContain('IssueInstant="2026-05-12T00:00:00.000Z"')
    expect(xml).toContain('Destination="https://idp.example.com/sso"')
  })

  it('blocks external relay states to avoid open redirects', () => {
    expect(coerceSafeRelayState('https://evil.example')).toBeUndefined()
    expect(coerceSafeRelayState('//evil.example')).toBeUndefined()
    expect(coerceSafeRelayState('/safe/path')).toBe('/safe/path')
  })
})
