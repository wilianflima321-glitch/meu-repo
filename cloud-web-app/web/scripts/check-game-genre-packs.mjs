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

const packFile = 'lib/production/game-genre-packs.ts'
const requiredGenres = ['moba', 'rpg', 'action-adventure', 'platformer', 'shooter', 'racing', 'puzzle', 'visual-novel', 'sandbox', 'strategy', 'custom']

requirePattern(packFile, /export interface GameGenrePack/, 'GameGenrePack contract must exist')
requirePattern(packFile, /cameraModel/, 'genre packs must define camera model')
requirePattern(packFile, /inputModel/, 'genre packs must define input model')
requirePattern(packFile, /coreLoop/, 'genre packs must define core loop')
requirePattern(packFile, /playtestScenarios/, 'genre packs must define playtest scenarios')
requirePattern(packFile, /performanceBudgets/, 'genre packs must define performance budgets')
requirePattern(packFile, /evidenceRefs/, 'genre packs must define evidence refs')
requirePattern(packFile, /getGameGenrePack/, 'genre pack lookup must exist')

for (const genre of requiredGenres) {
  requirePattern(packFile, new RegExp(`['"]?${genre}['"]?:\\s*\\{[\\s\\S]*?genre:\\s*'${genre}'`), `missing ${genre} pack`)
}

requirePattern('lib/production/game-scope-orchestrator.ts', /genrePack:\s*GameGenrePack/, 'GameScopePlan must include genrePack')
requirePattern('lib/production/game-scope-orchestrator.ts', /getGameGenrePack/, 'GameScopePlan must resolve genre pack')
requirePattern('app/studio/StudioGameScopeEvidencePanel.tsx', /genrePack\.cameraModel/, 'Studio must surface genre pack camera')
requirePattern('app/studio/StudioGameScopeEvidencePanel.tsx', /(genrePack\.playtestScenarios|playtestSpine\.scenarios)/, 'Studio must surface genre playtest scenarios')
const evidenceCenterSurface = `${read('components/evidence/EvidenceCenter.tsx')}\n${read('components/evidence/EvidenceCenter.parts.tsx')}`
if (!/genrePack\.coreLoop/.test(evidenceCenterSurface)) {
  failures.push('components/evidence/EvidenceCenter.tsx: missing Evidence Center must surface genre core loop')
}
requirePattern('lib/ai-agent-system.ts', /Genre pack: camera=/, 'agent prompt must receive genre pack constraints')
requirePattern('docs/GAME_GENRE_PACKS_V22.md', /Multi-genre support cannot be just a dropdown/, 'docs must explain genre pack purpose')

if (failures.length) {
  console.error('[game-genre-packs] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[game-genre-packs] PASS packs=${requiredGenres.length}`)
