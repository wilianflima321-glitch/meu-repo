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

for (const forbidden of ['StudioGlobalNav', 'StudioActionRail', '<DashboardFlowRail']) {
  if (shell.includes(forbidden)) failures.push(`${shellPath}: default dashboard shell still references ${forbidden}`)
}

if (!shell.includes('DashboardTopBar')) failures.push(`${shellPath}: missing DashboardTopBar`)
if (!topbar.includes('Operations')) failures.push(`${topbarPath}: topbar must expose a compressed Operations drawer`)
if (!topbar.includes('Open Studio')) failures.push(`${topbarPath}: topbar must keep the primary Studio CTA visible`)
if (!topbar.includes('CostMeter')) failures.push(`${topbarPath}: topbar must keep live cost visible`)

const report = `# Dashboard Nav Compression Audit

- Shell: \`${shellPath}\`
- Topbar: \`${topbarPath}\`
- StudioGlobalNav rendered by dashboard shell: ${shell.includes('StudioGlobalNav') ? 'yes' : 'no'}
- StudioActionRail rendered by dashboard shell: ${shell.includes('StudioActionRail') ? 'yes' : 'no'}
- DashboardFlowRail rendered by default: ${shell.includes('<DashboardFlowRail') ? 'yes' : 'no'}
- CostMeter visible in topbar: ${topbar.includes('CostMeter') ? 'yes' : 'no'}

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
