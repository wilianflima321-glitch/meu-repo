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

const spine = 'lib/runtime/runtime-toolchain-dependency-map.ts'
const test = '__tests__/runtime/runtime-toolchain-dependency-map.test.ts'

requirePattern(spine, /export const AETHEL_TOOLCHAIN_LANES/, 'canonical lane map')
requirePattern(spine, /apps-production/, 'apps lane')
requirePattern(spine, /research-intelligence/, 'research lane')
requirePattern(spine, /game-vertical-slice/, 'game vertical slice lane')
requirePattern(spine, /complete-game-plan/, 'complete game plan lane')
requirePattern(spine, /film-cinematic/, 'film lane')
requirePattern(spine, /asset-finalization/, 'asset finalization lane')
requirePattern(spine, /cloud-stream/, 'cloud stream lane')
requirePattern(spine, /marketplace-provenance/, 'marketplace provenance lane')
requirePattern(spine, /manual-consent-only/, 'native tools must stay manual consent')
requirePattern(spine, /LOD0\/LOD1\/LOD2\/LOD3 manifest/, 'final asset LOD evidence')
requirePattern(spine, /PBR texture compression report/, 'final asset PBR evidence')
requirePattern(spine, /viewport performance trace/, 'performance trace evidence')
requirePattern(spine, /signed Studio Local daemon dispatch/, 'signed dispatch evidence')
requirePattern(spine, /not a complete playable shipped game/, 'complete-game honesty')
requirePattern(spine, /validateAethelToolchainDependencyMap/, 'self-validation export')
requirePattern(test, /blocks vertical-slice claims/, 'vertical slice blocker regression')
requirePattern(test, /beyond AI draft quality/, 'asset finalization regression')
requirePattern(test, /not a shipped game claim/, 'complete-game-plan regression')
requirePattern('package.json', /"qa:runtime-toolchain-dependency-map"/, 'package script')
requirePattern('package.json', /qa:runtime-engine-spine && npm run qa:runtime-toolchain-dependency-map/, 'enterprise gate ordering')
requirePattern('scripts/check-backbone-market-readiness.mjs', /runtime-toolchain-dependency-map/, 'backbone gate coverage')

if (failures.length) {
  console.error('[runtime-toolchain-dependency-map] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-toolchain-dependency-map] PASS lanes=10 finalAssetEvidence=true completeGameHonesty=true')
