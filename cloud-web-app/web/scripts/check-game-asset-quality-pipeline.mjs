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

requirePattern('lib/production/game-asset-quality-pipeline.ts', /noTenKMeshAsFinalClaim:\s*true/, '10k AI meshes must be draft-only, not final claims')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /curated-marketplace/, 'pipeline must support curated asset acquisition beyond raw generation')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /studio-local-optimized/, 'pipeline must route high quality work through Studio Local optimization')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /cloud-render-grade/, 'pipeline must support expensive cloud/final review as optional target')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /license\/provenance receipt/, 'license and provenance must be hard evidence')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /retopology or curated mesh receipt/, 'mesh upgrade path must be explicit')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /PBR texture compression report/, 'PBR material proof must be explicit')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /LOD0\/LOD1\/LOD2\/LOD3 manifest/, 'LOD stack must be required')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /collision\/navmesh proxy report/, 'world/gameplay proxy proof must be required')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /human art-direction approval/, 'human art direction must gate premium claims')
requirePattern('lib/production/game-asset-quality-pipeline.ts', /meshoptimizer\/gltfpack/, 'mesh optimizer sidecar dependency must be explicit')
requirePattern('lib/production/game-production-spine.ts', /GAME_ASSET_QUALITY_REQUIRED_EVIDENCE/, 'game production spine must consume asset quality evidence')
requirePattern('docs/GAME_ASSET_QUALITY_PIPELINE_V22.md', /10k polygon AI output is draft-only/, 'docs must explain the 10k polygon limitation honestly')
requirePattern('docs/GAME_ASSET_QUALITY_PIPELINE_V22.md', /League-style game from zero/, 'docs must explain how to approach a LoL-like product without fake promises')

if (failures.length) {
  console.error('[game-asset-quality-pipeline] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[game-asset-quality-pipeline] PASS lanes=4 evidence=11 sidecars=7')