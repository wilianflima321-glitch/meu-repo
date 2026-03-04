#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const LEDGER_ROOT = path.join(ROOT, '.aethel', 'change-ledger')
const DEFAULT_OUTPUT = path.join(ROOT, 'metrics', 'latest_run.json')
const REHEARSAL_RUN_SOURCES = new Set([
  'core_loop_drill',
  'qa_harness',
  'synthetic',
  'simulation',
  'test',
  'ci',
])

function parseArgs(argv) {
  const out = {
    hours: 24 * 7,
    output: DEFAULT_OUTPUT,
    source: 'all',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--hours' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) out.hours = Math.min(parsed, 24 * 365)
      i += 1
      continue
    }
    if (arg === '--output' && argv[i + 1]) {
      out.output = path.resolve(ROOT, argv[i + 1])
      i += 1
      continue
    }
    if (arg === '--source' && argv[i + 1]) {
      const source = String(argv[i + 1] || '').trim().toLowerCase()
      if (source === 'all' || source === 'production' || source === 'rehearsal') {
        out.source = source
      }
      i += 1
    }
  }

  return out
}

function toRootRelative(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/')
}

function parseLine(line) {
  if (!line || !line.trim()) return null
  try {
    const parsed = JSON.parse(line)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.timestamp !== 'string') return null
    if (typeof parsed.eventType !== 'string') return null
    if (typeof parsed.outcome !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function toNumber(value) {
  return Number.isFinite(value) ? value : 0
}

function normalizeRate(numerator, denominator) {
  if (!Number.isFinite(denominator) || denominator <= 0) return 0
  return Number((numerator / denominator).toFixed(4))
}

function readExecutionMode(row) {
  if (!row?.metadata || typeof row.metadata !== 'object') return 'unknown'
  const mode = row.metadata.executionMode
  return typeof mode === 'string' && mode.trim() ? mode.trim() : 'unknown'
}

function collectReasons(row) {
  if (!row?.metadata || typeof row.metadata !== 'object') return null
  const reason = row.metadata.reason
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null
}

function readRunSource(row) {
  if (!row?.metadata || typeof row.metadata !== 'object') return 'production'
  const runSource = row.metadata.runSource
  if (typeof runSource !== 'string') return 'production'
  const normalized = runSource.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, '_')
  return normalized || 'production'
}

function classifySample(row) {
  const source = readRunSource(row)
  return REHEARSAL_RUN_SOURCES.has(source) ? 'rehearsal' : 'production'
}

async function readLedgerRows(hours, sourceScope) {
  const sinceTs = Date.now() - hours * 60 * 60 * 1000
  const files = await fs.readdir(LEDGER_ROOT).catch(() => [])
  const rows = []

  for (const file of files) {
    if (!file.endsWith('.ndjson')) continue
    const abs = path.join(LEDGER_ROOT, file)
    const raw = await fs.readFile(abs, 'utf8').catch(() => null)
    if (!raw) continue
    const lines = raw.split(/\r?\n/)
    for (const line of lines) {
      const row = parseLine(line)
      if (!row) continue
      const ts = new Date(row.timestamp).getTime()
      if (!Number.isFinite(ts) || ts < sinceTs) continue
      if (sourceScope !== 'all' && classifySample(row) !== sourceScope) continue
      rows.push(row)
    }
  }

  return rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

async function main() {
  const args = parseArgs(process.argv)
  const rows = await readLedgerRows(args.hours, args.source)

  const applySuccess = rows.filter((row) => row.eventType === 'apply' && row.outcome === 'success').length
  const applyBlocked = rows.filter((row) => row.eventType === 'apply_blocked' && row.outcome === 'blocked').length
  const applyFailed = rows.filter((row) => row.eventType === 'apply_blocked' && row.outcome === 'failed').length

  const rollbackSuccess = rows.filter((row) => row.eventType === 'rollback' && row.outcome === 'success').length
  const rollbackBlocked = rows.filter((row) => row.eventType === 'rollback_blocked' && row.outcome === 'blocked').length
  const rollbackFailed = rows.filter((row) => row.eventType === 'rollback_blocked' && row.outcome === 'failed').length

  const applyRuns = applySuccess + applyBlocked + applyFailed
  const failedRows = rows.filter((row) => row.outcome === 'failed')
  const regressionRows = failedRows.filter((row) => {
    const reason = collectReasons(row)
    return reason === 'APPLY_WRITE_FAILED' || reason === 'VALIDATION_BLOCKED' || reason === 'CURRENT_HASH_MISMATCH'
  })

  const sandboxApplyRuns = rows.filter(
    (row) => row.eventType === 'apply' && row.outcome === 'success' && readExecutionMode(row) === 'sandbox'
  ).length
  const workspaceApplyRuns = rows.filter(
    (row) => row.eventType === 'apply' && row.outcome === 'success' && readExecutionMode(row) === 'workspace'
  ).length

  const output = {
    generatedAt: new Date().toISOString(),
    windowHours: args.hours,
    sampleClass: args.source,
    sampleSize: applyRuns,
    totals: {
      rows: rows.length,
      applyRuns,
      applySuccess,
      applyBlocked,
      applyFailed,
      rollbackSuccess,
      rollbackBlocked,
      rollbackFailed,
      sandboxApplyRuns,
      workspaceApplyRuns,
    },
    metrics: {
      apply_success_rate: normalizeRate(applySuccess, applyRuns),
      blocked_rate: normalizeRate(applyBlocked, applyRuns),
      regression_rate: normalizeRate(toNumber(regressionRows.length), applyRuns),
      sandbox_coverage: normalizeRate(sandboxApplyRuns, applySuccess),
      workspace_coverage: normalizeRate(workspaceApplyRuns, applySuccess),
    },
    diagnostics: {
      regressionSignals: [...new Set(regressionRows.map((row) => collectReasons(row)).filter(Boolean))],
      runSourceCounts: Object.entries(
        rows.reduce((acc, row) => {
          const source = readRunSource(row)
          acc[source] = (acc[source] || 0) + 1
          return acc
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      lastEventAt: rows.length > 0 ? rows[rows.length - 1].timestamp : null,
    },
  }

  await fs.mkdir(path.dirname(args.output), { recursive: true })
  await fs.writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(
    `[core-loop-metrics] source=${args.source} rows=${rows.length} applyRuns=${applyRuns} output=${toRootRelative(args.output)}`
  )
}

main().catch((error) => {
  console.error('[core-loop-metrics] FAIL', error)
  process.exit(1)
})
