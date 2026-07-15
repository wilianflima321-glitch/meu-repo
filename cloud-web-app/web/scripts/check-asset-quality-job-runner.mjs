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

const runner = 'lib/production/asset-quality-job-runner.ts'
const route = 'app/api/projects/[id]/production-state/asset-quality-job/route.ts'
const productionTest = '__tests__/production/asset-quality-job-runner.test.ts'
const apiTest = '__tests__/api/production-state-asset-quality-job-route.test.ts'

requirePattern(runner, /export interface AssetQualityJobRequest/, 'typed asset quality job request')
requirePattern(runner, /buildQualityOrchestrationPlan/, 'quality orchestrator integration')
requirePattern(runner, /buildQualityUpgradeJob/, 'governed quality job integration')
requirePattern(runner, /executionAllowed:\s*false/, 'planning-only execution contract')
requirePattern(runner, /separate approved Studio Local or Cloud queue action/, 'no heavy execution copy')
requirePattern(route, /coerceAssetQualityJobRequest/, 'route must coerce external payload')
requirePattern(route, /mergeGovernedRuntimeJobIntoProductionState/, 'route must persist into production state')
requirePattern(route, /executionAllowed:\s*false/, 'route must keep execution disabled')
requirePattern(route, /Invalid asset quality job request/, 'route must reject invalid requests')
requirePattern(productionTest, /planning-only governed quality job/, 'unit test must cover planning-only job')
requirePattern(apiTest, /persists asset quality upgrade jobs with planning-only execution and release hold/, 'API test must cover persistence and release hold')
requirePattern(apiTest, /rejects viewer collaborators/, 'API test must protect permissions')
requirePattern('package.json', /"qa:asset-quality-job-runner"/, 'package script')
requirePattern('package.json', /qa:asset-quality-job-runner/, 'enterprise gate inclusion')
requirePattern('scripts/check-backbone-market-readiness.mjs', /asset-quality-job-runner\.ts/, 'backbone gate runner coverage')

if (failures.length) {
  console.error('[asset-quality-job-runner] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[asset-quality-job-runner] PASS planningOnly=true assetQualityJobs=persisted releaseHold=true')
