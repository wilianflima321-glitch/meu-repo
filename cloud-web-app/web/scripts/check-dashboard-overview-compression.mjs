#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const overviewPath = path.join(ROOT, 'components', 'dashboard', 'DashboardOverviewTab.tsx')
const launchPath = path.join(ROOT, 'components', 'dashboard', 'DashboardWorkspaceLaunch.tsx')
const sidebarPath = path.join(ROOT, 'components', 'dashboard', 'AethelDashboardSidebar.tsx')
const shellPath = path.join(ROOT, 'components', 'dashboard', 'DashboardShell.tsx')
const topbarPath = path.join(ROOT, 'components', 'dashboard', 'DashboardTopBar.tsx')
const failures = []

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    failures.push(`missing ${path.relative(ROOT, filePath)}`)
    return ''
  }
  return fs.readFileSync(filePath, 'utf8')
}

const overview = read(overviewPath)
const launch = read(launchPath)
const sidebar = read(sidebarPath)
const shell = read(shellPath)
const topbar = read(topbarPath)

const requiredOverviewTokens = [
  'DashboardWorkspaceLaunch',
  'primaryProject',
  'pendingApprovals',
  'aiProviderConfigured',
  'backendOnline',
]

const requiredLaunchTokens = [
  'data-dashboard-firebase-launch="workspace-entry"',
  'data-dashboard-command-card="one-glance"',
  'Plan with Copilot',
  'My workspaces',
  'Open IDE',
  '3D scene',
  'Open receipts',
  'persistDashboardLaunchMission',
]

const requiredSidebarTokens = [
  'data-dashboard-sidebar-density="three-primary-tabs"',
  'data-dashboard-primary-tabs="3"',
  'data-dashboard-secondary-tools="drawer-links"',
  'Primary flow',
  'Creative Studio',
  'Evidence',
]

for (const token of requiredOverviewTokens) {
  if (!overview.includes(token)) failures.push(`DashboardOverviewTab.tsx missing ${token}`)
}

for (const token of requiredLaunchTokens) {
  if (!launch.includes(token)) failures.push(`DashboardWorkspaceLaunch.tsx missing ${token}`)
}

for (const token of requiredSidebarTokens) {
  if (!sidebar.includes(token)) failures.push(`AethelDashboardSidebar.tsx missing ${token}`)
}

for (const forbidden of ['<DashboardProjectBrainCard', '<DashboardMissionLedgerCard', '<DashboardRepositoryCartographyCard', '<DeviceRuntimeGuardCard', 'data-dashboard-desktop-signal-strip']) {
  if (overview.includes(forbidden)) {
    failures.push(`DashboardOverviewTab.tsx must not render ${forbidden} directly; keep deep evidence behind disclosure`)
  }
}

for (const forbidden of ['DashboardEvidenceDisclosure']) {
  if (overview.includes(forbidden)) {
    failures.push(`DashboardOverviewTab.tsx must not render ${forbidden}; deep receipts belong in /evidence`)
  }
}

if (overview.includes('Â')) {
  failures.push('DashboardOverviewTab.tsx contains mojibake; keep dashboard copy clean for screenshots')
}

for (const forbidden of ['bg-[linear-gradient', 'Operational snapshot', 'Proof stays one click away']) {
  if (launch.includes(forbidden)) {
    failures.push(`DashboardWorkspaceLaunch.tsx still contains dense/cliche launch token: ${forbidden}`)
  }
}

for (const forbidden of ['Next best move', 'Current surface', 'bg-[linear-gradient']) {
  if (sidebar.includes(forbidden)) {
    failures.push(`AethelDashboardSidebar.tsx still contains redundant/cliche sidebar token: ${forbidden}`)
  }
}

for (const [label, content] of [
  ['DashboardShell.tsx', shell],
  ['DashboardTopBar.tsx', topbar],
]) {
  if (content.includes('bg-[linear-gradient')) {
    failures.push(`${label} must use solid product chrome instead of gradient dashboard chrome`)
  }
}

const overviewLines = overview.split(/\r?\n/).length
const launchLines = launch.split(/\r?\n/).length
if (overviewLines > 420) {
  failures.push(`DashboardOverviewTab.tsx is ${overviewLines} lines; split/compact threshold is 420`)
}

if (launchLines > 260) {
  failures.push(`DashboardWorkspaceLaunch.tsx is ${launchLines} lines; split/compact threshold is 260`)
}

if (failures.length > 0) {
  console.error(`[dashboard-overview-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[dashboard-overview-compression] PASS overviewLines=${overviewLines} launchLines=${launchLines}`)
