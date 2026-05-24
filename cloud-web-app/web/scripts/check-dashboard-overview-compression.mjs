#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const overviewPath = path.join(ROOT, 'components', 'dashboard', 'DashboardOverviewTab.tsx')
const disclosurePath = path.join(ROOT, 'components', 'dashboard', 'DashboardEvidenceDisclosure.tsx')
const heroPath = path.join(ROOT, 'components', 'dashboard', 'DashboardMissionHero.tsx')
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

const requiredOverviewTokens = [
  'DashboardEvidenceDisclosure',
  'DashboardMissionHero',
  'data-dashboard-desktop-signal-strip',
]

const requiredHeroTokens = [
  'hidden max-w-2xl text-sm leading-7',
  'hidden rounded-[28px]',
]

const requiredDisclosureTokens = [
  'data-dashboard-evidence-disclosure',
  'data-dashboard-evidence-details',
  '<details',
  'Open deep evidence and runtime diagnostics',
  'Proof stays one tap away.',
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

for (const forbidden of ['<DashboardProjectBrainCard', '<DashboardMissionLedgerCard', '<DashboardRepositoryCartographyCard', '<DeviceRuntimeGuardCard']) {
  if (overview.includes(forbidden)) {
    failures.push(`DashboardOverviewTab.tsx must not render ${forbidden} directly; keep deep evidence behind disclosure`)
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
