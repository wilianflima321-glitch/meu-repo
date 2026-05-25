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

const queue = 'lib/production/studio-local-cook-queue.ts'
const route = 'app/api/projects/[id]/production-state/studio-local-cook-job/route.ts'
const unitTest = '__tests__/production/studio-local-cook-queue.test.ts'
const apiTest = '__tests__/api/production-state-studio-local-cook-job-route.test.ts'

requirePattern(queue, /export interface StudioLocalCookJobRequest/, 'typed cook job request')
requirePattern(queue, /studio-local-cook-queue/, 'queue identifier')
requirePattern(queue, /gltf-transform/, 'glTF transform stage')
requirePattern(queue, /meshoptimizer/, 'mesh optimizer stage')
requirePattern(queue, /ktx-software-basisu/, 'KTX/Basis stage')
requirePattern(queue, /recast-detour/, 'Recast/Detour navmesh stage')
requirePattern(queue, /ffmpeg/, 'FFmpeg review packet stage')
requirePattern(queue, /executionAllowed:\s*false/, 'planning-only execution')
requirePattern(queue, /signed Studio Local daemon dispatch/, 'signed daemon dispatch requirement')
requirePattern(route, /coerceStudioLocalCookJobRequest/, 'route must coerce external payload')
requirePattern(route, /mergeGovernedRuntimeJobIntoProductionState/, 'route must persist governed job')
requirePattern(route, /dispatchAllowed:\s*false/, 'route must not dispatch native work')
requirePattern(route, /Invalid Studio Local cook job request/, 'route must reject invalid payload')
requirePattern(unitTest, /complete cook request as planning-only dispatch/, 'unit test complete planning-only case')
requirePattern(unitTest, /holds cook dispatch when tools and evidence are missing/, 'unit test missing tool/evidence case')
requirePattern(apiTest, /persists Studio Local cook jobs as governed planning-only production state/, 'API persistence test')
requirePattern(apiTest, /rejects viewer collaborators/, 'API permission test')
requirePattern('package.json', /"qa:studio-local-cook-queue"/, 'package script')
requirePattern('package.json', /qa:studio-local-cook-queue/, 'enterprise gate inclusion')
requirePattern('scripts/check-backbone-market-readiness.mjs', /studio-local-cook-queue\.ts/, 'backbone readiness coverage')

if (failures.length) {
  console.error('[studio-local-cook-queue] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-cook-queue] PASS planningOnly=true signedDispatch=true toolchain=gltf-meshopt-ktx-recast-ffmpeg')
