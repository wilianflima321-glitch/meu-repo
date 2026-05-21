#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REQUIRED_FILES = [
  'components/viewport/AethelViewport3D.tsx',
  'components/viewport/ViewportSceneCanvas.tsx',
  'components/viewport/ViewportChrome.tsx',
  'components/viewport/ViewportCameraPresetApplier.tsx',
  'components/viewport/viewport-camera-presets.ts',
  'components/viewport/viewport-model.ts',
  'components/viewport/ViewportRuntimeDepthStatus.tsx',
  'components/viewport/gizmos/TransformGizmoProfessional.tsx',
  'components/engine/GameViewport.tsx',
  'components/VRPreview.tsx',
  'docs/VIEWPORT_RUNTIME_BOUNDARIES_V22.md',
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

function forbidToken(file, token, reason = token) {
  if (sources[file]?.includes(token)) failures.push(`${file}: forbidden ${reason}`)
}

function requirePattern(file, pattern, reason) {
  if (!pattern.test(sources[file] ?? '')) failures.push(`${file}: missing ${reason}`)
}

requirePattern(
  'components/viewport/AethelViewport3D.tsx',
  /const\s+ViewportScene\s*=\s*dynamic\(\s*\(\)\s*=>\s*import\(['"]@\/components\/viewport\/ViewportSceneCanvas['"]\)/,
  'dynamic ViewportSceneCanvas boundary',
)
forbidToken(
  'components/viewport/AethelViewport3D.tsx',
  "import { ViewportScene } from '@/components/viewport/ViewportSceneCanvas'",
  'static ViewportSceneCanvas import',
)
forbidToken(
  'components/viewport/AethelViewport3D.tsx',
  "from '@/components/viewport/ViewportCameraPresetApplier'",
  'camera preset type import from heavy applier',
)
requireToken('components/viewport/AethelViewport3D.tsx', "from '@/components/viewport/viewport-camera-presets'")
requireToken('components/viewport/AethelViewport3D.tsx', "from '@/components/viewport/viewport-model'")
requireToken('components/viewport/AethelViewport3D.tsx', 'ViewportRuntimeDepthStatus')
requireToken('components/viewport/ViewportChrome.tsx', "from '@/components/viewport/viewport-camera-presets'")
forbidToken('components/viewport/AethelViewport3D.tsx', 'const defaultObjects:', 'inline viewport seed object payload')

const aethelViewportLines = (sources['components/viewport/AethelViewport3D.tsx'] ?? '').split(/\r?\n/).length
if (aethelViewportLines > 350) {
  failures.push(`components/viewport/AethelViewport3D.tsx: ${aethelViewportLines} lines exceeds 350-line orchestrator limit`)
}

for (const file of [
  'components/viewport/ViewportSceneCanvas.tsx',
  'components/viewport/ViewportCameraPresetApplier.tsx',
  'components/viewport/gizmos/TransformGizmoProfessional.tsx',
  'components/engine/GameViewport.tsx',
]) {
  requireToken(file, '@aethel-heavy-async-boundary', 'heavy async boundary marker')
}

for (const token of ['@react-three/fiber', '@react-three/drei', "from 'three'", 'from "three"']) {
  forbidToken('components/viewport/viewport-camera-presets.ts', token, 'heavy viewport runtime import in camera presets model')
}

requirePattern(
  'components/VRPreview.tsx',
  /dynamic\(\(\)\s*=>\s*import\(['"]\.\/engine\/GameViewport['"]\)/,
  'dynamic GameViewport import',
)

for (const token of [
  'Viewport Runtime Boundaries',
  'Browser runtime canvas is lazy',
  'Camera presets are lightweight',
  'Viewport model is isolated',
  'Runtime depth status is isolated',
  'GameViewport stays dynamic',
  'No public route can import the browser runtime scene directly',
]) {
  requireToken('docs/VIEWPORT_RUNTIME_BOUNDARIES_V22.md', token)
}

if (failures.length > 0) {
  console.error(`[viewport-runtime-boundaries] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[viewport-runtime-boundaries] PASS viewport-scene=lazy camera-presets=light game-viewport=dynamic')
