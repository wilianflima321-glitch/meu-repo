#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

const requiredFiles = [
  'lib/sequencer/index.ts',
  'lib/sequencer/core/types.ts',
  'lib/sequencer/core/timeline.ts',
  'lib/sequencer/core/track.ts',
  'lib/sequencer/core/clip.ts',
  'lib/sequencer/core/curves.ts',
  'lib/sequencer/core/playhead.ts',
  'lib/sequencer/core/selection.ts',
  'lib/sequencer/core/undo-redo.ts',
  'lib/sequencer/io/timeline-json.ts',
  'lib/sequencer/runtime/render-export.ts',
  '__tests__/sequencer/sequencer-kernel.test.ts',
]

for (const file of requiredFiles) read(file)

requireToken('lib/sequencer/core/types.ts', "schema: 'aethel.timeline.v1'", 'timeline schema')
requireToken('lib/sequencer/core/types.ts', 'SequencerTrackKind', 'track kind contract')
requireToken('lib/sequencer/core/timeline.ts', 'validateSequencerTimeline', 'timeline validator')
requireToken('lib/sequencer/core/timeline.ts', 'Overlapping clips require blend or review evidence', 'overlap review evidence')
requireToken('lib/sequencer/core/curves.ts', 'evaluateSequencerCurve', 'curve evaluator')
requireToken('lib/sequencer/core/undo-redo.ts', 'undoSequencerCommand', 'undo command support')
requireToken('lib/sequencer/io/timeline-json.ts', "schema: 'aethel.timeline-json.v1'", 'JSON envelope schema')
requireToken('lib/sequencer/runtime/render-export.ts', "state: 'held' | 'needs-review'", 'export is held by evidence')
requireToken('lib/runtime/v29-forensic-runtime-backlog.ts', 'sequencer-kernel', 'forensic backlog block')
requireToken('lib/runtime/v29-forensic-runtime-backlog.ts', 'cloud-web-app/web/lib/sequencer/index.ts', 'sequencer evidence ref')

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts?.['qa:v29-sequencer-kernel'] !== 'node scripts/check-v29-sequencer-kernel.mjs') {
  failures.push('package.json: missing qa:v29-sequencer-kernel')
}
const totalSpine = read('scripts/check-v29-total-spine.mjs')
if (!totalSpine.includes('check-v29-sequencer-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: missing check-v29-sequencer-kernel.mjs')
}

const forbiddenFinal = /\b(final video ready|production ready|Unreal-grade|AAA ready)\b/i
for (const file of requiredFiles.filter((candidate) => candidate.endsWith('.ts'))) {
  if (forbiddenFinal.test(read(file))) failures.push(`${file}: contains forbidden final-output claim`)
}

if (failures.length) {
  console.error('[v29-sequencer-kernel] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-sequencer-kernel] PASS timeline=canonical export=held evidence=review-required')
