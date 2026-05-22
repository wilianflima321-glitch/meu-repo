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

requirePattern('lib/production/game-asset-quality-pipeline.ts', /evaluateAssetFinalClaimReadiness/, 'asset final claim readiness gate')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /AI draft assets are never final/, 'raw AI draft must be blocked from final claims')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /Human art-direction approval is required/, 'human approval must be mandatory')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /LOD0\/LOD1\/LOD2\/LOD3 manifest/, 'LOD evidence must be part of final proof')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /viewport performance trace/, 'performance trace must be part of final proof')
requirePattern('__tests__/production/game-scope-and-asset-final-gates.test.ts', /evaluateAssetFinalClaimReadiness/, 'final gate tests must exist')
requirePattern('package.json', /qa:asset-final-evidence-gate/, 'package must expose qa:asset-final-evidence-gate')
requirePattern('package.json', /qa:enterprise-gate[^\n]+qa:asset-final-evidence-gate/, 'enterprise gate must include asset final evidence gate')

if (failures.length) {
  console.error('[asset-final-evidence-gate] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[asset-final-evidence-gate] PASS final asset claims require provenance, LOD/PBR/perf evidence, and human review')
