#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
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
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

requireFile('lib/runtime/runtime-engine-spine.ts', 'runtime engine spine contracts must exist')
requirePattern('lib/runtime/runtime-engine-spine.ts', /hybrid|wgpu-native|cloud-renderer|browser-preview|held/i, 'runtime must model hybrid wgpu/browser/cloud targets')
requirePattern('lib/runtime/runtime-engine-spine.ts', /manual-consent-only/, 'toolchain downloads must require manual consent')
requirePattern('lib/runtime/runtime-engine-spine.ts', /sha256-required-before-execution/, 'toolchain execution must require checksum governance')
requirePattern('lib/runtime/runtime-engine-spine.ts', /gltf-transform/, 'glTF Transform must be in the curated toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /meshoptimizer/, 'meshoptimizer must be in the curated toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /ktx-software-basisu/, 'KTX/Basis must be in the curated toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /ffmpeg/, 'FFmpeg must be in the curated media toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /openusd-tools/, 'OpenUSD tools must be metadata-first capable')
requirePattern('lib/runtime/runtime-engine-spine.ts', /recast-detour/, 'Recast/Detour navmesh adapter must be in the optional toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /rapier-physics/, 'Rapier physics adapter must be in the optional toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /ozz-animation/, 'Ozz Animation adapter must be in the optional toolchain')
requirePattern('lib/runtime/runtime-engine-spine.ts', /unreal-export-bridge/, 'Unreal export bridge must be modeled as optional and consented')
requirePattern('lib/runtime/runtime-engine-spine.ts', /unity-export-bridge/, 'Unity export bridge must be modeled as optional and consented')
requirePattern('lib/runtime/runtime-engine-spine.ts', /godot-export-bridge/, 'Godot export bridge must be modeled as optional and consented')
requirePattern('lib/runtime/runtime-engine-spine.ts', /buildGameRuntimeToolchainPlan/, 'game runtime toolchain plan must connect navmesh physics animation and export bridges')
requirePattern('lib/runtime/runtime-engine-spine.ts', /neverMainThread: true/, 'heavy runtime contracts must forbid browser main thread execution')
requirePattern('lib/runtime/runtime-engine-spine.ts', /manifest-only output cannot be marked done/, 'final renders without backend must remain held')
requirePattern('lib/runtime/runtime-engine-spine.ts', /metadata.*license.*thumbnail/s, 'asset pipeline must require metadata, license, and thumbnail evidence')

requireFile('lib/runtime/runtime-renderer-adapter.ts', 'renderer backend responses must be schema validated')
requirePattern('lib/runtime/runtime-renderer-adapter.ts', /schemaVersion: 1/, 'renderer backend must use a versioned schema')
requirePattern('lib/runtime/runtime-renderer-adapter.ts', /performanceReport/, 'renderer backend must require performance reports')
requirePattern('lib/runtime/runtime-renderer-adapter.ts', /validationReport/, 'renderer backend must require validation reports')
requirePattern('lib/runtime/runtime-renderer-adapter.ts', /performance-report/, 'renderer evidence must include performance-report artifacts')
requirePattern('lib/runtime/runtime-renderer-adapter.ts', /validation-report/, 'renderer evidence must include validation-report artifacts')

requireFile('lib/runtime/local-wgpu-sidecar.ts', 'local wgpu sidecar contract skeleton must exist')
requirePattern('lib/runtime/local-wgpu-sidecar.ts', /aethel\.wgpu\.probe/, 'sidecar must expose a bounded probe request')
requirePattern('lib/runtime/local-wgpu-sidecar.ts', /aethel\.wgpu\.render/, 'sidecar must expose a render request contract')
requirePattern('lib/runtime/local-wgpu-sidecar.ts', /noDownloads: true/, 'sidecar contracts must not download tools')
requirePattern('lib/runtime/local-wgpu-sidecar.ts', /noMainThread: true/, 'sidecar contracts must stay off the browser main thread')
requirePattern('lib/runtime/local-wgpu-sidecar.ts', /supportsOffscreenRender/, 'sidecar probe must report offscreen render support')

requireFile('lib/device/local-runtime-bridge.ts', 'local runtime report must expose native toolchain capabilities')
requirePattern('lib/device/local-runtime-bridge.ts', /rendererBackends/, 'local runtime must report renderer backends')
requirePattern('lib/device/local-runtime-bridge.ts', /assetTools/, 'local runtime must report asset tools')
requirePattern('lib/device/local-runtime-bridge.ts', /recast-detour/, 'local runtime bridge must normalize Recast/Detour support')
requirePattern('lib/device/local-runtime-bridge.ts', /ozz-animation/, 'local runtime bridge must normalize Ozz Animation support')
requirePattern('lib/device/local-runtime-bridge.ts', /unreal-export-bridge/, 'local runtime bridge must normalize external engine export bridge support')
requirePattern('lib/device/local-runtime-bridge.ts', /mediaTools/, 'local runtime must report media tools')
requirePattern('lib/device/local-runtime-bridge.ts', /shaderTools/, 'local runtime must report shader tools')
requirePattern('lib/device/local-runtime-bridge.ts', /toolVersions/, 'local runtime must report tool versions')
requirePattern('lib/device/local-runtime-bridge.ts', /toolDigests/, 'local runtime must report tool digests')
requirePattern('lib/device/local-runtime-bridge.ts', /supportsOffscreenRender/, 'local runtime must report offscreen render support')

const studioLocalContracts = '../../apps/studio-local/src-tauri/src/contracts.rs'
const studioLocalProbe = '../../apps/studio-local/src-tauri/src/probe.rs'
requireFile(studioLocalContracts, 'Studio Local sidecar contracts must expose optional game toolchain features')
requirePattern(studioLocalContracts, /RecastDetour/, 'Studio Local contracts must model Recast/Detour')
requirePattern(studioLocalContracts, /OzzAnimation/, 'Studio Local contracts must model Ozz Animation')
requirePattern(studioLocalContracts, /UnrealExportBridge/, 'Studio Local contracts must model Unreal export bridges')
requirePattern(studioLocalContracts, /UnityExportBridge/, 'Studio Local contracts must model Unity export bridges')
requirePattern(studioLocalContracts, /GodotExportBridge/, 'Studio Local contracts must model Godot export bridges')
requireFile(studioLocalProbe, 'Studio Local probe must detect optional game toolchain features')
requirePattern(studioLocalProbe, /recast-cli/, 'Studio Local probe must detect Recast/Detour command support')
requirePattern(studioLocalProbe, /ozz-animation-adapter/, 'Studio Local probe must detect Ozz Animation adapter support')
requirePattern(studioLocalProbe, /aethel-unreal-bridge/, 'Studio Local probe must detect Unreal export bridge support')
requirePattern(studioLocalProbe, /aethel-unity-bridge/, 'Studio Local probe must detect Unity export bridge support')
requirePattern(studioLocalProbe, /godot/, 'Studio Local probe must detect Godot export support')

requireFile('lib/production/agent-tool-bus.ts', 'agent tool bus must govern runtime engine tools')
for (const tool of ['renderer-probe', 'asset-optimize', 'shader-compile', 'render-submit', 'render-validate']) {
  requirePattern('lib/production/agent-tool-bus.ts', new RegExp(tool), `${tool} must be a governed agent tool`)
}
requirePattern('lib/production/agent-tool-bus.ts', /render backend contract/, 'render-submit must require backend contract evidence')
requirePattern('lib/production/agent-tool-bus.ts', /asset graph/, 'render-submit must require asset graph evidence')
requirePattern('lib/production/agent-tool-bus.ts', /validation graph/, 'render-submit must require validation graph evidence')

requireFile('lib/production/parallel-agent-work-contract.ts', 'parallel agents must be able to request runtime tools')
requirePattern('lib/production/parallel-agent-work-contract.ts', /asset-optimize/, 'asset agents must expose asset optimization')
requirePattern('lib/production/parallel-agent-work-contract.ts', /render-submit/, 'creative/release agents must expose render submit')
requirePattern('lib/production/parallel-agent-work-contract.ts', /render-validate/, 'QA/release agents must expose render validation')

requireFile('lib/viewport/viewport-render-backend.ts', 'viewport render endpoint must advertise runtime engine contract')
requirePattern('lib/viewport/viewport-render-backend.ts', /hybrid-wgpu-v1/, 'viewport backend capabilities must expose the hybrid wgpu contract')
requirePattern('lib/viewport/viewport-render-backend.ts', /preview-only/, 'browser renderer must be preview-only')
requirePattern('lib/viewport/viewport-render-backend.ts', /automaticDownloads: false/, 'runtime backend must not auto-download tools')

requireFile('lib/workers/viewport-render-worker.ts', 'viewport worker must not fake final media')
requirePattern('lib/workers/viewport-render-worker.ts', /AETHEL_RENDER_BACKEND_ENDPOINT is not configured/, 'missing backend must be explicit')
requirePattern('lib/workers/viewport-render-worker.ts', /buildRuntimeRendererRequestEnvelope/, 'worker must send the runtime renderer request envelope')
requirePattern('lib/workers/viewport-render-worker.ts', /coerceRuntimeRendererEvidenceEnvelope/, 'worker must schema-validate renderer evidence')
requirePattern('lib/workers/viewport-render-worker.ts', /playbackOk: false/, 'manifest-only evidence must not pass playback')
requirePattern('lib/workers/viewport-render-worker.ts', /No media artifact was fabricated/, 'worker must state that it did not fabricate media')

requireFile('lib/device/runtime-lane-scheduler.ts', 'runtime lane scheduler must keep heavy jobs off the UI thread')
if (exists('lib/device/runtime-lane-scheduler.ts')) {
  const scheduler = read('lib/device/runtime-lane-scheduler.ts')
  if (/budget\('viewport-render'[^)]*'local-main-safe'/.test(scheduler)) {
    failures.push('lib/device/runtime-lane-scheduler.ts: viewport-render must not be scheduled on local-main-safe')
  }
}
requirePattern('lib/device/runtime-execution-router.ts', /cannot run on the browser main thread/, 'runtime router must block legacy heavy local-main-safe routes')

requireFile('__tests__/runtime/runtime-engine-spine.test.ts', 'runtime engine spine tests must exist')
requirePattern('__tests__/runtime/runtime-engine-spine.test.ts', /final renders when no native or cloud renderer/, 'tests must hold final render without backend')
requirePattern('__tests__/runtime/runtime-engine-spine.test.ts', /weak devices/, 'tests must cover weak-device routing')
requirePattern('__tests__/runtime/runtime-engine-spine.test.ts', /metadata-first asset preflight/, 'tests must cover large asset preflight')
requirePattern('__tests__/runtime/runtime-engine-spine.test.ts', /navmesh, physics, animation, and engine export bridges/, 'tests must cover optional game runtime toolchains')
requireFile('__tests__/runtime/runtime-renderer-adapter.test.ts', 'renderer adapter tests must exist')
requirePattern('__tests__/runtime/runtime-renderer-adapter.test.ts', /rejects legacy renderer evidence/, 'tests must reject legacy renderer evidence')
requireFile('__tests__/runtime/local-wgpu-sidecar.test.ts', 'local wgpu sidecar tests must exist')
requirePattern('__tests__/runtime/local-wgpu-sidecar.test.ts', /no-download probe request/, 'tests must cover bounded no-download sidecar probes')

requirePattern('package.json', /qa:runtime-engine-spine/, 'package scripts must expose runtime engine spine QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:runtime-engine-spine/, 'enterprise gate must include runtime engine spine QA')

if (failures.length > 0) {
  console.error('[runtime-engine-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-engine-spine] PASS')
