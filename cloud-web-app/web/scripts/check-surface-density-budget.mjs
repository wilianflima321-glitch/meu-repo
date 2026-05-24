#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CHECKS = [
  {
    id: 'dashboard-first-value-strip',
    file: 'components/dashboard/FirstValueGuide.tsx',
    required: ['data-first-value-strip', '<details', 'Open setup details'],
    maxCards: 18,
  },
  {
    id: 'studio-runboard-shell',
    file: 'app/studio/page.tsx',
    required: ['SurfaceQualityShell', 'Studio runboard', 'Open editor', 'Validate plan', '<details', 'data-studio-surface-board="operator-density"'],
    forbidden: ['bg-[linear-gradient', 'bg-[radial-gradient',],
    maxCards: 28,
  },
  {
    id: 'studio-mission-runboard',
    file: 'app/studio/StudioMissionControl.tsx',
    required: ['data-studio-mission-runboard="compact"', 'Review production evidence', 'Validate plan', 'Runtime truth layer'],
    forbidden: ['Run 3-agent wave', 'Cloud held by capability', 'Heavy runtime gated'],
    maxCards: 20,
  },
  {
    id: 'admin-operations-board',
    file: 'components/admin/AdminCommandCenterSections.tsx',
    required: ['Operations board', 'Open compatibility route cards', 'data-privacy="masked"'],
    maxCards: 24,
  },
  {
    id: 'research-runboard',
    file: 'components/nexus/AethelResearch.tsx',
    required: ['Research runboard', 'Review-first research package', 'Open in IDE', 'Copy prompt'],
    maxCards: 22,
  },
  {
    id: 'studio-mobile-nav-compression',
    file: 'components/studio/StudioGlobalNav.tsx',
    required: ['hidden flex-wrap items-center gap-2 md:flex', 'hidden overflow-x-auto pb-1 md:block', 'Studio primary navigation'],
    forbidden: ['Navegacao'],
    maxCards: 10,
  },
]

const failures = []
for (const check of CHECKS) {
  const abs = path.join(ROOT, check.file)
  if (!fs.existsSync(abs)) {
    failures.push(`${check.id}: missing ${check.file}`)
    continue
  }
  const content = fs.readFileSync(abs, 'utf8')
  const missing = check.required.filter((token) => !content.includes(token))
  if (missing.length > 0) failures.push(`${check.id}: missing ${missing.join(', ')}`)
  const forbidden = (check.forbidden ?? []).filter((token) => content.includes(token))
  if (forbidden.length > 0) failures.push(`${check.id}: forbidden ${forbidden.join(', ')}`)
  const cardCount = (content.match(/rounded-\[|rounded-xl|rounded-2xl|rounded-\(?/g) ?? []).length
  if (cardCount > check.maxCards) failures.push(`${check.id}: visual-card markers ${cardCount} > ${check.maxCards}`)
}

if (failures.length > 0) {
  console.error(`[surface-density-budget] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[surface-density-budget] PASS checks=${CHECKS.length}`)
