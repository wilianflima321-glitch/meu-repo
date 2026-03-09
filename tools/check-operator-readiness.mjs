#!/usr/bin/env node

import path from 'node:path'
import { spawnSync } from 'node:child_process'

const repoRoot = process.cwd()

const checks = [
  {
    id: 'productionRuntime',
    command: process.execPath,
    args: [path.join(repoRoot, 'tools', 'check-production-runtime-readiness.mjs')],
  },
  {
    id: 'billingRuntime',
    command: process.execPath,
    args: [path.join(repoRoot, 'tools', 'check-billing-runtime-readiness.mjs')],
  },
  {
    id: 'previewRuntime',
    command: process.execPath,
    args: [path.join(repoRoot, 'tools', 'check-preview-runtime-readiness.mjs')],
  },
]

function runCheck(check) {
  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    shell: false,
    encoding: 'utf8',
  })
  const stdout = String(result.stdout || '').trim()
  const stderr = String(result.stderr || '').trim()
  let payload = null
  try {
    payload = stdout ? JSON.parse(stdout) : null
  } catch {
    payload = null
  }
  return {
    id: check.id,
    ok: result.status === 0,
    status: payload?.status || (result.status === 0 ? 'ready' : 'partial'),
    blockers: Array.isArray(payload?.blockers) ? payload.blockers : [],
    instructions: Array.isArray(payload?.instructions) ? payload.instructions : [],
    recommendedCommands: Array.isArray(payload?.recommendedCommands) ? payload.recommendedCommands : [],
    payload,
    rawError: stderr || null,
  }
}

const results = checks.map(runCheck)
const blockers = results.flatMap((result) => result.blockers.map((blocker) => `${result.id}:${blocker}`))
const instructions = Array.from(new Set(results.flatMap((result) => result.instructions).filter(Boolean)))
const recommendedCommands = Array.from(
  new Set(results.flatMap((result) => result.recommendedCommands).filter(Boolean))
)

const summary = {
  status: results.every((result) => result.ok) ? 'ready' : 'partial',
  checks: Object.fromEntries(
    results.map((result) => [
      result.id,
      {
        ok: result.ok,
        status: result.status,
        blockers: result.blockers,
        instructions: result.instructions,
      },
    ])
  ),
  blockers,
  instructions,
  recommendedCommands,
  note: 'Operator readiness aggregates production runtime, billing runtime, and preview runtime preflights.',
}

console.log(JSON.stringify(summary, null, 2))
process.exit(results.every((result) => result.ok) ? 0 : 1)
