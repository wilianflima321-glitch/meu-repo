#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const webLedgerRoot = path.join(repoRoot, 'cloud-web-app', 'web', '.aethel', 'change-ledger')
const repoLedgerRoot = path.join(repoRoot, '.aethel', 'change-ledger')

async function resolveLedgerRoot() {
  const exists = async (p) => {
    try {
      const stat = await fs.stat(p)
      return stat.isDirectory()
    } catch {
      return false
    }
  }
  if (await exists(webLedgerRoot)) return webLedgerRoot
  return repoLedgerRoot
}

function parseArgs(argv) {
  const out = {
    baseUrl: String(process.env.AETHEL_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    token: String(process.env.AETHEL_TOKEN || process.env.AETHEL_AUTH_TOKEN || '').trim(),
    feedback: 'accepted',
    sinceMinutes: 60,
    limit: 200,
    projectId: 'default',
  }
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base-url' && argv[i + 1]) {
      out.baseUrl = String(argv[i + 1]).replace(/\/+$/, '')
      i += 1
      continue
    }
    if (arg === '--token' && argv[i + 1]) {
      out.token = String(argv[i + 1]).trim()
      i += 1
      continue
    }
    if (arg === '--feedback' && argv[i + 1]) {
      const value = String(argv[i + 1]).trim().toLowerCase()
      if (value === 'accepted' || value === 'rejected' || value === 'needs_work') {
        out.feedback = value
      }
      i += 1
      continue
    }
    if (arg === '--since' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.sinceMinutes = Math.min(parsed, 24 * 60)
      i += 1
      continue
    }
    if (arg === '--limit' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.limit = Math.min(parsed, 2000)
      i += 1
      continue
    }
    if (arg === '--project-id' && argv[i + 1]) {
      out.projectId = String(argv[i + 1]).trim() || 'default'
      i += 1
    }
  }
  return out
}

function parseLine(line) {
  if (!line || !line.trim()) return null
  try {
    const parsed = JSON.parse(line)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.timestamp !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function extractRunId(metadata) {
  if (!metadata || typeof metadata !== 'object') return ''
  const runId = metadata.runId
  return typeof runId === 'string' ? runId.trim() : ''
}

function extractRunSource(metadata) {
  if (!metadata || typeof metadata !== 'object') return 'production'
  const raw = metadata.runSource
  if (typeof raw !== 'string') return 'production'
  return raw.trim().toLowerCase() || 'production'
}

async function loadLedgerRows(sinceMs) {
  const root = await resolveLedgerRoot()
  const files = await fs.readdir(root).catch(() => [])
  const rows = []
  for (const file of files) {
    if (!file.endsWith('.ndjson')) continue
    const abs = path.join(root, file)
    const raw = await fs.readFile(abs, 'utf8').catch(() => null)
    if (!raw) continue
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      const row = parseLine(line)
      if (!row) continue
      const ts = new Date(row.timestamp).getTime()
      if (!Number.isFinite(ts) || ts < sinceMs) continue
      rows.push(row)
    }
  }
  return rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

async function postFeedback({ baseUrl, token, projectId, runId, filePath, feedback }) {
  const response = await fetch(`${baseUrl}/api/ai/change/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-project-id': projectId,
    },
    body: JSON.stringify({
      projectId,
      runId,
      filePath,
      feedback,
      notes: 'probe_wave_auto_feedback',
      runSource: 'production',
    }),
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, payload }
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.token) {
    console.error('[core-loop-feedback] missing token: pass --token <jwt> or set AETHEL_TOKEN')
    process.exit(1)
  }
  const sinceMs = Date.now() - args.sinceMinutes * 60 * 1000
  const rows = await loadLedgerRows(sinceMs)

  const feedbackRunIds = new Set(
    rows
      .filter((row) => row.eventType === 'learn_feedback')
      .map((row) => extractRunId(row.metadata))
      .filter(Boolean)
  )

  const applyEvents = rows.filter((row) => row.eventType === 'apply' && row.outcome === 'success')
  const candidates = []
  for (const row of applyEvents) {
    const runId = extractRunId(row.metadata)
    if (!runId || feedbackRunIds.has(runId)) continue
    const runSource = extractRunSource(row.metadata)
    if (runSource !== 'production') continue
    candidates.push({
      runId,
      filePath: row.filePath || '/unknown',
    })
  }

  const unique = []
  const seen = new Set()
  for (const item of candidates) {
    if (seen.has(item.runId)) continue
    seen.add(item.runId)
    unique.push(item)
  }

  const toSend = unique.slice(0, args.limit)
  let submitted = 0
  let skipped = unique.length - toSend.length
  let failed = 0

  for (const item of toSend) {
    const result = await postFeedback({
      baseUrl: args.baseUrl,
      token: args.token,
      projectId: args.projectId,
      runId: item.runId,
      filePath: item.filePath,
      feedback: args.feedback,
    })
    if (result.ok) {
      submitted += 1
      continue
    }
    if (result.payload?.error === 'LEARN_FEEDBACK_ALREADY_EXISTS') {
      skipped += 1
      continue
    }
    failed += 1
  }

  console.log(
    `[core-loop-feedback] since=${args.sinceMinutes}m candidates=${unique.length} submitted=${submitted} skipped=${skipped} failed=${failed}`
  )
}

main().catch((error) => {
  console.error('[core-loop-feedback] FAIL', error instanceof Error ? error.message : error)
  process.exit(1)
})
