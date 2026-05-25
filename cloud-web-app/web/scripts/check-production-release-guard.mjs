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

const spine = 'lib/production/agentic-production-state.ts'
const productionTest = '__tests__/production/agentic-production-state.test.ts'
const apiTest = '__tests__/api/production-state-route.test.ts'

requirePattern(spine, /export function enforceProductionReleaseGuard/, 'canonical release guard export')
requirePattern(spine, /releaseApprovalEvidencePatterns/, 'explicit approval evidence patterns')
requirePattern(spine, /Human release approval evidence is required before release can be marked ready\./, 'release approval blocker copy')
requirePattern(spine, /requiresHumanApproval:\s*releaseApproved \? state\.runtimePolicy\.requiresHumanApproval : true/, 'hard human approval fallback')
requirePattern(spine, /const guardedState = enforceProductionReleaseGuard\(state\)/, 'readiness summary must re-guard state')
requirePattern(productionTest, /guards release readiness from patches that lack human approval evidence/, 'production-state unit regression')
requirePattern(productionTest, /allows release readiness only with explicit human approval evidence/, 'approval evidence positive case')
requirePattern(apiTest, /cannot bypass release approval through the production-state patch route/, 'API bypass regression')
requirePattern(apiTest, /payload\.state\.runtimePolicy\.requiresHumanApproval\)\.toBe\(true\)/, 'API must force human review')
requirePattern('package.json', /"qa:production-release-guard"/, 'package script')
requirePattern('package.json', /qa:governed-runtime-jobs && npm run qa:asset-quality-job-runner && npm run qa:studio-local-cook-queue && npm run qa:studio-local-cook-dispatch && npm run qa:production-release-guard && npm run qa:runtime-engine-spine/, 'enterprise gate ordering')
requirePattern('scripts/check-backbone-market-readiness.mjs', /enforceProductionReleaseGuard/, 'backbone gate release guard coverage')

if (failures.length) {
  console.error('[production-release-guard] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[production-release-guard] PASS humanReleaseApproval=true bypassGuarded=true')
