#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const snapshot = 'lib/runtime/runtime-toolchain-readiness-snapshot.ts'
const route = 'app/api/runtime/toolchain-readiness/route.ts'
const unitTest = '__tests__/runtime/runtime-toolchain-readiness-snapshot.test.ts'
const routeTest = '__tests__/api/runtime-toolchain-readiness-route.test.ts'

requirePattern(snapshot, /AETHEL_RUNTIME_TOOLCHAIN_READINESS/, 'canonical capability id')
requirePattern(snapshot, /detectAethelToolchainEnvironment/, 'environment detector')
requirePattern(snapshot, /buildAethelToolchainReadinessSnapshot/, 'snapshot builder')
requirePattern(snapshot, /AETHEL_RUNTIME_TOOL_IDS/, 'native tool env mapping')
requirePattern(snapshot, /AETHEL_APPROVED_PROCESS_IDS/, 'human process env mapping')
requirePattern(snapshot, /NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL/, 'cloud stream env detection')
requirePattern(snapshot, /configuredServiceIds/, 'service readiness summary')
requirePattern(snapshot, /capabilityStatus/, 'capability status')

requirePattern(route, /requireAuth/, 'route auth guard')
requirePattern(route, /requireEntitlementsForUser/, 'entitlement guard')
requirePattern(route, /coerceAethelToolchainLaneIds/, 'lane query coercion')
requirePattern(route, /x-aethel-capability-status/, 'capability status header')
requirePattern(route, /force-dynamic/, 'fresh runtime readiness response')
requirePattern(route, /NextResponse\.json\(snapshot/, 'stable snapshot response')

requirePattern(unitTest, /without exposing secret values/, 'secret redaction regression')
requirePattern(unitTest, /returns held readiness/, 'held readiness regression')
requirePattern(unitTest, /asset finalization ready only/, 'final asset evidence regression')
requirePattern(routeTest, /protected readiness snapshot/, 'protected route regression')
requirePattern(routeTest, /held capability/, 'held API response regression')
requirePattern(routeTest, /not\.toContain\('sk-secret-value'\)/, 'route secret redaction assertion')

requirePattern('package.json', /"qa:runtime-toolchain-readiness-snapshot"/, 'package script')
requirePattern(
  'package.json',
  /qa:runtime-toolchain-dependency-map && npm run qa:runtime-toolchain-readiness-snapshot && npm run qa:studio-local-ci/,
  'enterprise gate ordering'
)
requirePattern('scripts/check-backbone-market-readiness.mjs', /runtime-toolchain-readiness-snapshot/, 'backbone gate coverage')
requirePattern('scripts/check-backbone-market-readiness.mjs', /AETHEL_RUNTIME_TOOLCHAIN_READINESS/, 'backbone capability token')
requirePattern('tsconfig.typecheck-runtime-spine.json', /app\/api\/runtime\/toolchain-readiness\/route\.ts/, 'runtime typecheck coverage')

if (failures.length) {
  console.error('[runtime-toolchain-readiness-snapshot] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-toolchain-readiness-snapshot] PASS protected=true secretSafe=true envMapped=true')
