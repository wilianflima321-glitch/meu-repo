#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
}

function requireToken(rel, token, label) {
  if (!read(rel).includes(token)) failures.push(`${rel}: missing ${label}`)
}

function requirePattern(rel, pattern, label) {
  if (!pattern.test(read(rel))) failures.push(`${rel}: missing ${label}`)
}

const contract = 'lib/runtime/runtime-resilience-budget.ts'
const test = '__tests__/runtime/runtime-resilience-budget.test.ts'

for (const rel of [contract, test]) {
  if (!fs.existsSync(path.join(ROOT, rel))) failures.push(`missing file: ${rel}`)
}

if (failures.length === 0) {
  for (const token of [
    'ide-shell',
    'preview-viewport',
    'agent-runtime',
    'research-browser',
    'studio-local',
    'cloud-render',
    'publish-export',
    'error-boundary-receipt',
    'crash-state-receipt',
    'rollback-receipt',
    'takeover-control-receipt',
    'teardown-receipt',
    'cost-cap-receipt',
    'human-review-receipt',
    'validateRuntimeResilienceBudgetReport',
  ]) {
    requireToken(contract, token, token)
  }

  requirePattern(contract, /maxHonestClaim:[\s\S]*not autonomous execution ready/, 'agent bounded claim')
  requirePattern(contract, /maxHonestClaim:[\s\S]*held cloud render lane/, 'cloud held claim')
  requirePattern(contract, /maxHonestClaim:[\s\S]*held desktop runtime/, 'desktop held claim')
  requirePattern(test, /keeps cloud and Studio Local held/, 'held runtime test')
}

if (failures.length) {
  console.error('[v29-runtime-resilience-budgets] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-resilience-budgets] PASS surfaces=7 receipts=crash+rollback+takeover+teardown+human-review')
