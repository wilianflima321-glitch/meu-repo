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

const spine = 'lib/production/studio-local-cook-dispatch.ts'
const route = 'app/api/projects/[id]/production-state/studio-local-cook-dispatch/route.ts'
const unitTest = '__tests__/production/studio-local-cook-dispatch.test.ts'
const apiTest = '__tests__/api/production-state-studio-local-cook-dispatch-route.test.ts'

requirePattern(spine, /export interface StudioLocalDispatchApproval/, 'signed dispatch approval contract')
requirePattern(spine, /canonicalStudioLocalCookDispatchPayload/, 'canonical signing payload')
requirePattern(spine, /createHmac\('sha256'/, 'HMAC SHA-256 signing')
requirePattern(spine, /timingSafeEqual/, 'constant-time signature comparison')
requirePattern(spine, /signed Studio Local daemon dispatch/, 'signed daemon dispatch evidence')
requirePattern(spine, /fresh Studio Local capability probe/, 'fresh capability evidence')
requirePattern(spine, /dispatchAllowed/, 'dispatchAllowed decision flag')
requirePattern(spine, /approvedForQueue: dispatchAllowed/, 'governed runtime queue approval wiring')
requirePattern(route, /STUDIO_LOCAL_DISPATCH_SECRET/, 'server-side dispatch signing secret')
requirePattern(route, /status: 503/, 'missing signing config response')
requirePattern(route, /status: 409/, 'blocked dispatch response')
requirePattern(route, /mergeGovernedRuntimeJobIntoProductionState/, 'production-state persistence')
requirePattern(unitTest, /queues a governed native cook dispatch/, 'valid dispatch regression')
requirePattern(unitTest, /blocks dispatch when the signature does not match/, 'invalid signature regression')
requirePattern(apiTest, /keeping release human-gated/, 'release hold regression')
requirePattern(apiTest, /Studio Local dispatch signing is not configured/, 'missing secret regression')
requirePattern('package.json', /"qa:studio-local-cook-dispatch"/, 'package script')
requirePattern('package.json', /qa:studio-local-cook-queue && npm run qa:studio-local-cook-dispatch && npm run qa:production-release-guard/, 'enterprise gate ordering')
requirePattern('scripts/check-backbone-market-readiness.mjs', /studio-local-cook-dispatch/, 'backbone gate dispatch coverage')

if (failures.length) {
  console.error('[studio-local-cook-dispatch] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[studio-local-cook-dispatch] PASS signedDispatch=true releaseHeld=true')
