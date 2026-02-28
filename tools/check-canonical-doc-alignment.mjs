#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file))
}

const requiredDocs = [
  'docs/master/00_INDEX.md',
  'docs/master/00_FONTE_CANONICA.md',
  'docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md',
  'docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md',
  'docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md',
  'docs/master/20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md',
  'docs/master/22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md',
  'docs/master/23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md',
  'docs/master/24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md',
  'docs/master/25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md',
  'docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md',
]

for (const doc of requiredDocs) {
  if (!exists(doc)) {
    failures.push(`missing canonical document: ${doc}`)
  }
}

if (exists('docs/master/00_INDEX.md')) {
  const index = read('docs/master/00_INDEX.md')
  if (!index.includes('26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md')) {
    failures.push('00_INDEX is missing reference to canonical baseline doc 26')
  }
}

if (exists('docs/master/00_FONTE_CANONICA.md')) {
  const fonte = read('docs/master/00_FONTE_CANONICA.md')
  if (!fonte.includes('26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md')) {
    failures.push('00_FONTE_CANONICA is missing reference to canonical baseline doc 26')
  }
}

const activeDocsForLegacyPathCheck = [
  'docs/master/00_INDEX.md',
  'docs/master/00_FONTE_CANONICA.md',
  'docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md',
  'docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md',
  'docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md',
  'docs/master/15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md',
  'docs/master/16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md',
  'docs/master/18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md',
  'docs/master/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md',
  'docs/master/20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md',
  'docs/master/22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md',
  'docs/master/23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md',
  'docs/master/24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md',
  'docs/master/25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md',
  'docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md',
]

for (const doc of activeDocsForLegacyPathCheck) {
  if (!exists(doc)) continue
  const content = read(doc)
  if (content.includes('audit dicas do emergent usar/')) {
    failures.push(`legacy external path reference found in active doc: ${doc}`)
  }
}

function extractMetricValue(content, key) {
  const regex = new RegExp(`${key}=([0-9]+)`)
  const match = content.match(regex)
  return match ? Number.parseInt(match[1], 10) : null
}

if (exists('docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md') && exists('cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md')) {
  const baseline = read('docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md')
  const sweep = read('cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md')

  const keys = [
    'legacy-accent-tokens',
    'admin-light-theme-tokens',
    'admin-status-light-tokens',
    'blocking-browser-dialogs',
    'not-implemented-ui',
  ]

  for (const key of keys) {
    const baselineVal = extractMetricValue(baseline, key)
    const sweepRegex = new RegExp(`\\\`${key}\\\`[^\\n]*:\\s*([0-9]+)`)
    const sweepMatch = sweep.match(sweepRegex)
    const sweepVal = sweepMatch ? Number.parseInt(sweepMatch[1], 10) : null
    if (baselineVal === null || sweepVal === null) {
      failures.push(`unable to parse metric "${key}" in baseline or sweep`)
      continue
    }
    if (baselineVal !== sweepVal) {
      failures.push(`metric mismatch for "${key}": baseline=${baselineVal}, sweep=${sweepVal}`)
    }
  }
}

if (failures.length > 0) {
  console.error('[canonical-doc-alignment] FAIL')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('[canonical-doc-alignment] PASS')
