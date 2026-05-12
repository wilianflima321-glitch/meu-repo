#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function file(relativePath) {
  return path.join(ROOT, relativePath)
}

function exists(relativePath) {
  return fs.existsSync(file(relativePath))
}

function read(relativePath) {
  return fs.readFileSync(file(relativePath), 'utf8')
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${pattern} (${reason})`)
}

function countFiles(relativePath, predicate) {
  const dir = file(relativePath)
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      count += countFiles(path.relative(ROOT, abs), predicate)
    } else if (predicate(abs)) {
      count += 1
    }
  }
  return count
}

const creativeRoutes = [
  '/studio/level',
  '/studio/scene',
  '/studio/material',
  '/studio/animation',
  '/studio/vfx',
  '/studio/terrain',
  '/studio/landscape',
  '/studio/cloth',
  '/studio/facial',
  '/studio/fluid',
  '/studio/foliage',
  '/studio/hair',
  '/studio/rig',
  '/studio/water',
  '/studio/sprite',
  '/studio/film',
  '/studio/audio',
]

for (const route of creativeRoutes) {
  requireFile(`app${route}/page.tsx`, `${route} must expose its editor surface`)
  requirePattern('app/studio/creative-studio-routes.ts', new RegExp(`href:\\s*'${route}'`), `${route} must be listed in the Studio hub`)
  requirePattern('lib/routes/route-maturity-registry.ts', new RegExp(`path:\\s*'${route}'`), `${route} must have an honest maturity entry`)
}

const requiredEditors = [
  'components/engine/LevelEditor.tsx',
  'components/scene-editor/SceneEditor.tsx',
  'components/materials/MaterialEditor.tsx',
  'components/engine/AnimationBlueprint.tsx',
  'components/engine/NiagaraVFX.tsx',
  'components/terrain/TerrainSculptingEditor.tsx',
  'components/engine/LandscapeEditor.tsx',
  'components/physics/ClothSimulationEditor.tsx',
  'components/character/FacialAnimationEditor.tsx',
  'components/physics/FluidSimulationEditor.tsx',
  'components/environment/FoliagePainter.tsx',
  'components/character/HairFurEditor.tsx',
  'components/character/ControlRigEditor.tsx',
  'components/environment/WaterEditor.tsx',
  'components/editors/SpriteEditor.tsx',
  'components/video/VideoTimelineEditor.tsx',
  'components/audio/SoundCueEditor.tsx',
]
for (const editor of requiredEditors) requireFile(editor, 'creative editor source must remain present')

const viewportRuntimeFiles = [
  'lib/viewport/viewport-asset-import.ts',
  'lib/viewport/viewport-asset-import-persistence.ts',
  'lib/viewport/viewport-render-contract.ts',
  'lib/viewport/viewport-render-queue.ts',
  'lib/viewport/viewport-render-backend.ts',
  'lib/viewport/viewport-render-persistence.ts',
  'lib/viewport/viewport-render-readiness.ts',
  'lib/viewport/viewport-render-artifact-access.ts',
  'lib/viewport/viewport-render-evidence-ownership.ts',
  'lib/workers/viewport-render-worker.ts',
  'lib/viewport/gizmo-transform-operation.ts',
  'lib/viewport/gizmo-transform-persistence.ts',
  'app/api/runtime/viewport/render/route.ts',
]
for (const runtimeFile of viewportRuntimeFiles) requireFile(runtimeFile, 'viewport render pipeline contract')

requirePattern(
  'components/ide/fullscreen/useNativeMonacoYjsBinding.ts',
  /MonacoBinding/,
  'multiplayer must use native y-monaco binding, not overlay-only cursors'
)
requirePattern('app/studio/StudioMissionControl.tsx', /StudioMissionControl/, 'mission control must remain visible')
requirePattern('app/studio/CreativeStudioShell.tsx', /CreativeStudioShell/, 'creative surfaces must share one shell')
requirePattern('lib/production/agentic-production-state.ts', /assetGraph/, 'production state must retain Asset Graph')
requirePattern('lib/production/agentic-production-state.ts', /shotFilmGraph/, 'production state must retain Shot/Film Graph')
requirePattern('lib/production/repository-cartography.ts', /RepositoryCartography/, 'large repo cartography must remain available')

const viewportTestCount = countFiles('__tests__/viewport', (abs) => /\.(test|spec)\.tsx?$/.test(abs))
if (viewportTestCount < 10) {
  failures.push(`__tests__/viewport: expected >=10 viewport tests, found ${viewportTestCount}`)
}

if (failures.length) {
  console.error('[ai-game-film-production] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[ai-game-film-production] PASS creativeRoutes=${creativeRoutes.length}, viewportRuntime=${viewportRuntimeFiles.length}, viewportTests=${viewportTestCount}`
)
