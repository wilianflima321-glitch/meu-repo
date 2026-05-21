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
requirePattern('lib/production/moba-vertical-slice-template.ts', /notFullGameClaim:\s*true/, 'template must not claim a complete game')
requirePattern('lib/production/moba-vertical-slice-template.ts', /releaseState:\s*'held'/, 'release must be held')
requirePattern('lib/production/moba-vertical-slice-template.ts', /champions:\s*2/, 'vertical slice must scope to two champions')
requirePattern('lib/production/moba-vertical-slice-template.ts', /bot-playtest-graph/, 'bot playtest graph must be explicit')
requirePattern('lib/production/moba-vertical-slice-template.ts', /performance-graph/, 'performance graph must be explicit')
requirePattern('lib/production/moba-vertical-slice-template.ts', /human approval/, 'human approval must block release')
requirePattern('lib/production/moba-vertical-slice-template.ts', /This is a vertical slice, not a complete MOBA game/, 'blocker must prevent full game claim')
requirePattern('lib/production/moba-vertical-slice-template.ts', /buildQualityOrchestrationPlan/, 'template must consume quality orchestrator')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /MOBA \/ LoL-like Vertical Slice/, 'docs must describe LoL-like vertical slice')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /not a full game claim/, 'docs must avoid full-game promise')

if (failures.length) {
  console.error('[moba-vertical-slice-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[moba-vertical-slice-spine] PASS scope=2-champions release=held')