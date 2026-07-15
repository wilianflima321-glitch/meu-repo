#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

requirePattern('lib/physics/rapier-driver.ts', /buildRapierPhysicsDriverCapability/, 'Rapier driver capability builder')
requirePattern('lib/physics/rapier-driver.ts', /manual consent receipt/, 'manual consent receipt')
requirePattern('lib/physics/rapier-driver.ts', /navmesh bake report/, 'navmesh bake report')
requirePattern('lib/physics/rapier-driver.ts', /physics replay/, 'physics replay receipt')
requirePattern('lib/physics/rapier-driver.ts', /performance trace/, 'physics performance trace')
requirePattern('lib/physics/rapier-driver.ts', /studio-or-viewport-only/, 'heavy runtime boundary')

requirePattern('lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', /buildMediaPipeBridgeCapability/, 'MediaPipe bridge builder')
requirePattern('lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', /local-only-required/, 'local-only privacy mode')
requirePattern('lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', /user consent receipt/, 'user consent receipt')
requirePattern('lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', /privacy retention policy receipt/, 'privacy retention policy')
requirePattern('lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', /capture replay receipt/, 'capture replay receipt')

requirePattern('lib/integrations/photogrammetry/luma-ai.ts', /buildLumaPhotogrammetryProviderCapability/, 'Luma provider builder')
requirePattern('lib/integrations/photogrammetry/luma-ai.ts', /source capture consent receipt/, 'source capture consent')
requirePattern('lib/integrations/photogrammetry/luma-ai.ts', /cost cap receipt/, 'cost cap receipt')
requirePattern('lib/integrations/photogrammetry/luma-ai.ts', /artifact teardown receipt/, 'artifact teardown receipt')
requirePattern('lib/integrations/photogrammetry/luma-ai.ts', /retopology or curated mesh receipt/, 'retopo receipt')

requirePattern('lib/ai-ondevice/capability-matrix.ts', /buildPhysicsAiOnDevicePhotogrammetryMatrix/, 'capability matrix builder')
requirePattern('lib/ai-ondevice/capability-matrix.ts', /Unreal-grade/, 'forbidden Unreal-grade claim guard')
requirePattern('lib/ai-ondevice/index.ts', /buildPhysicsAiOnDevicePhotogrammetryMatrix/, 'barrel export')
requirePattern('__tests__/runtime/physics-ai-ondevice-photogrammetry.test.ts', /buildPhysicsAiOnDevicePhotogrammetryMatrix/, 'matrix test')
requirePattern('lib/runtime/v29-forensic-runtime-backlog.ts', /qa:v29-physics-ai-ondevice-photogrammetry/, 'forensic backlog gate')
requirePattern('scripts/check-v29-total-spine.mjs', /check-v29-physics-ai-ondevice-photogrammetry\.mjs/, 'V29 total gate inclusion')
requirePattern('package.json', /qa:v29-physics-ai-ondevice-photogrammetry/, 'package script')
requirePattern('tsconfig.typecheck-runtime-spine.json', /lib\/ai-ondevice\/\*\*\/\*\.ts/, 'runtime typecheck include')

if (failures.length) {
  console.error('[v29-physics-ai-ondevice-photogrammetry] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-physics-ai-ondevice-photogrammetry] PASS physics=held privacy=local-only photogrammetry=cost-governed')
