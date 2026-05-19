#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${pattern} (${reason})`)
}

requireFile('lib/server/browser-operator-recorder.ts', 'Browser Operator replay recorder must persist timeline evidence')
requirePattern('lib/server/browser-operator-recorder.ts', /evaluateBrowserOperatorPolicy/, 'recorder must use Browser Operator policy decisions')
requirePattern('lib/server/browser-operator-recorder.ts', /domSnapshotHash/, 'recorder must hash DOM snapshots instead of storing raw DOM')
requirePattern('lib/server/browser-operator-recorder.ts', /timelineHash/, 'recorder must produce a replay timeline hash')
requirePattern('lib/server/browser-operator-recorder.ts', /approval-required/, 'recorder must hold high-risk steps for approval')

requireFile('app/api/agents/browser-operator/runs/[runId]/route.ts', 'Browser Operator replay API must exist')
requirePattern('app/api/agents/browser-operator/runs/[runId]/route.ts', /requireAuth/, 'replay API must require authentication')
requirePattern('app/api/agents/browser-operator/runs/[runId]/route.ts', /pause|resume|approve|cancel/, 'replay API must expose pause/resume/approve/cancel actions')

requireFile('components/agents/BrowserOperatorReplay.tsx', 'Browser Operator replay UI must exist')
requirePattern('components/agents/BrowserOperatorReplay.tsx', /Pause/, 'replay UI must expose pause control')
requirePattern('components/agents/BrowserOperatorReplay.tsx', /Approve/, 'replay UI must expose approval control')
requirePattern('components/agents/BrowserOperatorReplay.tsx', /Evidence/, 'replay UI must show evidence refs')
requirePattern('components/agents/BrowserOperatorReplay.tsx', /Blockers/, 'replay UI must show policy blockers')

requireFile('__tests__/server/browser-operator-recorder.test.ts', 'Browser Operator recorder tests must exist')
requirePattern('__tests__/server/browser-operator-recorder.test.ts', /holds high-risk browser actions until approval/, 'tests must cover approval holds')

requirePattern('package.json', /qa:browser-operator-replay/, 'package scripts must expose browser operator replay QA')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:browser-operator-replay/, 'enterprise gate must include browser operator replay QA')

if (failures.length > 0) {
  console.error('[browser-operator-replay] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[browser-operator-replay] PASS')
