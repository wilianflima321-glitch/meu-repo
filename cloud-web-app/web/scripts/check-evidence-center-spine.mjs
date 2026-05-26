#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
const reportPath = path.join(ROOT, 'docs', 'EVIDENCE_CENTER_SPINE_AUDIT.md')

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

for (const file of ['app/evidence/page.tsx', 'components/evidence/EvidenceCenter.tsx']) {
  if (!exists(file)) failures.push(`${file}: missing`)
}

const page = exists('app/evidence/page.tsx') ? read('app/evidence/page.tsx') : ''
const center = exists('components/evidence/EvidenceCenter.tsx') ? read('components/evidence/EvidenceCenter.tsx') : ''
const middleware = read('middleware.ts')

if (!page.includes('EvidenceCenter')) failures.push('app/evidence/page.tsx: must render EvidenceCenter')
for (const required of [
  '/api/projects',
  '/production-state',
  '/production-state/release-evidence-readiness',
  'Release evidence package',
  'Request review',
  'Record approval',
  'Reject package',
  'Export manifest',
  'Integrity verified',
  'data-evidence-source="release-evidence-package-manifest"',
  'data-evidence-source="release-evidence-readiness"',
  'Project Brain',
  'Mission ledger',
  'Graph coverage',
  'Evidence unavailable',
]) {
  if (!center.includes(required)) failures.push(`components/evidence/EvidenceCenter.tsx: missing ${required}`)
}
if (/PUBLIC_PATH_PREFIXES[\s\S]*['"]\/evidence['"]/.test(middleware) || /PUBLIC_EXACT_PATHS[\s\S]*['"]\/evidence['"]/.test(middleware)) {
  failures.push('middleware.ts: /evidence must remain protected')
}
if (/fake|simulated success|AAA sozinho|Unreal-grade/i.test(center)) {
  failures.push('components/evidence/EvidenceCenter.tsx: fake-success or unsafe marketing copy detected')
}

const report = `# Evidence Center Spine Audit

- Protected UI route: \`app/evidence/page.tsx\`
- Client surface: \`components/evidence/EvidenceCenter.tsx\`
- Uses projects API: ${center.includes('/api/projects') ? 'yes' : 'no'}
- Uses production-state API: ${center.includes('/production-state') ? 'yes' : 'no'}
- Uses release-evidence-readiness API: ${center.includes('/production-state/release-evidence-readiness') ? 'yes' : 'no'}
- Middleware public allow-list includes /evidence: ${middleware.includes("'/evidence'") || middleware.includes('"/evidence"') ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[evidence-center-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[evidence-center-spine] PASS')
