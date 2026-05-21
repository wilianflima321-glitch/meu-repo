#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const scriptPath = 'scripts/capture-authenticated-ux-surfaces.mjs'
const reportPath = path.join(ROOT, 'docs', 'AUTHENTICATED_UX_HARNESS_AUDIT.md')
const failures = []

if (!fs.existsSync(path.join(ROOT, scriptPath))) {
  failures.push(`${scriptPath}: missing`)
}

const content = fs.existsSync(path.join(ROOT, scriptPath)) ? fs.readFileSync(path.join(ROOT, scriptPath), 'utf8') : ''
const requiredRoutes = ['/dashboard', '/ide', '/studio', '/studio/level', '/studio/scene', '/studio/film', '/admin', '/billing', '/settings', '/evidence']

for (const route of requiredRoutes) {
  if (!content.includes(`'${route}'`) && !content.includes(`"${route}"`)) failures.push(`${scriptPath}: missing route ${route}`)
}
for (const required of ['JWT_SECRET', 'AUTH_QA_SECRET_MISSING', 'aethel-token', "name: 'token'", 'jsonwebtoken']) {
  if (!content.includes(required)) failures.push(`${scriptPath}: missing ${required}`)
}
if (/secret\s*=\s*['"][^'"]+['"]/.test(content)) {
  failures.push(`${scriptPath}: must not hardcode a JWT secret`)
}
if (/\/api\/auth\/.*bypass|qa-bypass|impersonate/i.test(content)) {
  failures.push(`${scriptPath}: must not use auth bypass routes`)
}

const report = `# Authenticated UX Harness Audit

- Capture script: \`${scriptPath}\`
- Protected routes covered: ${requiredRoutes.filter((route) => content.includes(`'${route}'`) || content.includes(`"${route}"`)).length}/${requiredRoutes.length}
- Uses signed JWT from env: ${content.includes('JWT_SECRET') ? 'yes' : 'no'}
- Injects cookie and localStorage token: ${content.includes("name: 'token'") && content.includes('aethel-token') ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[authenticated-ux-harness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[authenticated-ux-harness] PASS')
