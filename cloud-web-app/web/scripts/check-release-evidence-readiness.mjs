#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relPath) {
  const abs = path.resolve(ROOT, relPath)
  if (!fs.existsSync(abs)) {
    failures.push(`missing file: ${relPath}`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function requirePattern(relPath, pattern, label) {
  const content = read(relPath)
  if (!pattern.test(content)) failures.push(`${relPath}: missing ${label}`)
}

function requireToken(relPath, token, label = token) {
  const content = read(relPath)
  if (!content.includes(token)) failures.push(`${relPath}: missing ${label}`)
}

requireToken(
  'lib/production/release-evidence-readiness.ts',
  'AETHEL_RELEASE_EVIDENCE_READINESS',
  'canonical release evidence readiness capability',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /ReleaseEvidenceReadinessLaneId[\s\S]*'production-state'[\s\S]*'evidence-coverage'[\s\S]*'runtime-receipts'[\s\S]*'asset-final'[\s\S]*'playtest'[\s\S]*'human-approval'/,
  'all release evidence readiness lanes',
)
requireToken(
  'lib/production/release-evidence-readiness.ts',
  'buildReleaseEvidenceReadinessSnapshot',
  'snapshot builder',
)
requireToken(
  'lib/production/release-evidence-readiness.ts',
  'buildReleaseEvidencePackageManifest',
  'exportable evidence manifest builder',
)
requireToken(
  'lib/production/release-evidence-readiness.ts',
  'verifyReleaseEvidencePackageManifest',
  'exportable evidence manifest verifier',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /integrityHash[\s\S]*fnv1a/,
  'deterministic manifest integrity hash',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /Manifest integrity hash does not match package contents/,
  'manifest tamper detection',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /manualPublishRequired:\s*true/,
  'manifest manual publish contract',
)
requireToken(
  'lib/production/release-evidence-readiness.ts',
  'mergeReleaseEvidenceReviewRequestIntoProductionState',
  'governed review request state merge',
)
requireToken(
  'lib/production/release-evidence-readiness.ts',
  'mergeReleaseEvidenceReviewDecisionIntoProductionState',
  'governed review decision state merge',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /no automatic publish occurs/,
  'no automatic publish contract',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /human-approval:release-evidence/,
  'human approval evidence ref contract',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /releaseReady:\s*false/,
  'explicit no auto-release contract',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /humanApprovalRequired:\s*true/,
  'human approval contract',
)
requirePattern(
  'lib/production/release-evidence-readiness.ts',
  /RuntimeJobReceiptState/,
  'runtime receipt input',
)
requirePattern(
  'lib/production/release-evidence-readiness.rules.ts',
  /ASSET_FINAL_EVIDENCE_GROUPS[\s\S]*provenance[\s\S]*LOD[\s\S]*collision[\s\S]*performance[-_ \]?trace[\s\S]*human art-direction approval/,
  'final asset evidence groups',
)
requirePattern(
  'lib/production/release-evidence-readiness.rules.ts',
  /PLAYTEST_EVIDENCE_GROUPS[\s\S]*playtest[\s\S]*input replay[\s\S]*performance trace[\s\S]*bug\/blocker ledger/,
  'playtest evidence groups',
)

requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /requireAuth\(request\)/,
  'route auth guard',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /requireEntitlementsForUser\(user\.userId\)/,
  'route entitlement guard',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /buildEvidenceRefCoverageReport/,
  'evidence coverage integration',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /readRuntimeJobReceiptStateFromSettings/,
  'runtime receipt settings integration',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /releaseReady:\s*false/,
  'route release hold',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /packageManifest/,
  'route manifest payload',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /packageManifestVerification/,
  'route manifest verification payload',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /export async function POST/,
  'governed review request mutation',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /canWriteReleaseEvidenceReadiness/,
  'write access guard',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /prisma\.project\.update/,
  'persisted review request',
)
requirePattern(
  'app/api/projects/[id]/production-state/release-evidence-readiness/route.ts',
  /record-human-approval[\s\S]*reject-human-review/,
  'governed review decision actions',
)

requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'canRequestHumanReview',
  'unit coverage for human review request path',
)
requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'deterministic exportable manifest',
  'unit coverage for exportable manifest',
)
requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'detects tampered release evidence manifests',
  'unit coverage for tamper detection',
)
requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'records human approval evidence without automatic publishing',
  'unit coverage for human approval decision path',
)
requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'asset-final',
  'unit coverage for asset final lane',
)
requireToken(
  '__tests__/production/release-evidence-readiness.test.ts',
  'playtest',
  'unit coverage for playtest lane',
)
requireToken(
  '__tests__/api/production-state-release-evidence-readiness-route.test.ts',
  'AETHEL_RELEASE_EVIDENCE_READINESS',
  'API route regression',
)
requireToken(
  '__tests__/api/production-state-release-evidence-readiness-route.test.ts',
  'persists a governed review request',
  'API route review request regression',
)
requireToken(
  '__tests__/api/production-state-release-evidence-readiness-route.test.ts',
  'persists human approval evidence without returning release-ready',
  'API route approval decision regression',
)

requireToken('package.json', 'qa:release-evidence-readiness', 'package script')
requireToken('scripts/check-backbone-market-readiness.mjs', 'AETHEL_RELEASE_EVIDENCE_READINESS', 'backbone readiness token')
requireToken(
  'components/evidence/EvidenceCenter.tsx',
  '/production-state/release-evidence-readiness',
  'Evidence Center release readiness fetch',
)
const evidenceCenterSurface = `${read('components/evidence/EvidenceCenter.tsx')}\n${read('components/evidence/EvidenceCenter.parts.tsx')}`
for (const [token, label] of [
  ['data-evidence-source="release-evidence-readiness"', 'Evidence Center release readiness surface'],
  ['Request review', 'Evidence Center governed review request action'],
  ['Export manifest', 'Evidence Center manifest export action'],
  ['Integrity verified', 'Evidence Center manifest verification state'],
  ['data-evidence-source="release-evidence-package-manifest"', 'Evidence Center manifest surface'],
  ['Record approval', 'Evidence Center governed approval action'],
  ['Reject package', 'Evidence Center governed rejection action'],
]) {
  if (!evidenceCenterSurface.includes(token)) failures.push(`components/evidence/EvidenceCenter.tsx: missing ${label}`)
}

if (failures.length > 0) {
  console.error('[release-evidence-readiness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[release-evidence-readiness] PASS')
