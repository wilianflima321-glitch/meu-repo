import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const requiredFiles = [
  'apps/studio-local/package.json',
  'apps/studio-local/src/index.html',
  'apps/studio-local/src-tauri/Cargo.toml',
  'apps/studio-local/src-tauri/tauri.conf.json',
  'apps/studio-local/src-tauri/src/main.rs',
  'apps/studio-local/src-tauri/src/lib.rs',
  'apps/studio-local/src-tauri/src/contracts.rs',
  'apps/studio-local/src-tauri/src/probe.rs',
  'apps/studio-local/src-tauri/src/policy.rs',
  'apps/studio-local/src-tauri/src/jobs.rs',
  'apps/studio-local/src-tauri/src/daemon.rs',
  'packages/runtime-contracts/package.json',
  'packages/runtime-contracts/src/index.ts',
  'cloud-web-app/web/lib/server/studio-local-sync-signature.ts',
  'cloud-web-app/web/__tests__/server/studio-local-sync-signature.test.ts',
  'docs/master/108_STUDIO_LOCAL_RUNTIME_KERNEL_2026-05-05.md',
]

for (const path of requiredFiles) {
  assert(existsSync(path), `${path} exists`)
}

const rootPackage = read('package.json')
const appPackage = read('apps/studio-local/package.json')
const contracts = existsSync('packages/runtime-contracts/src/index.ts') ? read('packages/runtime-contracts/src/index.ts') : ''
const cargo = existsSync('apps/studio-local/src-tauri/Cargo.toml') ? read('apps/studio-local/src-tauri/Cargo.toml') : ''
const tauriConfig = existsSync('apps/studio-local/src-tauri/tauri.conf.json') ? read('apps/studio-local/src-tauri/tauri.conf.json') : ''
const rustContracts = existsSync('apps/studio-local/src-tauri/src/contracts.rs') ? read('apps/studio-local/src-tauri/src/contracts.rs') : ''
const rustPolicy = existsSync('apps/studio-local/src-tauri/src/policy.rs') ? read('apps/studio-local/src-tauri/src/policy.rs') : ''
const rustDaemon = existsSync('apps/studio-local/src-tauri/src/daemon.rs') ? read('apps/studio-local/src-tauri/src/daemon.rs') : ''
const rustJobs = existsSync('apps/studio-local/src-tauri/src/jobs.rs') ? read('apps/studio-local/src-tauri/src/jobs.rs') : ''
const rustLib = existsSync('apps/studio-local/src-tauri/src/lib.rs') ? read('apps/studio-local/src-tauri/src/lib.rs') : ''
const localRuntimeBridge = existsSync('cloud-web-app/web/lib/device/local-runtime-bridge.ts')
  ? read('cloud-web-app/web/lib/device/local-runtime-bridge.ts')
  : ''
const localRuntimeRouteTest = existsSync('cloud-web-app/web/__tests__/api/local-runtime-capabilities-route.test.ts')
  ? read('cloud-web-app/web/__tests__/api/local-runtime-capabilities-route.test.ts')
  : ''
const syncSignature = existsSync('cloud-web-app/web/lib/server/studio-local-sync-signature.ts')
  ? read('cloud-web-app/web/lib/server/studio-local-sync-signature.ts')
  : ''
const syncSignatureTest = existsSync('cloud-web-app/web/__tests__/server/studio-local-sync-signature.test.ts')
  ? read('cloud-web-app/web/__tests__/server/studio-local-sync-signature.test.ts')
  : ''
const doc = existsSync('docs/master/108_STUDIO_LOCAL_RUNTIME_KERNEL_2026-05-05.md') ? read('docs/master/108_STUDIO_LOCAL_RUNTIME_KERNEL_2026-05-05.md') : ''
const envExample = existsSync('.env.example') ? read('.env.example') : ''

for (const phrase of [
  'desktop:dev',
  'desktop:build',
  'desktop:test',
  'qa:studio-local-runtime',
  'check-studio-local-runtime-gate',
]) {
  assert(rootPackage.includes(phrase), `root package includes ${phrase}`)
}

assert(!rootPackage.includes('desktop-app not present'), 'desktop scripts no longer fake-skip missing desktop app')
assert(appPackage.includes('npx tauri dev'), 'Studio Local dev script runs Tauri')
assert(appPackage.includes('cargo test'), 'Studio Local test script runs cargo test')
assert(appPackage.includes('check-studio-local-prereqs'), 'Studio Local scripts check prerequisites explicitly')
assert(cargo.includes('tauri ='), 'Cargo manifest includes Tauri dependency')
assert(tauriConfig.includes('Aethel Studio Local'), 'Tauri config names Aethel Studio Local')

for (const phrase of [
  'STUDIO_LOCAL_ENDPOINTS',
  'LocalRuntimeProbeReport',
  'RuntimeJobRequest',
  'RuntimeJobStatus',
  'RuntimeCloudSyncSigningPayload',
  'buildRuntimeCloudSyncSigningPayload',
  'ai-local-inference',
  'memory-indexing',
  'asset-import',
  'viewport-render',
  'build-export',
  'browser-operator',
  'file-sync',
  'playtest',
  'render-queue',
  'resolveSafeRuntimeTarget',
]) {
  assert(contracts.includes(phrase), `runtime contracts include ${phrase}`)
}

for (const phrase of [
  'LocalRuntimeProbeReport',
  'RuntimeJobLane',
  'RuntimeJobRequest',
  'RuntimeJobStatus',
  'RuntimeExecutionTarget',
  'ThermalState',
  'StoragePressure',
]) {
  assert(rustContracts.includes(phrase), `Rust contracts include ${phrase}`)
}

for (const phrase of [
  'ThermalState::Critical',
  'StoragePressure::Critical',
  'CloudSandbox',
  'LocalNative',
  'requires_human_approval',
]) {
  assert(rustPolicy.includes(phrase), `Rust policy includes ${phrase}`)
}

for (const phrase of [
  'HEALTH_ENDPOINT',
  'PROBE_ENDPOINT',
  'JOBS_ENDPOINT',
  'SYNC_CLOUD_ENDPOINT',
  '/jobs/',
  '/cancel',
]) {
  assert(rustDaemon.includes(phrase), `Rust daemon exposes ${phrase}`)
}

for (const phrase of [
  'RuntimeJobStoreSnapshot',
  'from_persistence_path',
  'recover_from_disk',
  'RECOVERED_JOB_BLOCKER',
  'persist_snapshot',
  'last_persistence_error',
]) {
  assert(rustJobs.includes(phrase), `Rust job store includes crash recovery primitive ${phrase}`)
}

for (const phrase of [
  'persisted_running_jobs_recover_as_held_after_restart',
  'persisted_cancelled_jobs_stay_cancelled_after_restart',
]) {
  assert(rustLib.includes(phrase), `Rust tests cover persisted job recovery ${phrase}`)
}

for (const phrase of [
  'normalizeStudioLocalProbeReport',
  'generatedAt',
  'cpuLogicalCores',
  'storagePressure',
  "'held'",
  'native-daemon',
  'api-sync',
]) {
  assert(localRuntimeBridge.includes(phrase), `cloud bridge normalizes Studio Local probe field ${phrase}`)
}

for (const phrase of [
  'accepts Studio Local Runtime Kernel probe payloads',
  'rejects unsigned Studio Local api-sync probes',
  'accepts signed Studio Local api-sync probes',
  'studio-local-device',
  'preferredExecutor',
  'maxLocalAgents',
]) {
  assert(localRuntimeRouteTest.includes(phrase), `local runtime route test covers ${phrase}`)
}

for (const phrase of [
  'AETHEL_STUDIO_LOCAL_SYNC_SECRET',
  'buildStudioLocalSyncSigningPayload',
  'verifyStudioLocalSyncSignature',
  'timingSafeEqual',
  'STUDIO_LOCAL_SYNC_SIGNATURE_STALE',
  'STUDIO_LOCAL_SYNC_SIGNATURE_INVALID',
]) {
  assert(syncSignature.includes(phrase), `Studio Local sync signature helper includes ${phrase}`)
}

for (const phrase of [
  'signs and verifies a fresh Studio Local sync payload',
  'rejects stale or tampered signatures',
  'stableStringifyStudioLocalSync',
]) {
  assert(syncSignatureTest.includes(phrase), `Studio Local sync signature test covers ${phrase}`)
}

assert(envExample.includes('AETHEL_STUDIO_LOCAL_SYNC_SECRET'), 'env example documents Studio Local sync secret')

for (const phrase of [
  'Tauri + Rust',
  'Runtime Kernel',
  'signed cloud sync',
  'job crash recovery',
  'local-native',
  'cloud-sandbox',
  'held',
  'Project Brain',
  'Mission Ledger',
  'Repository Cartography',
  'Browser Operator',
  'Unreal parity',
]) {
  assert(doc.includes(phrase), `Studio Local doc includes ${phrase}`)
}

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Studio Local runtime gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Studio Local runtime gate passed (${checks.length} checks).`)
