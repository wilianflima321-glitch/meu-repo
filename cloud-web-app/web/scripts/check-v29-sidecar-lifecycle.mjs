#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function readWeb(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function readRepo(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

const contract = readWeb('lib/runtime/v29-sidecar-lifecycle.ts')
const test = readWeb('__tests__/runtime/v29-sidecar-lifecycle.test.ts')
const rustSidecars = readRepo('apps/studio-local/src-tauri/src/sidecars.rs')
const rustContracts = readRepo('apps/studio-local/src-tauri/src/contracts.rs')
const desktopManifest = readRepo('apps/studio-local/src/desktop-capability-manifest.ts')
const totalSpine = readWeb('scripts/check-v29-total-spine.mjs')
const bootstrapGate = readWeb('scripts/check-v29-bootstrap-reproducibility.mjs')
const browserRunnerStateGate = readWeb('scripts/check-v29-runtime-failure-smoke-browser-runner-state.mjs')
const packageJson = JSON.parse(readWeb('package.json') || '{}')

for (const token of [
  'AETHEL_V29_SIDECAR_LIFECYCLE',
  'V29SidecarLifecycleReport',
  'V29SidecarLifecycleEntry',
  'V29_REQUIRED_SIDECARS',
  'checksum-verified',
  'health-checked',
  'crash-recoverable',
  'update-channel-bound',
  'human-reviewed',
  'buildV29SidecarLifecycleReport',
  'validateV29SidecarLifecycleReport',
  'native renderer ready',
  'signed installer',
]) {
  requireToken('sidecar lifecycle contract', contract, token)
}

for (const token of [
  'accepts a complete sidecar lifecycle manifest',
  'turns missing receipts into blockers',
  'rejects manifests missing required sidecars',
  'rapier-physics: artifact checksum is missing',
]) {
  requireToken('sidecar lifecycle tests', test, token)
}

for (const token of [
  'RuntimeSidecarKind::WgpuRenderer',
  'RuntimeSidecarKind::Ffmpeg',
  'RuntimeSidecarKind::Ffprobe',
  'RuntimeSidecarKind::OnnxRuntime',
  'RuntimeSidecarKind::BrowserOperator',
  'RuntimeSidecarKind::AssetOptimizer',
  'RuntimeSidecarKind::ShaderCompiler',
  'RuntimeSidecarKind::NativeCompiler',
  'RuntimeSidecarKind::RapierPhysics',
  'build_sidecar_capability_manifest',
  'missing_required_sidecars',
]) {
  requireToken('rust sidecar manifest', rustSidecars, token)
}

for (const token of [
  'RuntimeSidecarKind',
  'RuntimeSidecarCapability',
  'RuntimeJobLane',
]) {
  requireToken('rust contracts', rustContracts, token)
}

for (const token of [
  'sidecar-manager',
  'runtime-templates/linux',
  'runtime-templates/macos',
  'runtime-templates/windows',
  'versioned sidecar install/update manifests',
  'certificates, updater signatures',
]) {
  requireToken('desktop capability manifest', desktopManifest, token)
}

for (const requiredTemplate of [
  'runtime-templates/linux/package.json',
  'runtime-templates/macos/package.json',
  'runtime-templates/windows/package.json',
]) {
  if (!fs.existsSync(path.join(REPO_ROOT, requiredTemplate))) failures.push(`${requiredTemplate}: missing`)
}

requireToken('v29 total gate', totalSpine, 'check-v29-sidecar-lifecycle.mjs')
requireToken('v29 total gate', totalSpine, 'gates=33')
requireToken('bootstrap gate count', bootstrapGate, 'gates=33')
requireToken('browser runner gate count', browserRunnerStateGate, 'gates=33')

if (packageJson.scripts?.['qa:v29-sidecar-lifecycle'] !== 'node scripts/check-v29-sidecar-lifecycle.mjs') {
  failures.push('package.json: missing qa:v29-sidecar-lifecycle script')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_SIDECAR_LIFECYCLE.md'),
  `# V29 Sidecar Lifecycle

- Capability: AETHEL_V29_SIDECAR_LIFECYCLE
- Required sidecars: wgpu-renderer, ffmpeg, ffprobe, onnx-runtime, browser-operator, asset-optimizer, shader-compiler, native-compiler, rapier-physics
- Required receipts: checksum, health probe, crash state, update channel, human review
- OS templates: linux, macos, windows
- Release ready: false
- Claims blocked: desktop ready, native renderer ready, signed installer, production ready, Unreal-grade
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[v29-sidecar-lifecycle] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-sidecar-lifecycle] PASS sidecars=9 receipts=checksum+health+crash+update+review releaseHeld=true')
