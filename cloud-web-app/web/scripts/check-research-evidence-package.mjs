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

const packageFile = 'lib/research/research-evidence-package.ts'
const routeFile = 'app/api/projects/[id]/production-state/research-intelligence/route.ts'
const packageJson = JSON.parse(read('package.json'))

requireToken(packageFile, 'AETHEL_RESEARCH_EVIDENCE_PACKAGE', 'capability marker')
requireToken(packageFile, 'buildResearchEvidencePackage', 'package builder')
requireToken(packageFile, 'verifyResearchEvidencePackage', 'package verifier')
requireToken(packageFile, 'buildResearchRuntimeSpinePlan', 'runtime spine integration')
requireToken(packageFile, 'validateResearchRuntimeSpinePlan', 'runtime spine validation')
requireToken(packageFile, 'sourceReceiptCount', 'source receipt count')
requireToken(packageFile, 'browserReplayReceiptCount', 'browser replay receipt count')
requireToken(packageFile, 'takeoverControlsRequired: true', 'takeover controls required')
requireToken(packageFile, 'researchVerified: false', 'research verification hold')
requireToken(packageFile, 'finalAnswerReleaseReady: false', 'final answer release hold')
requireToken(packageFile, 'humanApprovalRequired: true', 'human approval required')
requireToken(packageFile, 'manualPublishRequired: true', 'manual publish required')
requireToken(packageFile, 'Research delivery cannot be marked verified automatically.', 'no fake verified blocker')
requireToken(packageFile, 'Research evidence package cannot set researchVerified=true.', 'research verified verifier guard')
requireToken(packageFile, 'Required browser replay receipts are missing.', 'browser replay verifier guard')
requirePattern(packageFile, /prohibitedClaims:[\s\S]*'research verified'[\s\S]*'final answer approved'[\s\S]*'Manus-grade verified'[\s\S]*'autonomous web navigation complete'[\s\S]*'production ready'/, 'prohibited research claim matrix')

requireToken(routeFile, 'buildResearchEvidencePackage', 'route evidence package builder')
requireToken(routeFile, 'verifyResearchEvidencePackage', 'route evidence package verifier')
requireToken(routeFile, 'researchEvidencePackageGenerated', 'route generated flag')
requireToken(routeFile, 'researchVerified: false', 'route research verification hold')
requireToken(routeFile, 'finalAnswerReleaseReady: false', 'route final answer release hold')
requireToken(routeFile, 'artifactRefs', 'route artifact inputs')
requireToken(routeFile, 'costEstimateUsd', 'route cost input')
requireToken(routeFile, 'humanReviewed', 'route human review input')

if (packageJson.scripts?.['qa:research-evidence-package'] !== 'node scripts/check-research-evidence-package.mjs') {
  failures.push('package.json: missing qa:research-evidence-package script')
}
if (!packageJson.scripts?.['qa:internal-runtime-priority-gate']?.includes('qa:research-evidence-package')) {
  failures.push('package.json: qa:internal-runtime-priority-gate must include qa:research-evidence-package')
}
if (!packageJson.scripts?.['qa:enterprise-gate']?.includes('qa:research-evidence-package')) {
  failures.push('package.json: qa:enterprise-gate must include qa:research-evidence-package')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'RESEARCH_EVIDENCE_PACKAGE.md'),
  `# Research Evidence Package\n\n- Capability: AETHEL_RESEARCH_EVIDENCE_PACKAGE\n- Sources: required\n- Browser replay: required when live navigation is claimed\n- Artifacts: required before final answer delivery\n- Cost: required\n- Human approval: required\n- Failures: ${failures.length}\n`,
)

if (failures.length > 0) {
  console.error('[research-evidence-package] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[research-evidence-package] PASS sources=true replayGoverned=true finalHeld=true')
