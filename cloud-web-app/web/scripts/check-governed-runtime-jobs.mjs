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

const spine = 'lib/production/governed-runtime-jobs.ts'
const route = 'app/api/projects/[id]/production-state/governed-job/route.ts'

requirePattern(spine, /export interface QualityUpgradeJob/, 'QualityUpgradeJob contract')
requirePattern(spine, /export interface RuntimeJobRequest/, 'RuntimeJobRequest contract')
requirePattern(spine, /export type GovernedRuntimeJobState[\s\S]*'held'[\s\S]*'blocked'[\s\S]*'needs-review'/, 'honest held/blocked/review states')
requirePattern(spine, /humanReviewRequired:\s*true/g, 'human review hard gate')
requirePattern(spine, /executionAllowed:\s*false/g, 'quality upgrade planning must not auto-execute')
requirePattern(spine, /rollbackPlan/g, 'rollback plan field')
requirePattern(spine, /requiredEvidence/g, 'required evidence field')
requirePattern(spine, /evidenceRefs/g, 'evidence refs field')
requirePattern(spine, /requiredCapabilities/g, 'runtime capability field')
requirePattern(spine, /mergeGovernedRuntimeJobIntoProductionState/, 'production-state merge function')
requirePattern(spine, /Do not auto-publish governed runtime output/, 'release hold copy')
requirePattern(spine, /Human review required before final\/public claims/, 'final claims human review copy')
requirePattern(route, /coerceGovernedRuntimeJob/, 'route must coerce governed job')
requirePattern(route, /mergeGovernedRuntimeJobIntoProductionState/, 'route must persist governed job into production state')
requirePattern(route, /executionAllowed:\s*false/g, 'route must force planning-only persistence')
requirePattern(route, /Heavy execution requires a separate approved queue action/, 'route must not pretend queue execution happened')
requirePattern('package.json', /"qa:governed-runtime-jobs"/, 'package script')
requirePattern('package.json', /qa:governed-runtime-jobs/, 'enterprise gate inclusion')
requirePattern('scripts/check-backbone-market-readiness.mjs', /governed-runtime-jobs\.ts/, 'backbone market gate coverage')

if (failures.length) {
  console.error('[governed-runtime-jobs] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[governed-runtime-jobs] PASS planningOnly=true humanReview=true releaseHold=true')
