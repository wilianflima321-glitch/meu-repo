#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function read(relativePath) {
  const fullPath = path.join(REPO_ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function readWeb(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function expectToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

const nativeKernel = read('apps/studio-local/src-tauri/src/native_kernel.rs')
const lib = read('apps/studio-local/src-tauri/src/lib.rs')
const main = read('apps/studio-local/src-tauri/src/main.rs')
const adapter = read('apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts')
const sharedTypes = read('packages/aethel-ide-shared/src/runtime-adapter/types.ts')
const forensicBacklog = readWeb('lib/runtime/v29-forensic-runtime-backlog.ts')
const packageJson = JSON.parse(readWeb('package.json') || '{}')
const totalSpine = readWeb('scripts/check-v29-total-spine.mjs')

for (const token of [
  'NativeKernelManifest',
  'NativeKernelCapability',
  'NativeKernelCrashState',
  'build_native_kernel_manifest',
  'validate_native_kernel_manifest',
  'local-daemon-contract',
  'filesystem-watch-contract',
  'native-pty-contract',
  'crash-recovery-contract',
  'signed-updater-contract',
  'manual-review-before-resume',
  'desktop ready',
  'native terminal ready',
  'signed installer ready',
  'native renderer ready',
]) {
  expectToken('native kernel rust contract', nativeKernel, token)
}

for (const token of [
  'pub mod native_kernel',
  'native_kernel_manifest_blocks_unproven_native_claims',
  'validate_native_kernel_manifest',
]) {
  expectToken('studio local lib', lib, token)
}

for (const token of [
  'build_native_kernel_manifest',
  'NativeKernelManifest',
  'fn native_kernel_manifest()',
  'native_kernel_manifest',
]) {
  expectToken('tauri main command', main, token)
}

for (const token of [
  'NativeKernelManifest',
  'nativeKernelManifest',
  "invoke<NativeKernelManifest>('native_kernel_manifest')",
]) {
  expectToken('desktop adapter native manifest bridge', adapter, token)
}

for (const token of [
  'NativeKernelManifest',
  'NativeKernelCapability',
  'NativeKernelCapabilityState',
  'nativeKernelManifest?(): Promise<NativeKernelManifest>',
]) {
  expectToken('shared runtime types native manifest', sharedTypes, token)
}

for (const token of [
  'studio-local-native-kernel',
  'apps/studio-local/src-tauri/src/native_kernel.rs',
  'qa:v29-studio-local-native-kernel',
]) {
  expectToken('forensic backlog studio local evidence', forensicBacklog, token)
}

if (packageJson.scripts?.['qa:v29-studio-local-native-kernel'] !== 'node scripts/check-v29-studio-local-native-kernel.mjs') {
  failures.push('package.json: missing qa:v29-studio-local-native-kernel')
}
if (!totalSpine.includes('check-v29-studio-local-native-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: missing check-v29-studio-local-native-kernel.mjs')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_STUDIO_LOCAL_NATIVE_KERNEL.md'),
  `# V29 Studio Local Native Kernel

- Tauri command: native_kernel_manifest
- Capabilities: local daemon, filesystem watcher, native PTY, crash recovery, signed updater
- Runtime target: tauri-web-shell-with-native-bridge
- Guard: native execution stays held without receipts
- Failures: ${failures.length}
`,
)

if (failures.length) {
  console.error('[v29-studio-local-native-kernel] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-studio-local-native-kernel] PASS capabilities=5 native-claims=held')
