#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'components/assets/ContentBrowser.tsx',
  'components/assets/AssetPreviewPanel.tsx',
  'components/dashboard/DashboardAIChatTab.tsx',
  'components/dashboard/DashboardProjectsTab.tsx',
  'components/providers/runtime/FullStudioRuntime.tsx',
  'components/ai/AIThinkingPanel.tsx',
  'components/ai/DirectorNotePanel.tsx',
  'components/ai/AISuggestionBubble.tsx',
  'components/assets/ConnectedModelPreview.tsx',
  'components/character/ControlRigEditor.parts.tsx',
  'components/engine/LevelEditor.tsx',
  'components/engine/NiagaraVFXPanels.tsx',
  'components/environment/FoliagePainterPanels.tsx',
  'components/physics/ClothSimulationPanels.tsx',
  'components/physics/FluidSimulationPanels.tsx',
  'components/scene-editor/GameSimulation.tsx',
  'components/scene-editor/scene-editor-models.ts',
  'components/scene-editor/SceneEditor.tsx',
  'components/materials/MaterialEditor.tsx',
  'components/terrain/TerrainSculptingEditor.tsx',
  'components/terrain/TerrainSculptingEditor.parts.tsx',
  'components/physics/FluidSimulationEditor.tsx',
  'components/character/ControlRigEditor.tsx',
  'scripts/check-bundle-boundaries.mjs',
  'docs/BUNDLE_BOUNDARIES_AUDIT.md',
  'docs/BUNDLE_HEADROOM_V3.md',
]

const EXPECTED_BOUNDARY_FILES = [
  'components/assets/AssetPreviewPanel.tsx',
  'components/ai/AIThinkingPanel.tsx',
  'components/ai/DirectorNotePanel.tsx',
  'components/ai/AISuggestionBubble.tsx',
  'components/engine/LevelEditor.tsx',
  'components/scene-editor/SceneEditor.tsx',
  'components/materials/MaterialEditor.tsx',
  'components/terrain/TerrainSculptingEditor.tsx',
  'components/physics/FluidSimulationEditor.tsx',
  'components/character/ControlRigEditor.tsx',
]

const BUDGET_TARGETS = {
  threeDirect: 34,
  reactThreeFiberDirect: 2,
  reactThreeDreiDirect: 1,
  monacoEditorDirect: 2,
  monacoReactDirect: 3,
  framerMotionDirect: 9,
  dynamicImportsMin: 100,
}

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

function requirePattern(file, pattern, reason) {
  if (!pattern.test(sources[file] ?? '')) failures.push(`${file}: missing ${reason}`)
}

requirePattern(
  'components/assets/ContentBrowser.tsx',
  /const\s+AssetPreviewPanel\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\/AssetPreviewPanel['"]\)/,
  'dynamic AssetPreviewPanel boundary',
)
requirePattern(
  'components/dashboard/DashboardAIChatTab.tsx',
  /const\s+AIThinkingPanel\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\.\/ai\/AIThinkingPanel['"]\)/,
  'dynamic AIThinkingPanel boundary',
)
requirePattern(
  'components/dashboard/DashboardProjectsTab.tsx',
  /const\s+DirectorNotePanel\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]\.\.\/ai\/DirectorNotePanel['"]\)/,
  'dynamic DirectorNotePanel boundary',
)
requirePattern(
  'components/providers/runtime/FullStudioRuntime.tsx',
  /const\s+AISuggestionBubbleAuto\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]@\/components\/ai\/AISuggestionBubble['"]\)/,
  'dynamic AISuggestionBubbleAuto boundary',
)

for (const file of EXPECTED_BOUNDARY_FILES) {
  requireToken(file, '@aethel-heavy-async-boundary', 'heavy async boundary marker')
}

const boundaryScript = sources['scripts/check-bundle-boundaries.mjs'] ?? ''
for (const [key, value] of Object.entries(BUDGET_TARGETS)) {
  requirePattern('scripts/check-bundle-boundaries.mjs', new RegExp(`${key}:\\s*${value}\\b`), `${key} budget ${value}`)
}

const audit = sources['docs/BUNDLE_BOUNDARIES_AUDIT.md'] ?? ''
const countMatches = new Map()
for (const match of audit.matchAll(/- (\w+): (\d+) \((?:max|min) (\d+)\)/g)) {
  countMatches.set(match[1], { count: Number(match[2]), budget: Number(match[3]) })
}

for (const [key, target] of Object.entries(BUDGET_TARGETS)) {
  const entry = countMatches.get(key)
  if (!entry) {
    failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: missing count for ${key}`)
    continue
  }
  if (entry.budget !== target) failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: ${key} budget ${entry.budget} should be ${target}`)
  if (key === 'dynamicImportsMin') {
    if (entry.count < target) failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: ${key} ${entry.count} below ${target}`)
  } else if (entry.count > target) {
    failures.push(`docs/BUNDLE_BOUNDARIES_AUDIT.md: ${key} ${entry.count} above ${target}`)
  }
}

for (const token of [
  'Bundle Headroom V3',
  'Asset preview is lazy',
  'Animated AI feedback is lazy',
  'Studio route editors remain route-level chunks',
  'No public route is allowed to import viewport, Monaco, Three, R3F, drei, or screenshot billboards directly',
]) {
  requireToken('docs/BUNDLE_HEADROOM_V3.md', token)
}

if (failures.length > 0) {
  console.error(`[bundle-headroom-v3] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[bundle-headroom-v3] PASS heavy-ui=lazy budgets=tightened public-shell=protected')
