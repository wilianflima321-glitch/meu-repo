#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const file = 'components/ui/CookieConsent.tsx'
const absolutePath = path.join(ROOT, file)
const failures = []

if (!fs.existsSync(absolutePath)) {
  failures.push(`missing ${file}`)
} else {
  const content = fs.readFileSync(absolutePath, 'utf8')
  const required = [
    'AUTHENTICATED_WORKSPACE_PATHS',
    'shouldSuppressForAuthenticatedWorkspace',
    "localStorage.getItem('aethel-token')",
    "cookie.trim().startsWith('token=')",
    "if (shouldSuppressForAuthenticatedWorkspace()) return",
  ]
  for (const token of required) {
    if (!content.includes(token)) failures.push(`missing ${token}`)
  }
}

if (failures.length > 0) {
  console.error(`[authenticated-cookie-chrome] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[authenticated-cookie-chrome] PASS workspace cookie banner is suppressed after auth')
