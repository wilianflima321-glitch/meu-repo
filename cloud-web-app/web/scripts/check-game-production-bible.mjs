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

const source = 'lib/production/game-production-bible.ts'

requirePattern(source, /export interface ProductionBibleSnapshot/, 'ProductionBibleSnapshot contract must exist')
requirePattern(source, /noWallOfText:\s*true/, 'production bible must stay compact for users')
requirePattern(source, /'story'[\s\S]*'world'[\s\S]*'characters'[\s\S]*'gameplay'[\s\S]*'art-direction'[\s\S]*'audio'[\s\S]*'playtest'[\s\S]*'release'/, 'core bible sections must be explicit')
requirePattern(source, /firstUserDecision/, 'bible must expose the next user decision')
requirePattern(source, /hiddenDepthCount/, 'bible must keep deep contracts off the primary UI')
requirePattern(source, /humanReviewRequired:\s*true/, 'human review must be mandatory')
requirePattern('lib/production/game-scope-orchestrator.ts', /productionBible:\s*ProductionBibleSnapshot/, 'GameScopePlan must include production bible')
requirePattern('lib/production/game-scope-orchestrator.ts', /buildGameProductionBible/, 'scope orchestrator must build the bible')
requirePattern('app/studio/StudioMissionControl.tsx', /productionBible\.pillars/, 'Studio must show compact bible pillars')
requirePattern('components/evidence/EvidenceCenter.tsx', /productionBible\.firstUserDecision/, 'Evidence Center must show first decision')
requirePattern('lib/ai-agent-system.ts', /Production bible:/, 'agent prompt must receive bible constraints')
requirePattern('docs/GAME_PRODUCTION_BIBLE_V22.md', /not as a wall of text/, 'docs must protect UX from text overload')

if (failures.length) {
  console.error('[game-production-bible] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-production-bible] PASS sections=8 no-wall-of-text=true')
