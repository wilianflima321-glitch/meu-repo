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

requirePattern('lib/production/ai-quality-orchestrator.ts', /export interface QualityOrchestrationPlan/, 'QualityOrchestrationPlan must exist')
requirePattern('lib/production/ai-quality-orchestrator.ts', /export type QualityUpgradeLane/, 'QualityUpgradeLane type must exist')
requirePattern('lib/production/ai-quality-orchestrator.ts', /export type RuntimeCapabilitySnapshot/, 'RuntimeCapabilitySnapshot type must exist')
requirePattern('lib/production/ai-quality-orchestrator.ts', /'available' \| 'held' \| 'blocked' \| 'needs-review'/, 'allowed statuses must be explicit and exclude ready')
requirePattern('lib/production/ai-quality-orchestrator.ts', /'meshoptimizer'[\s\S]*'gltfpack'[\s\S]*'ktx2-basis'[\s\S]*'rapier'[\s\S]*'ffmpeg'[\s\S]*'blender-assimp'[\s\S]*'pixel-stream-url'[\s\S]*'studio-local'/, 'runtime capability mapping must cover sidecars and stream/local')
requirePattern('lib/production/ai-quality-orchestrator.ts', /Draft assets are not final/, 'draft warning copy must be canonical')
requirePattern('lib/production/ai-quality-orchestrator.ts', /Studio Local required/, 'Studio Local required copy must be canonical')
requirePattern('lib/production/ai-quality-orchestrator.ts', /Cloud Stream cost applies/, 'Cloud Stream cost copy must be canonical')
requirePattern('lib/production/ai-quality-orchestrator.ts', /Human review required/, 'human review copy must be canonical')
requirePattern('lib/production/ai-quality-orchestrator.ts', /humanReviewRequired:\s*true/, 'human review must always be required')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /buildQualityOrchestrationPlan/, 'viewport must render quality plan')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /Plan quality upgrade/, 'viewport must expose governed upgrade planning')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /disabled=\{upgradeBlocked\}/, 'upgrade button must stay disabled when capability or evidence is missing')
requirePattern('docs/AI_QUALITY_ORCHESTRATOR_V22.md', /There is intentionally no `ready` state/, 'docs must explain no fake ready state')

if (failures.length) {
  console.error('[ai-quality-orchestrator] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[ai-quality-orchestrator] PASS statuses=4 execution=planning-only')