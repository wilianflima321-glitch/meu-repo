#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const packageFile = 'lib/production/runtime-execution-evidence-package.ts'
const routeFile = 'app/api/projects/[id]/production-state/runtime-execution-evidence-package/route.ts'
const receiptsRouteFile = 'app/api/projects/[id]/production-state/runtime-job-receipts/route.ts'
const packageJson = JSON.parse(read('package.json'))

requireToken(packageFile, 'AETHEL_RUNTIME_EXECUTION_EVIDENCE_PACKAGE', 'capability marker')
requireToken(packageFile, 'buildRuntimeExecutionEvidencePackage', 'package builder')
requireToken(packageFile, 'verifyRuntimeExecutionEvidencePackage', 'package verifier')
requireToken(packageFile, 'evaluateRuntimeJobReceiptCoverage', 'runtime receipt coverage')
requireToken(packageFile, 'buildReleaseEvidenceReadinessSnapshot', 'release readiness snapshot')
requireToken(packageFile, 'buildReleaseEvidencePackageManifest', 'release manifest builder')
requireToken(packageFile, 'verifyReleaseEvidencePackageManifest', 'release manifest verification')
requireToken(packageFile, 'RuntimeResilienceLedger', 'runtime resilience ledger type')
requireToken(packageFile, 'validateRuntimeResilienceLedger', 'runtime resilience ledger verifier')
requireToken(packageFile, 'resilienceLedgerVerification', 'runtime resilience ledger verification')
requireToken(packageFile, 'RuntimeFailureSmokePackState', 'runtime failure smoke state type')
requireToken(packageFile, 'failureSmokePackState', 'runtime failure smoke state on evidence package')
requireToken(packageFile, 'RuntimeFailureSmokeBrowserRunnerState', 'runtime failure smoke browser runner state type')
requireToken(packageFile, 'failureSmokeBrowserRunnerState', 'runtime failure smoke browser runner state on evidence package')
requireToken(packageFile, 'V29SidecarLifecycleReport', 'V29 sidecar lifecycle report type')
requireToken(packageFile, 'sidecarLifecycleReport', 'V29 sidecar lifecycle report on evidence package')
requireToken(packageFile, 'V29SidecarInstallManifest', 'V29 sidecar install manifest type')
requireToken(packageFile, 'sidecarInstallManifest', 'V29 sidecar install manifest on evidence package')
requireToken(packageFile, 'releaseReady: false', 'release must stay false')
requireToken(packageFile, 'humanApprovalRequired: true', 'human approval required')
requireToken(packageFile, 'manualPublishRequired: true', 'manual publish required')
requireToken(packageFile, 'Runtime execution package cannot set releaseReady=true.', 'releaseReady verifier guard')
requireToken(packageFile, 'Runtime execution package must require manual publish.', 'manual publish verifier guard')
requireToken(packageFile, 'Runtime execution package must require human approval.', 'human approval verifier guard')
requireToken(routeFile, 'RUNTIME_EXECUTION_EVIDENCE_PACKAGE_CAPABILITY', 'route capability marker')
requireToken(routeFile, 'requireAuth', 'route auth guard')
requireToken(routeFile, 'requireEntitlementsForUser', 'route entitlement guard')
requireToken(routeFile, 'coerceGovernedRuntimeJob', 'route governed job coercion')
requireToken(routeFile, 'readRuntimeJobReceiptStateFromSettings', 'route receipt state read')
requireToken(routeFile, 'readRuntimeFailureSmokePackStateFromSettings', 'route smoke state read')
requireToken(routeFile, 'readRuntimeFailureSmokeBrowserRunnerStateFromSettings', 'route browser runner state read')
requireToken(routeFile, 'runtime-failure-smoke-browser-runner-report', 'route browser runner mode')
requireToken(routeFile, 'readV29SidecarLifecycleReportFromSettings', 'route sidecar lifecycle read')
requireToken(routeFile, 'writeV29SidecarLifecycleReportToSettings', 'route sidecar lifecycle write')
requireToken(routeFile, 'v29-sidecar-lifecycle-report', 'route sidecar lifecycle mode')
requireToken(routeFile, 'readV29SidecarInstallManifestFromSettings', 'route sidecar install read')
requireToken(routeFile, 'writeV29SidecarInstallManifestToSettings', 'route sidecar install write')
requireToken(routeFile, 'v29-sidecar-install-manifest', 'route sidecar install mode')
requireToken(routeFile, 'buildRuntimeExecutionEvidencePackage', 'route evidence package builder')
requireToken(routeFile, 'verifyRuntimeExecutionEvidencePackage', 'route evidence package verifier')
requireToken(routeFile, 'manualPublishRequired: true', 'route manual publish hold')
requireToken(routeFile, 'x-aethel-release-ready', 'route release-ready header')
requireToken(routeFile, 'Runtime execution evidence was packaged for review.', 'route human review note')
requireToken(receiptsRouteFile, 'buildRuntimeExecutionEvidencePackage', 'receipts route evidence package builder')
requireToken(receiptsRouteFile, 'verifyRuntimeExecutionEvidencePackage', 'receipts route evidence package verifier')
requireToken(receiptsRouteFile, 'runtimeExecutionEvidencePackageGenerated', 'receipts route generated flag')
requireToken(receiptsRouteFile, 'evidencePackageVerification', 'receipts route verification payload')
requireToken(receiptsRouteFile, 'releaseReady: false', 'receipts route release hold')
requireToken(receiptsRouteFile, 'failureSmokeBrowserRunnerState', 'receipts route browser runner state')
requireToken(receiptsRouteFile, 'readV29SidecarLifecycleReportFromSettings', 'receipts route sidecar lifecycle read')
requireToken(receiptsRouteFile, 'readV29SidecarInstallManifestFromSettings', 'receipts route sidecar install read')

const requiredEvidenceTokens = [
  'runtime-job:',
  'release-manifest:',
  'release-manifest-integrity:',
  'runtime-resilience-ledger:',
  'runtime-failure-smoke-pack-state:',
  'runtime-failure-smoke-browser-runner-state:',
  'sidecar-lifecycle-report:',
  'sidecar-install-manifest:',
  'Runtime failure smoke pack state is missing from the evidence package.',
  'Runtime failure smoke browser runner state is missing from the evidence package.',
  'Runtime execution package must include failure smoke browser runner state.',
  'Runtime failure smoke browser runner receipts are incomplete.',
  'Sidecar lifecycle report is missing from the evidence package.',
  'Sidecar install manifest is missing from the evidence package.',
  'Runtime execution package must include sidecar lifecycle report.',
  'Runtime execution package must include sidecar install manifest.',
  'Runtime resilience ledger is missing from the evidence package.',
  'Runtime resilience ledger still blocks stronger reliability claims.',
  'receiptCoverage.missingKinds',
  'manifestVerification.errors',
  'Governed runtime job execution was not allowed',
  'Human release approval is required before final/public claims.',
]

for (const token of requiredEvidenceTokens) {
  requireToken(packageFile, token, `evidence package token: ${token}`)
}

requirePattern(packageFile, /prohibitedClaims:[\s\S]*'final'[\s\S]*'production ready'[\s\S]*'AAA pronto'[\s\S]*'Unreal-grade'[\s\S]*'automatic publish'[\s\S]*'releaseReady=true'[\s\S]*'research verified'[\s\S]*'desktop ready'[\s\S]*'native renderer ready'[\s\S]*'signed installer'[\s\S]*'public download ready'[\s\S]*'cloud render available'/, 'prohibited claim matrix')

if (packageJson.scripts?.['qa:runtime-execution-evidence-package'] !== 'node scripts/check-runtime-execution-evidence-package.mjs') {
  failures.push('package.json: missing qa:runtime-execution-evidence-package script')
}
if (!packageJson.scripts?.['qa:internal-runtime-priority-gate']?.includes('qa:runtime-execution-evidence-package')) {
  failures.push('package.json: qa:internal-runtime-priority-gate must include qa:runtime-execution-evidence-package')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'RUNTIME_EXECUTION_EVIDENCE_PACKAGE.md'),
  `# Runtime Execution Evidence Package

- Capability: AETHEL_RUNTIME_EXECUTION_EVIDENCE_PACKAGE
- Runtime receipt coverage: required
- Release manifest verification: required
- Runtime resilience ledger: required
- Runtime failure smoke pack state: required
- Runtime failure smoke browser runner state: required
- Sidecar lifecycle report: required
- Sidecar install manifest: required
- API route: required
- Human approval: required
- Manual publish: required
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[runtime-execution-evidence-package] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-execution-evidence-package] PASS receipts=true manifest=true resilience=true smokeState=true browserRunner=true sidecars=true releaseHeld=true')
