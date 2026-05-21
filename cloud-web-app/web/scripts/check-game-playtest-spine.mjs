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

requirePattern('lib/production/game-playtest-spine.ts', /export interface PlaytestScenarioContract/, 'scenario contract must exist')
requirePattern('lib/production/game-playtest-spine.ts', /export interface PlaytestSpinePlan/, 'playtest spine plan must exist')
requirePattern('lib/production/game-playtest-spine.ts', /botPath/, 'each scenario must have a bot path')
requirePattern('lib/production/game-playtest-spine.ts', /requiredEvidence/, 'playtest evidence must be explicit')
requirePattern('lib/production/game-playtest-spine.ts', /passCriteria/, 'pass criteria must be explicit')
requirePattern('lib/production/game-playtest-spine.ts', /failureSignals/, 'failure signals must be explicit')
requirePattern('lib/production/game-playtest-spine.ts', /humanReviewRequired:\s*true/, 'human review must be mandatory')
requirePattern('lib/production/game-playtest-spine.ts', /missingEvidence\.length > 0 \? 'held' : 'needs-review'/, 'playtest must not auto-ready')
requirePattern('lib/production/game-scope-orchestrator.ts', /playtestSpine:\s*PlaytestSpinePlan/, 'GameScopePlan must include playtest spine')
requirePattern('app/studio/StudioMissionControl.tsx', /playtestSpine\.scenarios/, 'Studio must surface playtest scenarios')
requirePattern('components/evidence/EvidenceCenter.tsx', /playtestSpine\.state/, 'Evidence Center must surface playtest state')
requirePattern('lib/ai-agent-system.ts', /Playtest spine:/, 'agent prompt must include playtest spine')
requirePattern('docs/GAME_PLAYTEST_SPINE_V22.md', /No playable\/demo\/final claim without playtest evidence/, 'docs must block fake playability claims')

if (failures.length) {
  console.error('[game-playtest-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-playtest-spine] PASS state=held-to-needs-review')
