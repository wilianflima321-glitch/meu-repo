#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'components/assets/ContentBrowserConnected.tsx',
  'components/assets/ConnectedModelPreview.tsx',
  'components/character/ControlRigEditor.parts.tsx',
  'components/character/HairFurEditor.parts.tsx',
  'components/engine/NiagaraVFXPanels.tsx',
  'components/environment/FoliagePainterPanels.tsx',
  'components/physics/ClothSimulationPanels.tsx',
  'components/physics/FluidSimulationPanels.tsx',
  'components/terrain/TerrainSculptingEditor.parts.tsx',
  'components/scene-editor/GameSimulation.tsx',
  'components/scene-editor/scene-editor-models.ts',
  'docs/EDITOR_RUNTIME_TRANSITIVE_BOUNDARIES_V22.md',
]

const failures = []

function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) {
    failures.push(`${file}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

const sources = Object.fromEntries(REQUIRED_FILES.map((file) => [file, read(file)]))

function requireToken(file, token, reason = token) {
  if (!sources[file]?.includes(token)) failures.push(`${file}: missing ${reason}`)
}

function forbidPattern(file, pattern, reason) {
  if (pattern.test(sources[file] ?? '')) failures.push(`${file}: forbidden ${reason}`)
}

requireToken('components/assets/ContentBrowserConnected.tsx', "dynamic(() => import('./ConnectedModelPreview')")
forbidPattern('components/assets/ContentBrowserConnected.tsx', /from ['"]three['"]|from ['"]three\//, 'static Three import in connected browser shell')
forbidPattern('components/assets/ContentBrowserConnected.tsx', /GLTFLoader/, 'static GLTFLoader in connected browser shell')

for (const file of REQUIRED_FILES.filter((item) => item.startsWith('components/') && item !== 'components/assets/ContentBrowserConnected.tsx')) {
  requireToken(file, '@aethel-heavy-async-boundary', 'heavy async boundary marker')
}

for (const token of [
  'Editor Runtime Transitive Boundaries',
  'Connected asset model preview is lazy',
  'Transitive editor panels stay behind their parent Studio route',
  'No connected asset browser shell can import Three or GLTFLoader statically',
]) {
  requireToken('docs/EDITOR_RUNTIME_TRANSITIVE_BOUNDARIES_V22.md', token)
}

if (failures.length > 0) {
  console.error(`[editor-runtime-transitive-boundaries] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[editor-runtime-transitive-boundaries] PASS connected-preview=lazy transitive-panels=governed')
