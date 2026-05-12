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
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
  }
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }

  const content = read(relativePath)
  if (!pattern.test(content)) {
    failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
  }
}

requireFile('instrumentation.ts', 'Next.js instrumentation hook must initialize runtime observability')
requirePattern('instrumentation.ts', /initObservability/, 'instrumentation must initialize observability once per runtime')
requirePattern('instrumentation.ts', /NEXT_RUNTIME === 'nodejs'/, 'instrumentation must avoid browser and edge side effects')

requireFile('lib/observability/tracing.ts', 'W3C trace propagation helpers must exist')
requirePattern('lib/observability/tracing.ts', /traceparent/, 'trace helpers must use W3C traceparent propagation')
requirePattern('lib/observability/tracing.ts', /withTraceSpan/, 'trace helpers must expose async span wrappers')
requirePattern('lib/observability/tracing.ts', /AETHEL_TRACE_SAMPLE_RATE/, 'trace sampling must be configurable')
requirePattern('lib/observability/tracing.ts', /x-aethel-trace-id/, 'responses must expose a user-support-friendly trace id')

requireFile('app/api/observability/readiness/route.ts', 'observability readiness route must exist')
requirePattern('app/api/observability/readiness/route.ts', /runtime = 'nodejs'/, 'readiness route must run in nodejs runtime')
requirePattern('app/api/observability/readiness/route.ts', /drainsConfigured/, 'readiness must expose log drain or OTLP configuration state')
requirePattern('app/api/observability/readiness/route.ts', /sentryConfigured/, 'readiness must expose Sentry configuration state')
requirePattern('app/api/observability/readiness/route.ts', /traceHeaders/, 'readiness response must include trace headers')

requireFile('__tests__/server/tracing.test.ts', 'trace helper tests must prevent silent regressions')

if (failures.length) {
  console.error('[observability-readiness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[observability-readiness] PASS instrumentation=true, tracing=true, readiness=true')
