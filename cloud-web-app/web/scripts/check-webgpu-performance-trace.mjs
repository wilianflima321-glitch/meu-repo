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
  'lib/runtime/webgpu-performance-trace.ts': read('lib/runtime/webgpu-performance-trace.ts'),
  'lib/runtime/webgpu-compute-readiness.ts': read('lib/runtime/webgpu-compute-readiness.ts'),
  '__tests__/runtime/webgpu-performance-trace.test.ts': read('__tests__/runtime/webgpu-performance-trace.test.ts'),
  '__tests__/runtime/webgpu-compute-readiness.test.ts': read('__tests__/runtime/webgpu-compute-readiness.test.ts'),
  'package.json': read('package.json'),
}

requireToken('lib/runtime/webgpu-performance-trace.ts', 'WebGPUPerformanceTraceSummary', 'canonical trace summary type')
requireToken('lib/runtime/webgpu-performance-trace.ts', 'WEBGPU_PERFORMANCE_TRACE_REQUIRED_EVIDENCE', 'required trace evidence list')
requireToken('lib/runtime/webgpu-performance-trace.ts', 'p95FrameMs', 'p95 frame budget')
requireToken('lib/runtime/webgpu-performance-trace.ts', 'droppedFrameRatio', 'dropped-frame budget')
requireToken('lib/runtime/webgpu-performance-trace.ts', 'humanReviewAttached', 'human review gate')
requireToken('lib/runtime/webgpu-performance-trace.ts', 'preview evidence only', 'honest browser preview warning')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'performanceTrace?: WebGPUPerformanceTraceSummary', 'structured trace integrated into compute readiness')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'No structured WebGPU performance trace is attached', 'missing trace blocker')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'WebGPU performance trace is', 'trace status blocker')
requirePattern('__tests__/runtime/webgpu-performance-trace.test.ts', /holds compute evidence when trace reference or samples are missing/, 'missing trace test')
requirePattern('__tests__/runtime/webgpu-performance-trace.test.ts', /blocks traces that exceed frame budgets/, 'over-budget trace test')
requirePattern('__tests__/runtime/webgpu-performance-trace.test.ts', /marks passing traces as needs-review/, 'human review test')
requirePattern('__tests__/runtime/webgpu-compute-readiness.test.ts', /holds compute lanes when structured performance trace is missing/, 'compute readiness trace blocker test')
requireToken('package.json', 'qa:webgpu-performance-trace', 'package QA script')
requirePattern('package.json', /qa:webgpu-compute-readiness && npm run qa:webgpu-performance-trace && npm run qa:studio-local-release-readiness/, 'enterprise gate must run trace after compute readiness')

if (failures.length > 0) {
  console.error(`[webgpu-performance-trace] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[webgpu-performance-trace] PASS budgets=p95+dropped+geometry human-review=required browser=preview-only')
