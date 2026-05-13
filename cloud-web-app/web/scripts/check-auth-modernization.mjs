#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

requireFile('lib/server/magic-link.ts', 'passwordless email login needs a server contract')
requirePattern('lib/server/magic-link.ts', /hashMagicLinkToken/, 'magic links must persist hashed tokens only')
requirePattern('lib/server/magic-link.ts', /MAGIC_LINK_TTL_MS/, 'magic links must expire quickly')
requirePattern('lib/server/magic-link.ts', /used_at IS NULL/, 'magic links must be one-time use')
requirePattern('lib/server/magic-link.ts', /generateTokenWithRole/, 'successful magic links must issue normal auth tokens')

requireFile('app/api/auth/magic-link/request/route.ts', 'magic-link request API route must exist')
requirePattern('app/api/auth/magic-link/request/route.ts', /enforceTurnstile/, 'magic-link request must keep bot protection')
requirePattern('app/api/auth/magic-link/request/route.ts', /If an Aethel account exists/, 'magic-link request must avoid account enumeration')

requireFile('app/api/auth/magic-link/verify/route.ts', 'magic-link verify API route must exist')
requirePattern('app/api/auth/magic-link/verify/route.ts', /cookies\.set\('token'/, 'magic-link verify must establish the same JWT cookie as login')
requirePattern('app/api/auth/magic-link/verify/route.ts', /dashboard\?magic=success/, 'email links must redirect users to a productive surface')

requireFile('prisma/migrations/20260513105000_magic_link_auth/migration.sql', 'magic-link token storage must be versioned')
requirePattern('prisma/migrations/20260513105000_magic_link_auth/migration.sql', /auth_magic_link_tokens/, 'migration must create magic-link token table')
requirePattern('prisma/migrations/20260513105000_magic_link_auth/migration.sql', /token_hash TEXT NOT NULL UNIQUE/, 'tokens must be unique and hashed')

requirePattern('lib/email-system.ts', /'magic_link'/, 'transactional email templates must include magic links')
requireFile('__tests__/server/magic-link.test.ts', 'magic-link server contract needs tests')
requirePattern('__tests__/server/magic-link.test.ts', /one-time sign-in email/, 'tests must cover issuing the email')
requirePattern('__tests__/server/magic-link.test.ts', /rejects invalid, expired, and used tokens/, 'tests must cover invalid token states')

requireFile('lib/server/webauthn-passkeys.ts', 'passkeys need a WebAuthn server contract')
requirePattern('lib/server/webauthn-passkeys.ts', /generateRegistrationOptions/, 'passkeys must generate registration options')
requirePattern('lib/server/webauthn-passkeys.ts', /verifyRegistrationResponse/, 'passkeys must verify registration responses')
requirePattern('lib/server/webauthn-passkeys.ts', /verifyAuthenticationResponse/, 'passkeys must verify authentication responses')
requirePattern('lib/server/webauthn-passkeys.ts', /auth_webauthn_credentials/, 'passkeys must persist public-key credentials')
requirePattern('lib/server/webauthn-passkeys.ts', /auth_webauthn_challenges/, 'passkeys must persist short-lived challenges')

for (const route of [
  'app/api/auth/webauthn/register/options/route.ts',
  'app/api/auth/webauthn/register/verify/route.ts',
  'app/api/auth/webauthn/authenticate/options/route.ts',
  'app/api/auth/webauthn/authenticate/verify/route.ts',
]) {
  requireFile(route, 'WebAuthn passkey route must exist')
}

requireFile('components/settings/PasskeysPanel.tsx', 'Settings must expose passkey registration')
requirePattern('components/settings/PasskeysPanel.tsx', /startRegistration/, 'PasskeysPanel must invoke browser WebAuthn registration')
requirePattern('components/settings/TwoFactorSecurityPanel.tsx', /PasskeysPanel/, 'security settings must embed passkey registration')
requireFile('prisma/migrations/20260513114500_webauthn_passkeys/migration.sql', 'passkey storage must be versioned')
requirePattern('prisma/migrations/20260513114500_webauthn_passkeys/migration.sql', /public_key TEXT NOT NULL/, 'passkey public keys must be persisted')
requirePattern('app/security/page.tsx', /Passkeys em rollout tecnico/, 'public security copy must reflect passkey rollout honestly')

if (failures.length) {
  console.error('[auth-modernization] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[auth-modernization] PASS magic-link and WebAuthn passkeys are governed, versioned, wired, and tested')
