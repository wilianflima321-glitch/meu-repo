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

requirePattern('app/studio/StudioMissionControl.tsx', /buildGameScopePlan/, 'Studio Mission Control must consume the game scope orchestrator')
requirePattern('app/studio/StudioMissionControl.tsx', /GAME_SCOPE_OPTIONS[\s\S]*prototype[\s\S]*demo[\s\S]*complete-game-plan/, 'Studio must expose prototype/demo/full-plan choice')
requirePattern('app/studio/StudioMissionControl.tsx', /GAME_GENRE_OPTIONS[\s\S]*rpg[\s\S]*action-adventure[\s\S]*moba[\s\S]*strategy[\s\S]*custom/, 'Studio must expose multiple genres, not one LoL path')
requirePattern('app/studio/StudioMissionControl.tsx', /Game scope:/, 'Studio must show a compact scope plan without hiding it in backend-only state')
requirePattern('app/studio/StudioMissionControl.tsx', /story-world-character bible|story\/world\/character bible|Production scope|creativeArtifacts/, 'Studio must signal creative planning before heavy generation')
requirePattern('app/studio/StudioMissionControl.tsx', /genrePack\.cameraModel/, 'Studio must show genre-specific camera/input contract')
requirePattern('app/studio/StudioMissionControl.tsx', /(genrePack\.playtestScenarios|playtestSpine\.scenarios)/, 'Studio must show genre-specific playtest contract')

requirePattern('components/evidence/EvidenceCenter.tsx', /buildGameScopePlan/, 'Evidence Center must read the generic scope plan')
requirePattern('components/evidence/EvidenceCenter.tsx', /Production Bible preview/, 'Evidence Center must expose production bible evidence')
requirePattern('components/evidence/EvidenceCenter.tsx', /productionGraphs\.slice/, 'Evidence Center must render graph-level production planning')
requirePattern('components/evidence/EvidenceCenter.tsx', /genrePack\.coreLoop/, 'Evidence Center must expose genre core loop')

const agentSystem = read('lib/ai-agent-system.ts')
if (/Create a complete game:/.test(agentSystem)) {
  failures.push('lib/ai-agent-system.ts: legacy complete-game prompt is still present')
}
requirePattern('lib/ai-agent-system.ts', /buildGameScopePlan/, 'createGame must route through GameScopePlan')
requirePattern('lib/ai-agent-system.ts', /Genre pack: camera=/, 'createGame prompt must pass genre constraints to agents')
requirePattern('lib/ai-agent-system.ts', /Do not claim the game is finished/, 'createGame prompt must block fake finished-game claims')
requirePattern('package.json', /qa:game-scope-product-wiring/, 'package must expose qa:game-scope-product-wiring')

if (failures.length) {
  console.error('[game-scope-product-wiring] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-scope-product-wiring] PASS studio=evidence=agent-system')
