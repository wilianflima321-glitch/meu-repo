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

const spine = 'lib/production/runtime-job-receipts.ts'
const route = 'app/api/projects/[id]/production-state/runtime-job-receipts/route.ts'
const studioDispatchRoute = 'app/api/projects/[id]/production-state/studio-local-cook-dispatch/route.ts'
const renderEvidenceRoute = 'app/api/projects/[id]/production-state/render-job/evidence/route.ts'
const unitTest = '__tests__/production/runtime-job-receipts.test.ts'
const apiTest = '__tests__/api/production-state-runtime-job-receipts-route.test.ts'

requirePattern(spine, /RUNTIME_JOB_RECEIPTS_SETTINGS_KEY/, 'canonical settings key')
requirePattern(spine, /RuntimeJobReceiptKind[\s\S]*'dispatch'[\s\S]*'capability-probe'[\s\S]*'cost-meter'[\s\S]*'artifact'[\s\S]*'validation'[\s\S]*'teardown'[\s\S]*'rollback'/, 'full receipt kind matrix')
requirePattern(spine, /evaluateRuntimeJobReceiptCoverage/, 'coverage evaluator')
requirePattern(spine, /buildRuntimeJobReceiptInputsFromGovernedJob/, 'governed job receipt builder')
requirePattern(spine, /buildRuntimeJobReceiptInputsFromRenderEvidence/, 'render evidence receipt builder')
requirePattern(spine, /mergeRuntimeJobReceiptsIntoProductionState/, 'production state merge')
requirePattern(spine, /releaseReady:\s*false/, 'no fake release-ready claim')
requirePattern(spine, /Human release approval is required/, 'human approval release hold')

requirePattern(route, /requireAuth/, 'route auth guard')
requirePattern(route, /requireEntitlementsForUser/, 'entitlement guard')
requirePattern(route, /buildRuntimeJobReceiptState/, 'receipt builder')
requirePattern(route, /writeRuntimeJobReceiptStateToSettings/, 'settings persistence')
requirePattern(route, /mergeRuntimeJobReceiptsIntoProductionState/, 'production-state persistence')
requirePattern(route, /releaseReady:\s*false/, 'route release hold')

requirePattern(studioDispatchRoute, /buildRuntimeJobReceiptInputsFromGovernedJob/, 'Studio Local dispatch must auto-capture runtime receipts')
requirePattern(studioDispatchRoute, /writeRuntimeJobReceiptStateToSettings/, 'Studio Local dispatch must persist runtime receipts')
requirePattern(renderEvidenceRoute, /buildRuntimeJobReceiptInputsFromRenderEvidence/, 'render evidence must auto-capture runtime receipts')
requirePattern(renderEvidenceRoute, /writeRuntimeJobReceiptStateToSettings/, 'render evidence must persist runtime receipts')

requirePattern(unitTest, /requires dispatch, capability, cost, artifact, validation, and teardown receipts/, 'cloud job coverage regression')
requirePattern(unitTest, /keeping release held for human review/, 'human review regression')
requirePattern(unitTest, /persists receipt state in project settings/, 'settings persistence regression')
requirePattern(apiTest, /persists runtime job receipts into settings and production state/, 'route persistence regression')
requirePattern('__tests__/api/production-state-studio-local-cook-dispatch-route.test.ts', /receiptState\.summary\.totalReceipts/, 'Studio Local dispatch receipts regression')
requirePattern('__tests__/api/production-state-render-output-evidence-route.test.ts', /receiptState\.summary\.totalReceipts/, 'render evidence receipts regression')

requirePattern('package.json', /"qa:runtime-job-receipts"/, 'package script')
requirePattern(
  'package.json',
  /qa:governed-runtime-jobs && npm run qa:runtime-job-receipts && npm run qa:runtime-execution-evidence-package && npm run qa:asset-quality-job-runner/,
  'enterprise gate ordering',
)
requirePattern('scripts/check-backbone-market-readiness.mjs', /runtime-job-receipts\.ts/, 'backbone readiness coverage')
requirePattern('scripts/check-backbone-market-readiness.mjs', /qa:runtime-job-receipts/, 'backbone QA coverage')

if (failures.length) {
  console.error('[runtime-job-receipts] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-job-receipts] PASS receipts=dispatch-capability-cost-artifact-validation-teardown-rollback releaseHeld=true')
