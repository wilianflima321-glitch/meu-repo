#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(rel) {
  const absolute = path.join(ROOT, rel)
  if (!fs.existsSync(absolute)) {
    failures.push(`${rel}: missing`)
    return ''
  }
  return fs.readFileSync(absolute, 'utf8')
}

function requireToken(rel, token, label = token) {
  if (!read(rel).includes(token)) failures.push(`${rel}: missing ${label}`)
}

function requirePattern(rel, pattern, label) {
  if (!pattern.test(read(rel))) failures.push(`${rel}: missing ${label}`)
}

const runner = 'scripts/run-v29-runtime-failure-smoke-local.mjs'
const check = 'scripts/check-v29-runtime-failure-smoke-local-runner.mjs'
const pkg = JSON.parse(read('package.json') || '{}')

for (const token of [
  'RUNTIME_FAILURE_SMOKE_LOCAL_PORT',
  'RUNTIME_FAILURE_SMOKE_LOCAL_SERVER_MODE',
  'RUNTIME_FAILURE_SMOKE_LOCAL_BUILD',
  'RUNTIME_FAILURE_SMOKE_BASE_URL',
  'AUTHENTICATED_UX_LOCAL_API_FALLBACK',
  'AUTHENTICATED_UX_RATE_LIMIT_FALLBACK',
  'AETHEL_RATE_LIMIT_FALLBACK',
  'NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI',
  'scripts/run-v29-runtime-failure-smoke-runner.mjs',
  'build:production',
  'next',
  'start',
  'dev',
  'SIGTERM',
  'SIGKILL',
  'aethel-v29-smoke-',
]) {
  requireToken(runner, token)
}

requirePattern(runner, /JWT_SECRET:\s*jwtSecret/, 'ephemeral JWT secret wiring')
requirePattern(runner, /fetch\(`\$\{BASE_URL\}\/api\/health\/live`/, 'health wait before browser runner')
requirePattern(runner, /server\.kill\('SIGTERM'\)/, 'graceful server shutdown')
requirePattern(runner, /server\.kill\('SIGKILL'\)/, 'forced server shutdown fallback')
requirePattern(runner, /run\(commandName\('node'\), \['scripts\/run-v29-runtime-failure-smoke-runner\.mjs'\]/, 'smoke runner invocation')

if (pkg.scripts?.['runtime:v29-failure-smoke:local'] !== 'node scripts/run-v29-runtime-failure-smoke-local.mjs') {
  failures.push('package.json: missing runtime:v29-failure-smoke:local script')
}

if (pkg.scripts?.['qa:v29-runtime-failure-smoke-local-runner'] !== 'node scripts/check-v29-runtime-failure-smoke-local-runner.mjs') {
  failures.push('package.json: missing qa:v29-runtime-failure-smoke-local-runner script')
}

requireToken('scripts/check-v29-total-spine.mjs', 'check-v29-runtime-failure-smoke-local-runner.mjs', 'V29 total local runner gate')
requireToken(check, 'RUNTIME_FAILURE_SMOKE_LOCAL_SERVER_MODE', 'self-check local server mode token')

if (failures.length) {
  console.error('[v29-runtime-failure-smoke-local-runner] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-runtime-failure-smoke-local-runner] PASS local-server=true smoke-runner=true')
