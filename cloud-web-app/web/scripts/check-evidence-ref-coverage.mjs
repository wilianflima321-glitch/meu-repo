#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const modulePath = 'lib/production/evidence-ref-coverage.ts'
const routePath = 'app/api/projects/[id]/production-state/evidence-coverage/route.ts'
const unitTest = '__tests__/production/evidence-ref-coverage.test.ts'
const routeTest = '__tests__/api/production-state-evidence-coverage-route.test.ts'

requirePattern(modulePath, /AETHEL_EVIDENCE_REF_COVERAGE/, 'canonical capability id')
requirePattern(modulePath, /EvidenceRefCoverageReport/, 'coverage report type')
requirePattern(modulePath, /project-memory/, 'project memory domain')
requirePattern(modulePath, /research-intelligence/, 'research evidence domain')
requirePattern(modulePath, /browser-navigation/, 'browser navigation domain')
requirePattern(modulePath, /agent-run-ledger/, 'agent run ledger domain')
requirePattern(modulePath, /asset-quality/, 'asset quality domain')
requirePattern(modulePath, /runtime-job/, 'runtime job domain')
requirePattern(modulePath, /playtest/, 'playtest domain')
requirePattern(modulePath, /release-approval/, 'human release approval domain')
requirePattern(modulePath, /Human release approval evidence is required/, 'release approval blocker')
requirePattern(modulePath, /buildProductionReadinessSummary/, 'readiness summary integration')

requirePattern(routePath, /requireAuth/, 'route auth guard')
requirePattern(routePath, /requireEntitlementsForUser/, 'entitlement guard')
requirePattern(routePath, /readAgenticProductionStateFromSettings/, 'production state reader')
requirePattern(routePath, /buildEvidenceRefCoverageReport/, 'coverage report builder')
requirePattern(routePath, /capabilityStatus/, 'capability status response')

requirePattern(unitTest, /blocks market-ready claims/, 'missing evidence regression')
requirePattern(unitTest, /persisted research, browser, agent-run, runtime, and approval evidence/, 'covered evidence regression')
requirePattern(unitTest, /requires playtest and asset quality evidence/, 'game evidence regression')
requirePattern(routeTest, /returns an evidence ref coverage report/, 'route regression')

requirePattern('package.json', /"qa:evidence-ref-coverage"/, 'package script')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:evidence-ref-coverage/, 'enterprise gate ordering')
requirePattern('scripts/check-backbone-market-readiness.mjs', /evidence-ref-coverage/, 'backbone coverage')
requirePattern('scripts/check-backbone-market-readiness.mjs', /AETHEL_EVIDENCE_REF_COVERAGE/, 'backbone capability token')

if (failures.length) {
  console.error('[evidence-ref-coverage] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[evidence-ref-coverage] PASS domains=8 releaseApproval=true runtimeReceipts=true')
