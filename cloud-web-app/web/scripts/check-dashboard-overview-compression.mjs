#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const overviewPath = path.join(ROOT, 'components', 'dashboard', 'DashboardOverviewTab.tsx')
const disclosurePath = path.join(ROOT, 'components', 'dashboard', 'DashboardEvidenceDisclosure.tsx')
const heroPath = path.join(ROOT, 'components', 'dashboard', 'DashboardMissionHero.tsx')
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
const disclosure = read(disclosurePath)
const hero = read(heroPath)
const sidebar = read(sidebarPath)
const shell = read(shellPath)
const topbar = read(topbarPath)

const requiredOverviewTokens = [
  'DashboardEvidenceDisclosure',
  'DashboardMissionHero',
  'data-dashboard-operator-snapshot',
  'Operational snapshot',
]

const requiredHeroTokens = [
  'data-dashboard-command-card="one-glance"',
  'data-dashboard-run-state-panel',
  'Continue workspace',
]

const requiredDisclosureTokens = [
  'data-dashboard-evidence-disclosure',
  'data-dashboard-evidence-details',
  '<details',
  'Open deep evidence and runtime diagnostics',
  'Proof stays one tap away.',
]

const requiredSidebarTokens = [
  'data-dashboard-sidebar-density="primary-first"',
  'Primary flow',
  'Open Studio',
  'Evidence',
]

for (const token of requiredOverviewTokens) {
  if (!overview.includes(token)) failures.push(`DashboardOverviewTab.tsx missing ${token}`)
}

for (const token of requiredHeroTokens) {
  if (!hero.includes(token)) failures.push(`DashboardMissionHero.tsx missing ${token}`)
}

for (const token of requiredDisclosureTokens) {
  if (!disclosure.includes(token)) failures.push(`DashboardEvidenceDisclosure.tsx missing ${token}`)
}

for (const token of requiredSidebarTokens) {
  if (!sidebar.includes(token)) failures.push(`AethelDashboardSidebar.tsx missing ${token}`)
}

for (const forbidden of ['<DashboardProjectBrainCard', '<DashboardMissionLedgerCard', '<DashboardRepositoryCartographyCard', '<DeviceRuntimeGuardCard', 'data-dashboard-desktop-signal-strip']) {
  if (overview.includes(forbidden)) {
    failures.push(`DashboardOverviewTab.tsx must not render ${forbidden} directly; keep deep evidence behind disclosure`)
  }
}

for (const forbidden of ['bg-[linear-gradient', 'Expand Studio', 'Embedded Studio']) {
  if (hero.includes(forbidden)) {
    failures.push(`DashboardMissionHero.tsx still contains dense/cliche hero token: ${forbidden}`)
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
if (overviewLines > 620) {
  failures.push(`DashboardOverviewTab.tsx is ${overviewLines} lines; split/compact threshold is 620`)
}

if (failures.length > 0) {
  console.error(`[dashboard-overview-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[dashboard-overview-compression] PASS overviewLines=${overviewLines}`)
