import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { randomUUID } from 'node:crypto'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server'

import { generateTokenWithRole } from '@/lib/auth-server'
import { prisma } from '@/lib/db'

const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000

type ChallengeKind = 'registration' | 'authentication'

type PasskeyCredentialRow = {
  id: string
  user_id: string
  credential_id: string
  public_key: string
  counter: number
  transports: string | null
  backed_up: boolean
  device_type: string | null
  created_at: Date
  last_used_at: Date | null
}

type ChallengeRow = {
  id: string
  user_id: string | null
  email: string | null
  challenge: string
  kind: ChallengeKind
  expires_at: Date
  used_at: Date | null
  created_at: Date
}

type PasskeyUser = {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function getWebAuthnRpId(): string {
  return new URL(getAppUrl()).hostname
}

export function getWebAuthnOrigin(): string {
  return new URL(getAppUrl()).origin
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url')
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'base64url')
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  return new Uint8Array(arrayBuffer)
}

function parseTransports(value: string | null): AuthenticatorTransportFuture[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is AuthenticatorTransportFuture => typeof item === 'string')
      : undefined
  } catch {
    return undefined
  }
}

function toWebAuthnCredential(row: PasskeyCredentialRow): WebAuthnCredential {
  return {
    id: row.credential_id,
    publicKey: base64UrlToBytes(row.public_key),
    counter: row.counter,
    transports: parseTransports(row.transports),
  }
}

export async function listUserPasskeys(userId: string) {
  const rows = await prisma.$queryRaw<PasskeyCredentialRow[]>`
    SELECT
      id,
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      backed_up,
      device_type,
      created_at,
      last_used_at
    FROM auth_webauthn_credentials
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  return rows
}

async function storeChallenge(params: {
  userId?: string | null
  email?: string | null
  challenge: string
  kind: ChallengeKind
}) {
  const expiresAt = new Date(Date.now() + WEBAUTHN_CHALLENGE_TTL_MS)

  if (params.userId || params.email) {
    await prisma.$executeRaw`
      DELETE FROM auth_webauthn_challenges
      WHERE (user_id = ${params.userId || null} OR email = ${params.email || null})
        AND kind = ${params.kind}
        AND (used_at IS NOT NULL OR expires_at < CURRENT_TIMESTAMP)
    `
  } else {
    await prisma.$executeRaw`
      DELETE FROM auth_webauthn_challenges
      WHERE user_id IS NULL
        AND email IS NULL
        AND kind = ${params.kind}
        AND (used_at IS NOT NULL OR expires_at < CURRENT_TIMESTAMP)
    `
  }

  await prisma.$executeRaw`
    INSERT INTO auth_webauthn_challenges (
      id,
      user_id,
      email,
      challenge,
      kind,
      expires_at
    )
    VALUES (
      ${`webauthn-challenge-${randomUUID()}`},
      ${params.userId || null},
      ${params.email || null},
      ${params.challenge},
      ${params.kind},
      ${expiresAt}
    )
  `
}

async function getLatestChallenge(params: {
  userId?: string | null
  email?: string | null
  kind: ChallengeKind
}) {
  const rows = await prisma.$queryRaw<ChallengeRow[]>`
    SELECT id, user_id, email, challenge, kind, expires_at, used_at, created_at
    FROM auth_webauthn_challenges
    WHERE kind = ${params.kind}
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
      AND (${params.userId || null} IS NULL OR user_id = ${params.userId || null})
      AND (${params.email || null} IS NULL OR email = ${params.email || null})
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0] || null
}

async function getLatestGlobalChallenge(kind: ChallengeKind) {
  const rows = await prisma.$queryRaw<ChallengeRow[]>`
    SELECT id, user_id, email, challenge, kind, expires_at, used_at, created_at
    FROM auth_webauthn_challenges
    WHERE kind = ${kind}
      AND user_id IS NULL
      AND email IS NULL
      AND used_at IS NULL
      AND expires_at > CURRENT_TIMESTAMP
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0] || null
}

async function markChallengeUsed(challengeId: string) {
  await prisma.$executeRaw`
    UPDATE auth_webauthn_challenges
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = ${challengeId}
  `
}

export async function buildPasskeyRegistrationOptions(user: PasskeyUser) {
  const existingCredentials = await listUserPasskeys(user.id)
  const options = await generateRegistrationOptions({
    rpName: 'Aethel Studio',
    rpID: getWebAuthnRpId(),
    userID: Buffer.from(user.id),
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credential_id,
      transports: parseTransports(credential.transports),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    timeout: WEBAUTHN_CHALLENGE_TTL_MS,
  })

  await storeChallenge({
    userId: user.id,
    email: user.email,
    challenge: options.challenge,
    kind: 'registration',
  })

  return options
}

export async function verifyAndStorePasskeyRegistration(params: {
  user: PasskeyUser
  response: RegistrationResponseJSON
}) {
  const challenge = await getLatestChallenge({
    userId: params.user.id,
    kind: 'registration',
  })
  if (!challenge) return { verified: false as const, reason: 'challenge-missing' as const }

  const verification = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    requireUserVerification: false,
  })

  if (!verification.verified) return { verified: false as const, reason: 'verification-failed' as const }

  const info = verification.registrationInfo
  const credential = info.credential

  await prisma.$executeRaw`
    INSERT INTO auth_webauthn_credentials (
      id,
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      backed_up,
      device_type
    )
    VALUES (
      ${`webauthn-credential-${randomUUID()}`},
      ${params.user.id},
      ${credential.id},
      ${bytesToBase64Url(credential.publicKey)},
      ${credential.counter},
      ${JSON.stringify(credential.transports || [])},
      ${Boolean(info.credentialBackedUp)},
      ${info.credentialDeviceType}
    )
    ON CONFLICT (credential_id) DO UPDATE SET
      counter = EXCLUDED.counter,
      transports = EXCLUDED.transports,
      backed_up = EXCLUDED.backed_up,
      device_type = EXCLUDED.device_type
  `

  await markChallengeUsed(challenge.id)
  return { verified: true as const, credentialId: credential.id }
}

export async function buildPasskeyAuthenticationOptions(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() || null
  const user = normalizedEmail
    ? await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, email: true },
      })
    : null
  const credentials = user ? await listUserPasskeys(user.id) : []

  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpId(),
    allowCredentials: credentials.map((credential) => ({
      id: credential.credential_id,
      transports: parseTransports(credential.transports),
    })),
    userVerification: 'preferred',
    timeout: WEBAUTHN_CHALLENGE_TTL_MS,
  })

  await storeChallenge({
    userId: user?.id || null,
    email: normalizedEmail,
    challenge: options.challenge,
    kind: 'authentication',
  })

  return options
}

export async function verifyPasskeyAuthentication(response: AuthenticationResponseJSON) {
  const rows = await prisma.$queryRaw<PasskeyCredentialRow[]>`
    SELECT
      id,
      user_id,
      credential_id,
      public_key,
      counter,
      transports,
      backed_up,
      device_type,
      created_at,
      last_used_at
    FROM auth_webauthn_credentials
    WHERE credential_id = ${response.id}
    LIMIT 1
  `
  const credentialRow = rows[0]
  if (!credentialRow) return { status: 'invalid-credential' as const }

  const challenge = await getLatestChallenge({
    userId: credentialRow.user_id,
    kind: 'authentication',
  }) || await getLatestGlobalChallenge('authentication')
  if (!challenge) return { status: 'challenge-missing' as const }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getWebAuthnOrigin(),
    expectedRPID: getWebAuthnRpId(),
    credential: toWebAuthnCredential(credentialRow),
    requireUserVerification: false,
  })

  if (!verification.verified) return { status: 'verification-failed' as const }

  await prisma.$executeRaw`
    UPDATE auth_webauthn_credentials
    SET counter = ${verification.authenticationInfo.newCounter},
        backed_up = ${Boolean(verification.authenticationInfo.credentialBackedUp)},
        device_type = ${verification.authenticationInfo.credentialDeviceType},
        last_used_at = CURRENT_TIMESTAMP
    WHERE id = ${credentialRow.id}
  `
  await markChallengeUsed(challenge.id)

  const user = await prisma.user.findUnique({
    where: { id: credentialRow.user_id },
    select: { id: true, email: true, name: true, role: true, plan: true },
  })
  if (!user) return { status: 'invalid-user' as const }

  return {
    status: 'authenticated' as const,
    token: generateTokenWithRole(user.id, user.email, user.role || 'user', user.plan || undefined),
    user,
  }
}
