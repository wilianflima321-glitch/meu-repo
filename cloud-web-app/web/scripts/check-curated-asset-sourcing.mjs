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

const source = 'lib/production/curated-asset-sourcing.ts'

requirePattern(source, /export interface CuratedAssetSourcingPlan/, 'CuratedAssetSourcingPlan contract must exist')
requirePattern(source, /'ai-draft'[\s\S]*'curated-library'[\s\S]*'premium-marketplace'[\s\S]*'first-party-production'[\s\S]*'studio-local-kitbash'[\s\S]*'cloud-render-source'/, 'all acquisition lanes must be explicit')
requirePattern(source, /curatedFirst:\s*input\.targetQuality !== 'ai-draft'/, 'non-draft assets must prefer curated sourcing')
requirePattern(source, /license\/provenance receipt/, 'license/provenance must be required evidence')
requirePattern(source, /source asset manifest/, 'source manifest must be required evidence')
requirePattern(source, /Reject raw text-to-3D meshes as final hero assets/, 'raw generated meshes must be rejected as final hero assets')
requirePattern(source, /humanReviewRequired:\s*true/, 'human review must be mandatory')
requirePattern(source, /missingEvidence\.length > 0[\s\S]*'held'/, 'missing evidence must hold sourcing')
requirePattern('lib/production/ai-quality-orchestrator.ts', /assetSourcingPlan:\s*CuratedAssetSourcingPlan/, 'quality plan must include asset sourcing plan')
requirePattern('lib/production/ai-quality-orchestrator.ts', /buildCuratedAssetSourcingPlan/, 'quality orchestrator must build sourcing plan')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /assetSourcingPlan\.recommendedLane/, 'viewport must show sourcing lane')
requirePattern('components/viewport/ViewportAssetQualityCard.tsx', /assetSourcingPlan\.searchQueries/, 'viewport must show sourcing search plan')
requirePattern('docs/CURATED_ASSET_SOURCING_V22.md', /No final claim is allowed from raw text-to-3D output/, 'docs must block fake final claims from raw generation')

if (failures.length) {
  console.error('[curated-asset-sourcing] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[curated-asset-sourcing] PASS lanes=6 final-claim=blocked')
