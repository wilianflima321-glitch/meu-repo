import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const requiredFiles = [
  'cloud-web-app/web/lib/server/studio-session-store.ts',
  'cloud-web-app/web/app/api/studio/session/start/route.ts',
  'cloud-web-app/web/app/api/studio/session/[id]/route.ts',
  'cloud-web-app/web/app/api/studio/session/[id]/stop/route.ts',
  'cloud-web-app/web/app/api/studio/tasks/run-wave/route.ts',
  'cloud-web-app/web/app/api/studio/tasks/[id]/rollback/route.ts',
  'cloud-web-app/web/__tests__/server/studio-session-store.test.ts',
  'cloud-web-app/web/__tests__/api/studio-session-runtime-routes.test.ts',
  'docs/master/111_STUDIO_SESSION_RUNTIME_2026-05-11.md',
]

for (const path of requiredFiles) assert(existsSync(path), `${path} exists`)

const store = existsSync(requiredFiles[0]) ? read(requiredFiles[0]) : ''
const startRoute = existsSync(requiredFiles[1]) ? read(requiredFiles[1]) : ''
const getRoute = existsSync(requiredFiles[2]) ? read(requiredFiles[2]) : ''
const stopRoute = existsSync(requiredFiles[3]) ? read(requiredFiles[3]) : ''
const runWaveRoute = existsSync(requiredFiles[4]) ? read(requiredFiles[4]) : ''
const rollbackRoute = existsSync(requiredFiles[5]) ? read(requiredFiles[5]) : ''
const storeTest = existsSync(requiredFiles[6]) ? read(requiredFiles[6]) : ''
const apiTest = existsSync(requiredFiles[7]) ? read(requiredFiles[7]) : ''
const doc = existsSync(requiredFiles[8]) ? read(requiredFiles[8]) : ''
const packageJson = read('package.json')
const quality = read('tools/measure-product-quality.mjs')

for (const phrase of [
  'StudioSessionRecord',
  'createStudioSession',
  'loadStudioSession',
  'stopStudioSession',
  'attachStudioSessionTask',
  'activeTaskIds',
  'evidenceRefs',
]) {
  assert(store.includes(phrase), `studio session store includes ${phrase}`)
}

for (const [label, source] of [
  ['start route', startRoute],
  ['get route', getRoute],
  ['stop route', stopRoute],
  ['run-wave route', runWaveRoute],
  ['rollback route', rollbackRoute],
]) {
  assert(!source.includes('studioNotImplemented'), `${label} no longer returns studioNotImplemented`)
  assert(source.includes('requireAuth'), `${label} requires auth`)
  assert(source.includes('requireEntitlementsForUser'), `${label} requires entitlements`)
}

for (const phrase of ['MAX_WAVE_AGENTS', 'STUDIO_SESSION_STOPPED', 'mission-ledger://', 'createTask']) {
  assert(runWaveRoute.includes(phrase), `run-wave route includes ${phrase}`)
}

for (const phrase of ['/api/ai/change/rollback', 'MISSING_ROLLBACK_REFERENCE', 'Rollback completed.', 'updateTaskStatus']) {
  assert(rollbackRoute.includes(phrase), `rollback route includes ${phrase}`)
}

for (const phrase of [
  'creates, loads, attaches tasks, and stops a durable Studio session',
  'operator pause',
]) {
  assert(storeTest.includes(phrase), `store test covers ${phrase}`)
}

for (const phrase of [
  'starts, reads, stops, and blocks waves after a Studio session is stopped',
  'creates a bounded parallel task wave',
  'STUDIO_SESSION_STOPPED',
]) {
  assert(apiTest.includes(phrase), `api test covers ${phrase}`)
}

for (const phrase of [
  'Studio Session Runtime',
  'Mission Ledger',
  'parallel task wave',
  'stop/cancel',
  'rollback',
  'no fake success',
]) {
  assert(doc.includes(phrase), `doc includes ${phrase}`)
}

assert(packageJson.includes('qa:studio-session-runtime'), 'package exposes qa:studio-session-runtime')
assert(packageJson.includes('check-studio-session-runtime-gate'), 'package references session runtime gate')
assert(quality.includes('studioSessionRuntimeConfigured'), 'product quality metrics include studio session runtime')
assert(quality.includes('studio_session_runtime'), 'product quality metrics expose studio_session_runtime')

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Studio session runtime gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Studio session runtime gate passed (${checks.length} checks).`)
