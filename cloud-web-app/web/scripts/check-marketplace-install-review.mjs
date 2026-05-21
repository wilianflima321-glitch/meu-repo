#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const partsPath = 'app/marketplace/marketplace-page.parts.tsx'
const dataPath = 'app/marketplace/marketplace-page.data.ts'
const reportPath = path.join(ROOT, 'docs', 'MARKETPLACE_INSTALL_REVIEW_AUDIT.md')
const parts = fs.readFileSync(path.join(ROOT, partsPath), 'utf8')
const data = fs.readFileSync(path.join(ROOT, dataPath), 'utf8')
const failures = []

for (const required of ['MarketplaceInstallReview', 'Permissions', 'Provenance', 'Rollback', 'Install preview', 'Request review']) {
  if (!parts.includes(required)) failures.push(`${partsPath}: missing ${required}`)
}
if (!data.includes('rollbackPlan')) failures.push(`${dataPath}: marketplace data must expose rollbackPlan`)
if (/Confirm install/.test(parts)) failures.push(`${partsPath}: compact confirmation copy must be replaced by install review`)
if (/public install metric|installs|downloads/i.test(parts) && !parts.includes('No public install metric yet')) {
  failures.push(`${partsPath}: public metrics must remain evidence-backed`)
}

const report = `# Marketplace Install Review Audit

- Review component: ${parts.includes('MarketplaceInstallReview') ? 'yes' : 'no'}
- Permissions visible: ${parts.includes('Permissions') ? 'yes' : 'no'}
- Provenance visible: ${parts.includes('Provenance') ? 'yes' : 'no'}
- Rollback visible: ${parts.includes('Rollback') ? 'yes' : 'no'}
- Preview/request CTA labels: ${parts.includes('Install preview') && parts.includes('Request review') ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[marketplace-install-review] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[marketplace-install-review] PASS')
