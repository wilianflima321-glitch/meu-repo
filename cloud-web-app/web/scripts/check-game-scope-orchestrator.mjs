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

requirePattern('lib/production/game-scope-orchestrator.ts', /export type PlayableGameScope = 'prototype' \| 'demo' \| 'vertical-slice' \| 'complete-game-plan'/, 'prototype, demo, vertical-slice, and complete-game-plan scopes must be explicit')
requirePattern('lib/production/game-scope-orchestrator.ts', /export type PlayableGameGenre[\s\S]*'moba'[\s\S]*'rpg'[\s\S]*'action-adventure'[\s\S]*'platformer'[\s\S]*'shooter'[\s\S]*'racing'[\s\S]*'puzzle'[\s\S]*'visual-novel'[\s\S]*'sandbox'[\s\S]*'strategy'[\s\S]*'custom'/, 'genre support must be generic, not LoL-only')
requirePattern('lib/production/game-scope-orchestrator.ts', /'story-bible'[\s\S]*'world-bible'[\s\S]*'character-bible'[\s\S]*'gameplay-loop'[\s\S]*'visual-style-guide'[\s\S]*'audio-direction'[\s\S]*'playtest-plan'/, 'creative planning artifacts must precede generation')
requirePattern('lib/production/game-scope-orchestrator.ts', /complete-game-plan[\s\S]*production plan[\s\S]*does not claim the full game is finished/, 'complete-game-plan must avoid fake completion')
requirePattern('lib/production/game-scope-orchestrator.ts', /notFullGameClaim:\s*true/, 'all scope plans must reject autonomous full-game claims')
requirePattern('lib/production/game-scope-orchestrator.ts', /humanReviewRequired:\s*true/, 'human review must be mandatory')
requirePattern('lib/production/game-scope-orchestrator.ts', /buildQualityOrchestrationPlan/, 'scope plans must consume the quality orchestrator')
requirePattern('lib/production/game-scope-orchestrator.ts', /genrePack:\s*GameGenrePack/, 'scope plans must include genre pack')
requirePattern('lib/production/game-scope-orchestrator.ts', /buildMobaExampleScopePlan/, 'MOBA should be an example preset, not the whole system')
requirePattern('lib/production/moba-vertical-slice-template.ts', /genericScopePlan:\s*GameScopePlan/, 'legacy MOBA template must delegate to generic scope plan')
requirePattern('docs/GAME_SCOPE_ORCHESTRATOR_V22.md', /Users should decide the ambition level/, 'docs must center user scope choice')
requirePattern('docs/GAME_SCOPE_ORCHESTRATOR_V22.md', /MOBA \/ LoL-like preset remains useful as an example/, 'docs must state LoL-like is only an example')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /Users choose the production depth first: `prototype`, `demo`, `vertical-slice`, or `complete-game-plan`/, 'AI quality docs must reference generic scope choice')

if (failures.length) {
  console.error('[game-scope-orchestrator] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-scope-orchestrator] PASS scopes=4 genres=11 moba=example-only')
