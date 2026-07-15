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

requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /buildGameAssetQualityPipeline/, 'viewport asset card must use the governed quality pipeline')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /evaluateGameAssetQualityReadiness/, 'viewport asset card must show evidence-based readiness')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /Draft[\s\S]*Curated[\s\S]*Optimized[\s\S]*Render grade/, 'viewport asset card must expose upgrade lanes')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /Quality upgrade held/, 'viewport asset card must be honest when evidence is missing')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /human art-direction approval|art-direction review/, 'viewport asset card must keep human art direction in the path')
requirePattern('components/viewport/SceneViewportInspector.tsx', /ViewportAssetQualityCard/, 'inspector must render the asset quality card for imported assets')
requirePattern('lib/viewport/viewport-asset-import.ts', /qualityTier\?: GameAssetQualityTier/, 'asset metadata must carry optional quality tier')
requirePattern('lib/viewport/viewport-asset-import.ts', /inferViewportAssetQualityTier/, 'asset import must infer quality lane')
requirePattern('lib/viewport/viewport-asset-import.ts', /buildViewportAssetQualityEvidenceRefs/, 'asset import must expose evidence refs for readiness')
requirePattern('package.json', /qa:viewport-asset-quality-ui/, 'package scripts must expose viewport asset quality QA')

if (failures.length) {
  console.error('[viewport-asset-quality-ui] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[viewport-asset-quality-ui] PASS inspector=quality-card lanes=4 evidence=true')
