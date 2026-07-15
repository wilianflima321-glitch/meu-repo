#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
const contractPath = 'lib/runtime/v30-internal-spine.ts'
const fullPath = path.join(ROOT, contractPath)

if (!fs.existsSync(fullPath)) {
  failures.push(`${contractPath}: missing`)
} else {
  const content = fs.readFileSync(fullPath, 'utf8')
  for (const token of [
    'V30ExecutionLogEntry',
    'V30LockfileInventory',
    'WorkbenchRegionRegistry',
    'AgentEvidenceReceipt',
    'CreativeWorkbenchContract',
    'DesktopSidecarInstallReceipt',
    'AssetQualityLedger',
    'V30QualityScorecard',
    'V30_LOCKFILE_INVENTORY',
    'V30_ROUTE_SURFACE_RATCHETS',
    'V30_QUALITY_SCORECARD_POLICY',
    'V30_WORKBENCH_REGION_REGISTRY',
    'V30_CREATIVE_WORKBENCH_CONTRACT',
  ]) {
    if (!content.includes(token)) failures.push(`${contractPath}: missing ${token}`)
  }

  for (const state of [
    'available',
    'held',
    'blocked',
    'needs-review',
    'provider_unavailable',
    'human_review_required',
  ]) {
    if (!content.includes(`'${state}'`)) failures.push(`${contractPath}: missing required state ${state}`)
  }

  for (const ratchet of [
    'pagesMax: 58',
    'adminSubroutesMax: 6',
    'studioSubroutesMax: 5',
    'shellEntrypointsMax: 8',
    'filesOver500Max: 218',
    'filesOver800Max: 0',
  ]) {
    if (!content.includes(ratchet)) failures.push(`${contractPath}: missing ratchet ${ratchet}`)
  }
}

if (!fs.existsSync(path.join(ROOT, 'components/studio/CreativeWorkbenchShell.tsx'))) {
  failures.push('components/studio/CreativeWorkbenchShell.tsx: missing shared creative workbench shell')
}

const executionLog = path.join(ROOT, '..', '..', 'EXECUTION_LOG.txt')
if (!fs.existsSync(executionLog)) {
  failures.push('EXECUTION_LOG.txt: missing root progress ledger')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_INTERNAL_CONTRACTS.md'),
  [
    '# V30 Internal Contracts',
    '',
    `Contract: ${contractPath}`,
    `Execution log: ${fs.existsSync(executionLog) ? 'present' : 'missing'}`,
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-internal-contracts] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v30-internal-contracts] PASS contracts=7 ratchets=6')
