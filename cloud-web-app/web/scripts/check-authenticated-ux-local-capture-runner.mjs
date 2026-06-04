#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const runnerPath = path.join(ROOT, 'scripts', 'run-authenticated-ux-local-capture.mjs')
const packagePath = path.join(ROOT, 'package.json')
const failures = []

if (!fs.existsSync(runnerPath)) {
  failures.push('missing scripts/run-authenticated-ux-local-capture.mjs')
} else {
  const content = fs.readFileSync(runnerPath, 'utf8')
  for (const token of [
    'AUTHENTICATED_UX_LOCAL_API_FALLBACK',
    'AUTHENTICATED_UX_RATE_LIMIT_FALLBACK',
    'AETHEL_RATE_LIMIT_FALLBACK',
    'NEXT_PUBLIC_AETHEL_EXTERNAL_HDRI',
    'scripts/capture-authenticated-ux-surfaces.mjs',
    'check-authenticated-visual-regression.mjs',
    'AUTHENTICATED_UX_LOCAL_SERVER_MODE',
    'AUTHENTICATED_UX_LOCAL_VERBOSE',
    'build:production',
    'next',
    'start',
    'dev',
    'SIGTERM',
  ]) {
    if (!content.includes(token)) failures.push(`runner missing ${token}`)
  }
  if (/JWT_SECRET\s*=\s*['"][^'"]+['"]/.test(content)) {
    failures.push('runner must not hardcode a static JWT_SECRET')
  }
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
if (pkg.scripts['qa:authenticated-ux-local-capture'] !== 'node scripts/run-authenticated-ux-local-capture.mjs') {
  failures.push('package.json missing qa:authenticated-ux-local-capture script')
}
if (pkg.scripts['qa:authenticated-ux-local-capture-runner'] !== 'node scripts/check-authenticated-ux-local-capture-runner.mjs') {
  failures.push('package.json missing qa:authenticated-ux-local-capture-runner script')
}

if (failures.length > 0) {
  console.error(`[authenticated-ux-local-capture-runner] FAIL ${failures.join(' | ')}`)
  process.exit(1)
}

console.log('[authenticated-ux-local-capture-runner] PASS')
