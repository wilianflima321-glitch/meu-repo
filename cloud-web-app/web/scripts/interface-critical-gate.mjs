#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const REPORT_FILE = path.join(ROOT, 'docs', 'INTERFACE_CRITICAL_SWEEP.md')

const THRESHOLDS = {
  'legacy-accent-tokens': 0,
  'admin-light-theme-tokens': 0,
  'admin-status-light-tokens': 0,
  'blocking-browser-dialogs': 0,
  'not-implemented-ui': 6,
  'not-implemented-noncritical': 2,
  'frontend-workspace-route-usage': 0,
  'legacy-editor-shell-usage': 0,
}

function parseMetric(content, metricId) {
  const pattern = new RegExp(`- \\\`${metricId}\\\` \\([^)]*\\): (\\d+)`)
  const match = content.match(pattern)
  if (!match) return null
  return Number.parseInt(match[1], 10)
}

function runScan() {
  execFileSync('node', ['scripts/interface-critical-scan.mjs'], {
    cwd: ROOT,
    stdio: 'inherit',
  })
}

async function main() {
  runScan()

  const content = await fs.readFile(REPORT_FILE, 'utf8')
  const current = {}

  for (const metricId of Object.keys(THRESHOLDS)) {
    const value = parseMetric(content, metricId)
    if (value === null) {
      console.error(`[interface-gate] missing metric in report: ${metricId}`)
      process.exit(1)
    }
    current[metricId] = value
  }

  const failures = []
  for (const [metricId, limit] of Object.entries(THRESHOLDS)) {
    const value = current[metricId]
    if (value > limit) {
      failures.push(`${metricId}=${value} (limit=${limit})`)
    }
  }

  if (failures.length > 0) {
    console.error(`[interface-gate] FAIL ${failures.join(', ')}`)
    process.exit(1)
  }

  const summary = Object.entries(current)
    .map(([metricId, value]) => `${metricId}=${value}`)
    .join(', ')
  console.log(`[interface-gate] PASS ${summary}`)
}

main().catch((error) => {
  console.error('[interface-gate] ERROR', error)
  process.exit(1)
})
