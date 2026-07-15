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

const source = 'lib/production/deep-game-production-bible.ts'

requirePattern(source, /export interface DeepProductionBible/, 'DeepProductionBible contract must exist')
requirePattern(source, /export interface DeepSceneBeat/, 'deep scene beats must be modeled')
requirePattern(source, /export interface DeepCharacterContract/, 'deep character contracts must be modeled')
requirePattern(source, /export interface DeepWorldContract/, 'deep world contract must be modeled')
requirePattern(source, /export interface DeepGameplayContract/, 'deep gameplay contract must be modeled')
requirePattern(source, /export interface DeepAssetQualityContract/, 'deep asset quality contract must be modeled')
requirePattern(source, /export interface DeepAgentHandoffContract/, 'deep agent handoffs must be modeled')
requirePattern(source, /cinematicEvidence:\s*CinematicEvidencePlan/, 'deep bible must include cinematic evidence plan')
requirePattern(source, /noPrototypeShortcut:\s*true/, 'deep bible must block prototype shortcuts')
requirePattern(source, /storyArchitecture[\s\S]*continuityRules[\s\S]*narrativeRisks/, 'story architecture must include continuity and risks')
requirePattern(source, /streamingCells[\s\S]*navmeshPlan[\s\S]*environmentalStorytelling/, 'world contract must include streaming/navmesh/storytelling')
requirePattern(source, /tenSecondLoop[\s\S]*twoMinuteLoop[\s\S]*twentyMinuteLoop/, 'gameplay must model multiple time scales')
requirePattern(source, /performanceBudget[\s\S]*requiredEvidence/, 'scene beats must include performance and evidence')
requirePattern(source, /AI video drafts are references, not final footage/, 'cinematic direction must keep AI video as reference only')
requirePattern(source, /sourcingRules[\s\S]*raw text-to-3D stays draft/, 'asset quality must block raw generation as final')
requirePattern(source, /browserRole:\s*'preview-review'[\s\S]*studioLocalRole:\s*'heavy-production'[\s\S]*cloudStreamRole:\s*'final-review-when-configured'/, 'runtime roles must be honest')
requirePattern(source, /blockedClaims:\s*\[[\s\S]*'AAA alone'[\s\S]*'Unreal-grade'[\s\S]*'final game'/, 'blocked claims must include AAA/Unreal/final game')
requirePattern(source, /humanReviewRequired:\s*true/, 'human review must be mandatory')
requirePattern('lib/production/game-production-bible.ts', /deepBible:\s*DeepProductionBible/, 'compact bible must include deep bible')
requirePattern('lib/production/game-production-bible.ts', /buildDeepGameProductionBible/, 'compact bible must build deep bible')
requirePattern('app/studio/StudioGameScopeEvidencePanel.tsx', /deepBible\.scenes\.length/, 'Studio must surface deep bible summary without full text')
const evidenceCenterSurface = `${read('components/evidence/EvidenceCenter.tsx')}\n${read('components/evidence/EvidenceCenter.parts.tsx')}`
if (!/deepBible\.evidenceModel\.requiredEvidence\.length/.test(evidenceCenterSurface)) {
  failures.push('components/evidence/EvidenceCenter.tsx: missing Evidence Center must surface deep bible gate count')
}
if (!/productionBiblePlan\.cinematicEvidence\.state/.test(evidenceCenterSurface)) {
  failures.push('components/evidence/EvidenceCenter.tsx: missing Evidence Center must surface compact cinematic evidence state')
}
requirePattern('lib/ai-agent-system.ts', /Deep bible:/, 'agents must receive deep bible context')
requirePattern('lib/ai-agent-system.ts', /Cinematic evidence:/, 'agents must receive cinematic evidence context')
requirePattern('docs/DEEP_GAME_PRODUCTION_BIBLE_V22.md', /Do not expose the whole bible as a wall of text/, 'docs must protect UX from text overload')
requirePattern('docs/DEEP_GAME_PRODUCTION_BIBLE_V22.md', /AI video is an evidence lane, not a final-output shortcut/, 'docs must define cinematic evidence limits')

if (failures.length) {
  console.error('[deep-production-bible] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[deep-production-bible] PASS scenes=deep agents=handoff ui=compact')
