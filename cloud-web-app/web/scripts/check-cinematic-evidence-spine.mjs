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

const source = 'lib/production/cinematic-evidence-spine.ts'

requirePattern(source, /export interface CinematicEvidencePlan/, 'CinematicEvidencePlan contract')
requirePattern(source, /CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE/, 'required cinematic evidence list')
requirePattern(source, /'storyboard'[\s\S]*'shot-blocking'[\s\S]*'animatic-draft'[\s\S]*'ai-video-reference'[\s\S]*'engine-render-pass'[\s\S]*'release-footage-review'/, 'six cinematic lanes')
requirePattern(source, /route:\s*'\/api\/ai\/video\/generate'/, 'AI video generate route binding')
requirePattern(source, /statusRoute:\s*'\/api\/ai\/video\/status'/, 'AI video status route binding')
requirePattern(source, /noFinalFootageClaim:\s*true/, 'hard block against final footage claim')
requirePattern(source, /Draft videos are not final/, 'draft warning copy')
requirePattern(source, /Video provider required/, 'provider blocker copy')
requirePattern(source, /Cloud\/video generation cost applies/, 'cost warning copy')
requirePattern(source, /Human review required/, 'human review copy')

requirePattern('lib/production/game-production-spine.ts', /'cinematic-evidence-graph'/, 'game production graph must include cinematic evidence')
requirePattern('lib/production/game-production-spine.ts', /CINEMATIC_EVIDENCE_REQUIRED_EVIDENCE/, 'game production spine must reuse cinematic evidence requirements')
requirePattern('lib/production/deep-game-production-bible.ts', /cinematicEvidence:\s*CinematicEvidencePlan/, 'deep bible must include cinematic evidence plan')
requirePattern('lib/production/game-production-bible.ts', /'cinematics'/, 'compact bible must include cinematics pillar')
requirePattern('lib/production/game-scope-orchestrator.ts', /cinematicEvidence:\s*CinematicEvidencePlan/, 'scope plan must expose cinematic evidence')
requirePattern('app/studio/StudioMissionControl.tsx', /gameScopePlan\??\.cinematicEvidence\.state/, 'Studio must show compact cinematic evidence state')
const evidenceCenterSurface = `${read('components/evidence/EvidenceCenter.tsx')}\n${read('components/evidence/EvidenceCenter.parts.tsx')}`
if (!/productionBiblePlan\.cinematicEvidence\.state/.test(evidenceCenterSurface)) {
  failures.push('components/evidence/EvidenceCenter.tsx: missing Evidence Center must show cinematic evidence state')
}
requirePattern('lib/ai-agent-system.ts', /Cinematic evidence:/, 'agents must receive cinematic evidence context')
requirePattern('__tests__/production/cinematic-evidence-spine.test.ts', /blocks AI video reference when no provider evidence exists/, 'tests must cover provider-blocked video evidence')
requirePattern('__tests__/production/cinematic-evidence-spine.test.ts', /keeps fully evidenced cinematic work in human review instead of ready/, 'tests must prove human-held cinematic release behavior')
requirePattern('docs/CINEMATIC_EVIDENCE_SPINE_V22.md', /No Unreal-grade, final cinematic, trailer-ready, or release-ready claim/, 'docs must block cinematic overclaims')

if (failures.length) {
  console.error('[cinematic-evidence-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[cinematic-evidence-spine] PASS lanes=6 draft-only=true')
