#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: ${reason}`)
}

requirePattern(
  'lib/server/ai-change-apply/executor.ts',
  /persistGovernedTaskEvidence/,
  'apply executor must persist governed evidence after successful writes',
)

requirePattern(
  'lib/server/ai-change-apply/executor.ts',
  /evaluateGovernedAgentToolJob/,
  'apply executor must evaluate governed tool jobs',
)

requirePattern(
  'lib/production/task-evidence-ledger-store.ts',
  /writeTaskEvidenceLedgerToSettings/,
  'evidence ledger must persist into project settings',
)

if (failures.length > 0) {
  console.error('[evidence-ledger-coverage] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[evidence-ledger-coverage] PASS')
