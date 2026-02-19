#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const REPORT_FILE = path.join(ROOT, 'docs', 'ARCHITECTURE_CRITICAL_TRIAGE.md')

const THRESHOLDS = {
  deprecatedComponents: 0,
  fileCompatUsage: 0,
  workspaceDeprecatedUsage: 0,
  redirectAliases: 0,
  apiNotImplemented: 8,
  fileCompatWrappers: 8,
  duplicateBasenames: 0,
  oversizedFiles: 55,
}

function runScan() {
  execFileSync('node', ['scripts/architecture-critical-scan.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
}

function parseMetric(content, label) {
  const pattern = new RegExp(`- ${label}: \\*\\*(\\d+)\\*\\*`)
  const match = content.match(pattern)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

async function main() {
  runScan()

  const content = await fs.readFile(REPORT_FILE, 'utf8')
  const current = {
    deprecatedComponents: parseMetric(content, 'Deprecated component files \\(`components/_deprecated/\\*`\\)'),
    fileCompatUsage: parseMetric(content, 'Frontend usage of file compatibility routes \\(`/api/files/read\\|write\\|list\\|\\.\\.\\.`\\)'),
    workspaceDeprecatedUsage: parseMetric(content, 'Frontend usage of deprecated workspace routes \\(`/api/workspace/\\*`\\)'),
    redirectAliases: parseMetric(content, 'Redirect alias pages to `/ide\\?entry=`'),
    apiNotImplemented: parseMetric(content, 'API NOT_IMPLEMENTED markers \\(`app/api/\\*\\*/route\\.ts`\\)'),
    fileCompatWrappers: parseMetric(content, 'File API compatibility wrappers \\(`trackCompatibilityRouteHit` in `app/api/files/\\*`\\)'),
    duplicateBasenames: parseMetric(content, 'Duplicate component basenames'),
    oversizedFiles: parseMetric(content, 'Oversized source files \\(>=1200 lines\\)'),
  }

  for (const [metricId, value] of Object.entries(current)) {
    if (value === null || Number.isNaN(value)) {
      console.error(`[architecture-gate] missing metric in report: ${metricId}`)
      process.exit(1)
    }
  }

  const failures = []
  for (const [metricId, limit] of Object.entries(THRESHOLDS)) {
    const value = current[metricId]
    if (value > limit) {
      failures.push(`${metricId}=${value} (limit=${limit})`)
    }
  }

  if (failures.length > 0) {
    console.error(`[architecture-gate] FAIL ${failures.join(', ')}`)
    process.exit(1)
  }

  const summary = Object.entries(current)
    .map(([metricId, value]) => `${metricId}=${value}`)
    .join(', ')

  console.log(`[architecture-gate] PASS ${summary}`)
}

main().catch((error) => {
  console.error('[architecture-gate] ERROR', error)
  process.exit(1)
})
