import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  simple: {
    generateRegistrationOptions: vi.fn(),
    generateAuthenticationOptions: vi.fn(),
    verifyRegistrationResponse: vi.fn(),
    verifyAuthenticationResponse: vi.fn(),
  },
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@simplewebauthn/server', () => mocks.simple)
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/auth-server', () => ({ generateTokenWithRole: vi.fn(() => 'jwt-token') }))

import {
  buildPasskeyAuthenticationOptions,
  buildPasskeyRegistrationOptions,
  getWebAuthnOrigin,
  getWebAuthnRpId,
  verifyAndStorePasskeyRegistration,
  verifyPasskeyAuthentication,
} from '@/lib/server/webauthn-passkeys'

describe('webauthn passkey server contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://studio.aethel.example/app'
  })

  it('derives a stable RP ID and origin from the public app URL', () => {
    expect(getWebAuthnRpId()).toBe('studio.aethel.example')
    expect(getWebAuthnOrigin()).toBe('https://studio.aethel.example')
  })

  it('creates registration options while storing a short-lived challenge', async () => {
    mocks.prisma.$queryRaw.mockResolvedValueOnce([])
    mocks.prisma.$executeRaw.mockResolvedValue(1)
    mocks.simple.generateRegistrationOptions.mockResolvedValueOnce({ challenge: 'registration-challenge' })

    const options = await buildPasskeyRegistrationOptions({
      id: 'user-1',
      email: 'builder@example.com',
      name: 'Builder',
      role: 'user',
      plan: 'free',
    })

    expect(options).toEqual({ challenge: 'registration-challenge' })
    expect(mocks.simple.generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: 'Aethel Studio',
        rpID: 'studio.aethel.example',
        userName: 'builder@example.com',
      })
    )
    expect(mocks.prisma.$executeRaw).toHaveBeenCalled()
  })

  it('fails registration verification when no active challenge exists', async () => {
    mocks.prisma.$queryRaw.mockResolvedValueOnce([])

    const result = await verifyAndStorePasskeyRegistration({
      user: { id: 'user-1', email: 'builder@example.com', name: null, role: 'user', plan: 'free' },
      response: { id: 'cred-1' } as never,
    })

    expect(result).toEqual({ verified: false, reason: 'challenge-missing' })
    expect(mocks.simple.verifyRegistrationResponse).not.toHaveBeenCalled()
  })

  it('stores a verified registration as a reusable passkey credential', async () => {
    mocks.prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: 'challenge-1',
        user_id: 'user-1',
        email: 'builder@example.com',
        challenge: 'registration-challenge',
        kind: 'registration',
        expires_at: new Date(Date.now() + 60_000),
        used_at: null,
        created_at: new Date(),
      },
    ])
    mocks.prisma.$executeRaw.mockResolvedValue(1)
    mocks.simple.verifyRegistrationResponse.mockResolvedValueOnce({
      verified: true,
      registrationInfo: {
        credential: {
          id: 'credential-1',
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 1,
          transports: ['internal'],
        },
        credentialBackedUp: true,
        credentialDeviceType: 'singleDevice',
      },
    })

    const result = await verifyAndStorePasskeyRegistration({
      user: { id: 'user-1', email: 'builder@example.com', name: null, role: 'user', plan: 'free' },
      response: { id: 'credential-1' } as never,
    })

    expect(result).toEqual({ verified: true, credentialId: 'credential-1' })
    expect(mocks.simple.verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: 'registration-challenge',
        expectedOrigin: 'https://studio.aethel.example',
        expectedRPID: 'studio.aethel.example',
      })
    )
    expect(mocks.prisma.$executeRaw).toHaveBeenCalledTimes(2)
  })

  it('builds authentication options without revealing unknown accounts', async () => {
    mocks.prisma.user.findUnique.mockResolvedValueOnce(null)
    mocks.prisma.$executeRaw.mockResolvedValue(1)
    mocks.simple.generateAuthenticationOptions.mockResolvedValueOnce({ challenge: 'auth-challenge', allowCredentials: [] })

    const options = await buildPasskeyAuthenticationOptions('missing@example.com')

    expect(options).toEqual({ challenge: 'auth-challenge', allowCredentials: [] })
    expect(mocks.simple.generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpID: 'studio.aethel.example', allowCredentials: [] })
    )
  })

  it('authenticates a credential against the global usernameless challenge fallback', async () => {
    mocks.prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'row-1',
          user_id: 'user-1',
          credential_id: 'credential-1',
          public_key: Buffer.from([1, 2, 3]).toString('base64url'),
          counter: 1,
          transports: JSON.stringify(['internal']),
          backed_up: false,
          device_type: 'singleDevice',
          created_at: new Date(),
          last_used_at: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'global-challenge-1',
          user_id: null,
          email: null,
          challenge: 'global-auth-challenge',
          kind: 'authentication',
          expires_at: new Date(Date.now() + 60_000),
          used_at: null,
          created_at: new Date(),
        },
      ])
    mocks.prisma.$executeRaw.mockResolvedValue(1)
    mocks.prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'builder@example.com',
      name: 'Builder',
      role: 'user',
      plan: 'pro',
    })
    mocks.simple.verifyAuthenticationResponse.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: {
        newCounter: 2,
        credentialBackedUp: true,
        credentialDeviceType: 'multiDevice',
      },
    })

    const result = await verifyPasskeyAuthentication({ id: 'credential-1' } as never)

    expect(result).toMatchObject({
      status: 'authenticated',
      token: 'jwt-token',
      user: { id: 'user-1', email: 'builder@example.com' },
    })
    expect(mocks.simple.verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedChallenge: 'global-auth-challenge',
        expectedOrigin: 'https://studio.aethel.example',
        expectedRPID: 'studio.aethel.example',
      })
    )
    expect(mocks.prisma.$executeRaw).toHaveBeenCalledTimes(2)
  })
})
