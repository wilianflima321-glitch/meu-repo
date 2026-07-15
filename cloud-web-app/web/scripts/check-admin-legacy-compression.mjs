#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const filePaths = [
  'app/admin/admin-ops-layout-client.tsx',
  'app/admin/admin-ops-layout.parts.tsx',
  'app/admin/admin-ops-layout.sidebar.tsx',
  'app/admin/admin-ops-layout.header.tsx',
  'app/admin/admin-ops-layout.model.tsx',
]
const reportPath = path.join(ROOT, 'docs', 'ADMIN_LEGACY_COMPRESSION_AUDIT.md')
const content = filePaths.map((filePath) => fs.readFileSync(path.join(ROOT, filePath), 'utf8')).join('\n')
const failures = []

if (!content.includes('CompatibilityRoutesDrawer')) failures.push('missing global CompatibilityRoutesDrawer component')
if (!content.includes('Global Legacy compatibility map')) failures.push('global compatibility drawer needs a stable aria-label')
if (content.includes('${group.label} Legacy compatibility map')) failures.push('legacy map still exists per consolidated area')
if (!content.includes('activeLegacyItem')) failures.push('active legacy route breadcrumb/link must remain visible for compatibility')
if (!content.includes('Search compatibility routes')) failures.push('global compatibility drawer needs search')

const compatibilityOccurrences = (content.match(/Compatibility routes/g) || []).length
if (compatibilityOccurrences > 3) {
  failures.push(`expected one global compatibility route drawer, found ${compatibilityOccurrences} visible labels`)
}

const report = `# Admin Legacy Compression Audit

- Shell files: ${filePaths.map((filePath) => `\`${filePath}\``).join(', ')}
- Global drawer present: ${content.includes('CompatibilityRoutesDrawer') ? 'yes' : 'no'}
- Per-section legacy disclosure removed: ${content.includes('${group.label} Legacy compatibility map') ? 'no' : 'yes'}
- Searchable compatibility map: ${content.includes('Search compatibility routes') ? 'yes' : 'no'}
- Visible "Compatibility routes" labels: ${compatibilityOccurrences}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[admin-legacy-compression] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[admin-legacy-compression] PASS')
