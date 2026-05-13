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

if (failures.length) {
  console.error('[auth-modernization] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[auth-modernization] PASS magic-link login is one-time, hashed, bot-guarded, and tested')
