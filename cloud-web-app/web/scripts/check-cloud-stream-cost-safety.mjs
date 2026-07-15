#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function requireToken(file, token, reason = token) {
  const content = sources[file] ?? ''
  if (!content.includes(token)) failures.push(`${file}: missing ${reason}`)
}

function requirePattern(file, pattern, reason) {
  const content = sources[file] ?? ''
  if (!pattern.test(content)) failures.push(`${file}: missing ${reason}`)
}

const sources = {
  'lib/pixel-streaming/cloud-stream-safety.ts': read('lib/pixel-streaming/cloud-stream-safety.ts'),
  'app/studio/cinematic/CloudStreamStudioClient.tsx': read('app/studio/cinematic/CloudStreamStudioClient.tsx'),
  '__tests__/runtime/cloud-stream-cost-safety.test.ts': read('__tests__/runtime/cloud-stream-cost-safety.test.ts'),
  'package.json': read('package.json'),
}

requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'aethel.cloud-stream.cost-safety', 'capability id')
requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'streamConnectAllowed', 'stream connect guard')
requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'Session cost cap', 'cost cap evidence')
requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'Idle teardown within five minutes', 'idle teardown evidence')
requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'Human review required before release evidence', 'human review evidence')
requireToken('lib/pixel-streaming/cloud-stream-safety.ts', 'Do not claim final, AAA, Unreal-grade, or Pixel Streaming availability', 'claim guard')
requirePattern('lib/pixel-streaming/cloud-stream-safety.ts', /url\.protocol === 'wss:' \|\| url\.protocol === 'https:'/, 'only HTTPS/WSS signaling may pass')

requireToken('app/studio/cinematic/CloudStreamStudioClient.tsx', 'buildCloudStreamSafetyPlan', 'Cloud Stream UI must use safety plan')
requireToken('app/studio/cinematic/CloudStreamStudioClient.tsx', 'cloudSafety.streamConnectAllowed', 'UI connect must be gated by safety')
requireToken('app/studio/cinematic/CloudStreamStudioClient.tsx', 'Cap: $', 'cost cap visible in UI')
requireToken('app/studio/cinematic/CloudStreamStudioClient.tsx', 'Safety plan:', 'blocker visible in UI')

requirePattern('__tests__/runtime/cloud-stream-cost-safety.test.ts', /keeps Cloud Stream held without signaling/, 'held regression')
requirePattern('__tests__/runtime/cloud-stream-cost-safety.test.ts', /runaway GPU spend/, 'cost runaway regression')
requirePattern('__tests__/runtime/cloud-stream-cost-safety.test.ts', /receipts and human review/, 'available regression')

requireToken('package.json', 'qa:cloud-stream-cost-safety', 'package QA script')
requireToken('package.json', 'qa:pixel-streaming-split && npm run qa:cloud-stream-cost-safety && npm run qa:no-fake-success', 'enterprise gate ordering')

if (failures.length > 0) {
  console.error(`[cloud-stream-cost-safety] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[cloud-stream-cost-safety] PASS held-without-session-manager cost-cap=true idle-teardown=true')
