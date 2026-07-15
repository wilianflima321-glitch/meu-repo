#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const filePath = 'app/(auth)/login/login-v2.tsx'
const reportPath = path.join(ROOT, 'docs', 'AUTH_PROVIDER_BREADTH_AUDIT.md')
const content = fs.readFileSync(path.join(ROOT, filePath), 'utf8')
const failures = []

for (const token of ['github', 'google', 'gitlab', 'discord']) {
  if (!content.includes(`'${token}'`) && !content.includes(`"${token}"`)) {
    failures.push(`${filePath}: missing OAuth provider ${token}`)
  }
}

if (!content.includes('/api/auth/oauth/${provider}')) {
  failures.push(`${filePath}: OAuth buttons must use the governed provider route with state cookie support`)
}
if (!content.includes('Team SSO / SAML for enterprise')) {
  failures.push(`${filePath}: enterprise SSO path must be visible without pretending it is self-serve`)
}
if (/Microsoft|Apple/.test(content)) {
  failures.push(`${filePath}: do not advertise Microsoft/Apple OAuth until backend support exists`)
}

const report = `# Auth Provider Breadth Audit

- Login surface: \`${filePath}\`
- GitHub visible: ${content.includes("'github'") ? 'yes' : 'no'}
- Google visible: ${content.includes("'google'") ? 'yes' : 'no'}
- GitLab visible: ${content.includes("'gitlab'") ? 'yes' : 'no'}
- Discord visible: ${content.includes("'discord'") ? 'yes' : 'no'}
- Enterprise SSO path visible: ${content.includes('Team SSO / SAML for enterprise') ? 'yes' : 'no'}
- Unsupported Microsoft/Apple claims present: ${/Microsoft|Apple/.test(content) ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[auth-provider-breadth] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[auth-provider-breadth] PASS')
