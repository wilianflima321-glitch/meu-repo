#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const shellPath = 'app/studio/CreativeStudioShell.tsx'
const routesPath = 'app/studio/creative-studio-routes.ts'
const reportPath = path.join(ROOT, 'docs', 'STUDIO_MATURITY_HEADERS_AUDIT.md')
const shell = fs.readFileSync(path.join(ROOT, shellPath), 'utf8')
const routes = fs.readFileSync(path.join(ROOT, routesPath), 'utf8')
const failures = []

for (const token of ['maturityGuidance', 'Heavy jobs wait for runtime.', 'Preview', 'Local optional', 'Cloud locked']) {
  if (!shell.includes(token)) failures.push(`${shellPath}: missing ${token}`)
}
if (!shell.includes('MaturityBadge maturity={currentRoute.maturity}')) {
  failures.push(`${shellPath}: current editor route must render maturity badge from route registry`)
}
if (!routes.includes('maturity:')) {
  failures.push(`${routesPath}: creative routes must keep maturity metadata`)
}
if (/Unreal-grade|AAA sozinho|100% Unreal/i.test(shell + routes)) {
  failures.push('studio maturity surfaces must not make unsupported AAA/Unreal claims')
}

const routeCount = (routes.match(/href:\s*'\/studio\//g) || []).length
const maturityCount = (routes.match(/maturity:\s*'/g) || []).length
if (routeCount !== maturityCount) {
  failures.push(`${routesPath}: every studio route must have maturity metadata (${maturityCount}/${routeCount})`)
}

const report = `# Studio Maturity Headers Audit

- Shell: \`${shellPath}\`
- Creative route registry: \`${routesPath}\`
- Studio routes: ${routeCount}
- Routes with maturity metadata: ${maturityCount}
- Header exposes runtime gating: ${shell.includes('Heavy jobs wait for runtime.') ? 'yes' : 'no'}
- Unsupported AAA/Unreal claims: ${/Unreal-grade|AAA sozinho|100% Unreal/i.test(shell + routes) ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[studio-maturity-headers] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-maturity-headers] PASS')
