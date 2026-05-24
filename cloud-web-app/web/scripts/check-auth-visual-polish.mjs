#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CHECKS = [
  {
    id: 'login-auth-icons',
    file: 'app/(auth)/login/login-v2.tsx',
    required: ['KeyRound', 'ArrowLeft', 'AuthProviderMark', 'OAUTH_PROVIDERS'],
    forbidden: ['Codicon', 'name="github"', 'name="google"', 'name="key"'],
  },
  {
    id: 'register-auth-icons',
    file: 'app/(auth)/register/register-v2.tsx',
    required: ['ArrowLeft', 'AuthProviderMark', 'REGISTER_OAUTH_PROVIDERS'],
    forbidden: ['Codicon', 'name="github"', 'name="google"', 'name="arrow-left"'],
  },
]

const failures = []
for (const check of CHECKS) {
  const abs = path.join(ROOT, check.file)
  if (!fs.existsSync(abs)) {
    failures.push(`${check.id}: missing ${check.file}`)
    continue
  }
  const content = fs.readFileSync(abs, 'utf8')
  const missing = check.required.filter((token) => !content.includes(token))
  const presentForbidden = check.forbidden.filter((token) => content.includes(token))
  if (missing.length > 0) failures.push(`${check.id}: missing ${missing.join(', ')}`)
  if (presentForbidden.length > 0) failures.push(`${check.id}: forbidden ${presentForbidden.join(', ')}`)
}

if (failures.length > 0) {
  console.error(`[auth-visual-polish] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[auth-visual-polish] PASS auth entry icons are explicit and premium')
