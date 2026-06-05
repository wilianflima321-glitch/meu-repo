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
const packageJson = JSON.parse(read('package.json'))

requireToken(packageFile, 'AETHEL_RUNTIME_EXECUTION_EVIDENCE_PACKAGE', 'capability marker')
requireToken(packageFile, 'buildRuntimeExecutionEvidencePackage', 'package builder')
requireToken(packageFile, 'verifyRuntimeExecutionEvidencePackage', 'package verifier')
requireToken(packageFile, 'evaluateRuntimeJobReceiptCoverage', 'runtime receipt coverage')
requireToken(packageFile, 'buildReleaseEvidenceReadinessSnapshot', 'release readiness snapshot')
requireToken(packageFile, 'buildReleaseEvidencePackageManifest', 'release manifest builder')
requireToken(packageFile, 'verifyReleaseEvidencePackageManifest', 'release manifest verification')
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
requireToken(routeFile, 'buildRuntimeExecutionEvidencePackage', 'route evidence package builder')
requireToken(routeFile, 'verifyRuntimeExecutionEvidencePackage', 'route evidence package verifier')
requireToken(routeFile, 'manualPublishRequired: true', 'route manual publish hold')
requireToken(routeFile, 'x-aethel-release-ready', 'route release-ready header')
requireToken(routeFile, 'Runtime execution evidence was packaged for review.', 'route human review note')

const requiredEvidenceTokens = [
  'runtime-job:',
  'release-manifest:',
  'release-manifest-integrity:',
  'receiptCoverage.missingKinds',
  'manifestVerification.errors',
  'Governed runtime job execution was not allowed',
  'Human release approval is required before final/public claims.',
]

for (const token of requiredEvidenceTokens) {
  requireToken(packageFile, token, `evidence package token: ${token}`)
}

requirePattern(packageFile, /prohibitedClaims:[\s\S]*'final'[\s\S]*'production ready'[\s\S]*'AAA pronto'[\s\S]*'Unreal-grade'[\s\S]*'automatic publish'[\s\S]*'releaseReady=true'/, 'prohibited claim matrix')

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

console.log('[runtime-execution-evidence-package] PASS receipts=true manifest=true releaseHeld=true')
