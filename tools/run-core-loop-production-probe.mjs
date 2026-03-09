#!/usr/bin/env node

import process from 'node:process'

const DEFAULT_BASE_URL = process.env.AETHEL_BASE_URL || 'http://localhost:3000'
const DEFAULT_RUNS = Number.parseInt(process.env.AETHEL_PROBE_RUNS || '6', 10)
const DEFAULT_PROJECT_ID = process.env.AETHEL_PROJECT_ID || 'default'

function parseArgs(argv) {
  const out = {
    baseUrl: DEFAULT_BASE_URL,
    runs: Number.isFinite(DEFAULT_RUNS) ? DEFAULT_RUNS : 6,
    projectId: DEFAULT_PROJECT_ID,
    token: process.env.AETHEL_TOKEN || process.env.AETHEL_AUTH_TOKEN || '',
    allowUnready: false,
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base-url' && argv[i + 1]) {
      out.baseUrl = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--runs' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.runs = parsed
      i += 1
      continue
    }
    if (arg === '--project-id' && argv[i + 1]) {
      out.projectId = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--token' && argv[i + 1]) {
      out.token = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--allow-unready') {
      out.allowUnready = true
    }
  }

  out.baseUrl = String(out.baseUrl || '').replace(/\/+$/, '')
  out.runs = Math.max(1, Math.min(out.runs, 30))
  out.projectId = String(out.projectId || 'default').trim() || 'default'
  out.token = String(out.token || '').trim()
  return out
}

function ensureToken(token) {
  if (!String(token || '').trim()) {
    console.error(
      '[core-loop-production-probe] missing token: set AETHEL_TOKEN/AETHEL_AUTH_TOKEN or pass --token <jwt>'
    )
    process.exit(1)
  }
}

async function fetchJson(url, options = {}) {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'network_error'
    throw new Error(`request_failed ${url} (${reason})`)
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const reason = payload?.error || payload?.message || `HTTP ${response.status}`
    throw new Error(`${url} (${reason})`)
  }
  return payload
}

function printList(prefix, values) {
  if (!Array.isArray(values)) return
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (!normalized) continue
    console.error(`${prefix}${normalized}`)
  }
}

async function checkAppRuntime(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/health/live`, { method: 'GET' })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  const args = parseArgs(process.argv)
  ensureToken(args.token)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${args.token}`,
    'x-project-id': args.projectId,
  }

  const appRuntimeReachable = await checkAppRuntime(args.baseUrl)
  if (!appRuntimeReachable) {
    console.error(`[core-loop-production-probe] app runtime unreachable at ${args.baseUrl}`)
    console.error('[core-loop-production-probe] command: npm run dev')
    console.error('[core-loop-production-probe] command: npm run qa:production-runtime-readiness')
    process.exit(1)
  }

  const readiness = await fetchJson(`${args.baseUrl}/api/admin/ai/readiness`, {
    method: 'GET',
    headers,
  })
  const runtimeReadiness = readiness?.runtimeReadiness || {}
  const probeReady = runtimeReadiness?.probeReady === true

  if (!probeReady && !args.allowUnready) {
    console.error(
      `[core-loop-production-probe] readiness blocked authReady=${runtimeReadiness?.authReady === true} probeReady=false`
    )
    printList('[core-loop-production-probe] blocker: ', runtimeReadiness?.blockers)
    printList('[core-loop-production-probe] instruction: ', runtimeReadiness?.instructions)
    printList('[core-loop-production-probe] command: ', runtimeReadiness?.recommendedCommands)
    console.error('[core-loop-production-probe] use --allow-unready to bypass the readiness gate')
    process.exit(1)
  }

  console.log(
    `[core-loop-production-probe] readiness authReady=${runtimeReadiness?.authReady === true} probeReady=${probeReady} sampleSize=${Number(readiness?.metrics?.sampleSize || 0)}`
  )

  const payload = await fetchJson(`${args.baseUrl}/api/admin/ai/core-loop-production-probe`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      runs: args.runs,
      projectId: args.projectId,
    }),
  })
  const totals = payload?.metadata?.totals || {}
  const success = Number(totals.applySuccess || 0)
  const blocked = Number(totals.applyBlocked || 0)
  const failed = Number(totals.applyFailed || 0)
  const selectedFile = String(payload?.metadata?.selectedFile || 'n/a')
  const runs = Number(payload?.metadata?.runs || args.runs)
  const total = success + blocked + failed || runs
  const successRate = total > 0 ? success / total : 0

  console.log(
    `[core-loop-production-probe] baseUrl=${args.baseUrl} projectId=${args.projectId} file=${selectedFile} runs=${runs} success=${success} blocked=${blocked} failed=${failed} successRate=${successRate.toFixed(4)}`
  )
}

main().catch((error) => {
  console.error('[core-loop-production-probe] FAIL', error instanceof Error ? error.message : error)
  process.exit(1)
})
