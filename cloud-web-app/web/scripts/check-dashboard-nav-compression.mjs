#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const reportPath = path.join(ROOT, 'docs', 'DASHBOARD_NAV_COMPRESSION_AUDIT.md')
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

const shellPath = 'components/dashboard/DashboardShell.tsx'
const topbarPath = 'components/dashboard/DashboardTopBar.tsx'
const shell = read(shellPath)
const topbar = read(topbarPath)
const mobileLayout = read('components/ui/MobileResponsiveLayout.tsx')

for (const forbidden of ['StudioGlobalNav', 'StudioActionRail', '<DashboardFlowRail']) {
  if (shell.includes(forbidden)) failures.push(`${shellPath}: default dashboard shell still references ${forbidden}`)
}

if (!shell.includes('DashboardTopBar')) failures.push(`${shellPath}: missing DashboardTopBar`)
if (!topbar.includes('Operations')) failures.push(`${topbarPath}: topbar must expose a compressed Operations drawer`)
if (!topbar.includes('Open Studio')) failures.push(`${topbarPath}: topbar must keep the primary Studio CTA visible`)
if (!topbar.includes('CostMeter')) failures.push(`${topbarPath}: topbar must keep live cost visible`)
if (!mobileLayout.includes('grid-cols-3') || !mobileLayout.includes('grid-cols-4') || !mobileLayout.includes('grid-cols-5')) {
  failures.push('components/ui/MobileResponsiveLayout.tsx: mobile bottom nav must support density-aware column counts')
}

const mobileNavBlock = shell.match(/<MobileBottomNav[\s\S]*?\/>/)?.[0] ?? ''
const mobileNavItems = (mobileNavBlock.match(/href:\s*['"]/g) ?? []).length
if (mobileNavItems > 3) {
  failures.push(`${shellPath}: mobile bottom nav exposes ${mobileNavItems} items; keep primary mobile chrome to Home, Studio, Agents`)
}
for (const requiredLabel of ["label: 'Home'", "label: 'Studio'", "label: 'Agents'"]) {
  if (!mobileNavBlock.includes(requiredLabel)) {
    failures.push(`${shellPath}: mobile bottom nav missing ${requiredLabel}`)
  }
}
for (const secondaryLabel of ["label: 'Billing'", "label: 'Settings'"]) {
  if (mobileNavBlock.includes(secondaryLabel)) {
    failures.push(`${shellPath}: ${secondaryLabel} must live in secondary drawers, not bottom nav`)
  }
}

const report = `# Dashboard Nav Compression Audit

- Shell: \`${shellPath}\`
- Topbar: \`${topbarPath}\`
- StudioGlobalNav rendered by dashboard shell: ${shell.includes('StudioGlobalNav') ? 'yes' : 'no'}
- StudioActionRail rendered by dashboard shell: ${shell.includes('StudioActionRail') ? 'yes' : 'no'}
- DashboardFlowRail rendered by default: ${shell.includes('<DashboardFlowRail') ? 'yes' : 'no'}
- CostMeter visible in topbar: ${topbar.includes('CostMeter') ? 'yes' : 'no'}
- Mobile bottom nav items: ${mobileNavItems}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[dashboard-nav-compression] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[dashboard-nav-compression] PASS')
