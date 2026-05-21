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

requirePattern('lib/production/moba-vertical-slice-template.ts', /export interface PlayableVerticalSliceTemplate/, 'PlayableVerticalSliceTemplate must exist')
requirePattern('lib/production/moba-vertical-slice-template.ts', /genericScopePlan:\s*GameScopePlan/, 'template must delegate to the generic scope plan')
requirePattern('lib/production/moba-vertical-slice-template.ts', /notFullGameClaim:\s*true/, 'template must not claim a complete game')
requirePattern('lib/production/moba-vertical-slice-template.ts', /releaseState:\s*'held'/, 'release must be held')
requirePattern('lib/production/moba-vertical-slice-template.ts', /champions:\s*2/, 'vertical slice must scope to two champions')
requirePattern('lib/production/moba-vertical-slice-template.ts', /bot-playtest-graph/, 'bot playtest graph must be explicit')
requirePattern('lib/production/moba-vertical-slice-template.ts', /performance-graph/, 'performance graph must be explicit')
requirePattern('lib/production/moba-vertical-slice-template.ts', /human approval/, 'human approval must block release')
requirePattern('lib/production/moba-vertical-slice-template.ts', /one example preset, not the default product direction/, 'blocker must prevent making MOBA the product default')
requirePattern('lib/production/game-scope-orchestrator.ts', /buildMobaExampleScopePlan/, 'MOBA preset must be built from generic scope orchestrator')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /Example Presets/, 'docs must describe presets as examples')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /not a full game claim/, 'docs must avoid full-game promise')

if (failures.length) {
  console.error('[moba-vertical-slice-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[moba-vertical-slice-spine] PASS scope=2-champions release=held preset=example-only')
