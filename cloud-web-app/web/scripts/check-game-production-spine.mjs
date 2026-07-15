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

requirePattern(
  'lib/production/game-production-spine.ts',
  /noAutonomousAaaClaim:\s*true/,
  'hard block against autonomous AAA claims'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /browserRole:\s*'responsive-preview-and-review'/,
  'browser must remain preview/review for premium game production'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /heavyWorkPolicy:\s*'sidecar-or-cloud-only'/,
  'heavy game work must route to sidecar or cloud'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /'playtest-validation-graph'/,
  'playtest validation graph must be explicit'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /'performance-graph'/,
  'performance graph must be explicit'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /'cinematic-evidence-graph'/,
  'cinematic evidence graph must be explicit'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /asset license\/provenance/,
  'asset provenance must be required'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /playtest replay/,
  'playtest replay must be required before release'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /Draft videos are not final/,
  'AI video drafts must be blocked from final footage claims'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /human approval/,
  'human approval must be part of release readiness'
)
requirePattern(
  'lib/production/game-production-spine.ts',
  /mergeGameProductionSpineIntoProductionState/,
  'contract must merge into Project Brain / production graphs'
)
requirePattern(
  'app/api/projects/[id]/production-state/game-spine/route.ts',
  /mergeGameProductionSpineIntoProductionState/,
  'agents need an API route to persist the game production spine'
)
requirePattern(
  'app/api/projects/[id]/production-state/game-spine/route.ts',
  /collectApprovedEvidenceRefs/,
  'route readiness must not count placeholder required evidence as approved evidence'
)
requirePattern(
  'app/api/projects/[id]/production-state/game-spine/route.ts',
  /Forbidden/,
  'route must enforce write permissions before mutating Project Brain'
)
requirePattern(
  'lib/production/game-playtest-evidence.ts',
  /humanFeelReviewOk/,
  'playtest evidence must include human feel review, not only automated metrics'
)
requirePattern(
  'lib/production/game-playtest-evidence.ts',
  /performance-trace/,
  'playtest evidence must require performance traces'
)
requirePattern(
  'lib/production/game-playtest-evidence.ts',
  /bug-report/,
  'playtest evidence must require bug ledger artifacts'
)
requirePattern(
  'app/api/projects/[id]/production-state/game-spine/playtest/route.ts',
  /Playtest artifact does not belong to this project/,
  'playtest route must validate internal artifact ownership'
)
requirePattern(
  'app/api/projects/[id]/production-state/game-spine/playtest/route.ts',
  /releaseReady:\s*false/,
  'playtest evidence must never auto-release games'
)
requirePattern(
  '__tests__/production/game-production-spine.test.ts',
  /holds readiness until every graph has evidence/,
  'readiness tests must prevent fake done status'
)
requirePattern(
  '__tests__/production/game-playtest-evidence.test.ts',
  /never release-ready/,
  'playtest tests must prove human-held release behavior'
)
requirePattern(
  '__tests__/api/production-state-game-playtest-route.test.ts',
  /rejects internal playtest artifacts from another project/,
  'API tests must cover playtest artifact ownership'
)
requirePattern(
  '__tests__/api/production-state-game-spine-route.test.ts',
  /keeps release blocked/,
  'API tests must prove the route persists without fake release readiness'
)
requirePattern(
  '__tests__/production/game-production-spine.test.ts',
  /does not promise full autonomous AAA production/,
  'tests must encode honest product positioning'
)

if (failures.length) {
  console.error('[game-production-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-production-spine] PASS graphs=13 release=human-held heavyWork=sidecar-or-cloud')
