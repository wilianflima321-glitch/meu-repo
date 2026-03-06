#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const LEDGER_ROOT = path.join(ROOT, '.aethel', 'change-ledger')

function parseArgs(argv) {
  const out = {
    runs: 12,
    userId: 'core-loop-drill',
    projectId: 'core-loop-drill',
  }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--runs' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        out.runs = Math.max(1, Math.min(parsed, 200))
      }
      i += 1
      continue
    }
    if (arg === '--user-id' && argv[i + 1]) {
      out.userId = String(argv[i + 1]).trim() || out.userId
      i += 1
      continue
    }
    if (arg === '--project-id' && argv[i + 1]) {
      out.projectId = String(argv[i + 1]).trim() || out.projectId
      i += 1
    }
  }

  return out
}

function toUtcDateString(date) {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
}

function parseRow(line) {
  if (!line || !line.trim()) return null
  try {
    const parsed = JSON.parse(line)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

async function readLastHash(filePath) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
  if (!raw) return null
  const lines = raw.split(/\r?\n/)
  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    const row = parseRow(lines[idx])
    if (!row) continue
    if (typeof row.eventHash === 'string' && row.eventHash.trim()) return row.eventHash.trim()
    return null
  }
  return null
}

function computeEventHash(payload) {
  const canonical = stableStringify(payload)
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

function buildRow({ timestamp, prevHash, event }) {
  const eventId = crypto.randomUUID()
  const eventHash = computeEventHash({
    timestamp,
    eventId,
    prevHash,
    event,
  })

  return {
    timestamp,
    eventId,
    prevHash,
    eventHash,
    ...event,
  }
}

async function main() {
  const args = parseArgs(process.argv)
  const now = new Date()
  const ledgerFile = path.join(LEDGER_ROOT, `${toUtcDateString(now)}.ndjson`)

  await fs.mkdir(LEDGER_ROOT, { recursive: true })
  let prevHash = await readLastHash(ledgerFile)
  const lines = []
  const summary = {
    runsRequested: args.runs,
    applySuccess: 0,
    applyBlocked: 0,
    rollbackSuccess: 0,
  }

  for (let i = 0; i < args.runs; i += 1) {
    const runId = `drill_${Date.now().toString(36)}_${i.toString(36)}`
    const timestamp = new Date(Date.now() + i * 3).toISOString()
    const executionMode = i % 2 === 0 ? 'sandbox' : 'workspace'
    const filePath = `/drill/${i % 2 === 0 ? 'sandbox' : 'workspace'}/example-${i}.ts`

    if (i % 5 === 0) {
      const blockedEvent = {
        eventType: 'apply_blocked',
        capability: 'AI_CHANGE_APPLY',
        userId: args.userId,
        projectId: args.projectId,
        filePath,
        outcome: 'blocked',
        metadata: {
          runId,
          runSource: 'core_loop_drill',
          executionMode,
          reason: 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED',
          drillScenario: 'approval_gate',
        },
      }
      const row = buildRow({ timestamp, prevHash, event: blockedEvent })
      lines.push(JSON.stringify(row))
      prevHash = row.eventHash
      summary.applyBlocked += 1
      continue
    }

    const applyEvent = {
      eventType: 'apply',
      capability: 'AI_CHANGE_APPLY',
      userId: args.userId,
      projectId: args.projectId,
      filePath,
      outcome: 'success',
      metadata: {
        runId,
        runSource: 'core_loop_drill',
        executionMode,
        dependencyGraphRisk: executionMode === 'sandbox' ? 'low' : 'medium',
        drillScenario: 'deterministic_apply',
        rollbackToken: `drill_rb_${runId}`,
      },
    }
    const applyRow = buildRow({ timestamp, prevHash, event: applyEvent })
    lines.push(JSON.stringify(applyRow))
    prevHash = applyRow.eventHash
    summary.applySuccess += 1

    const learnFeedbackEvent = {
      eventType: 'learn_feedback',
      capability: 'AI_CHANGE_LEARN',
      userId: args.userId,
      projectId: args.projectId,
      filePath,
      outcome: 'success',
      metadata: {
        runId,
        runSource: 'core_loop_drill',
        executionMode,
        feedback: i % 4 === 0 ? 'needs_work' : 'accepted',
        reason: i % 4 === 0 ? 'DRILL_QUALITY_REVIEW' : 'DRILL_APPLY_ACCEPTED',
        drillScenario: 'learn_feedback_capture',
      },
    }
    const feedbackRow = buildRow({
      timestamp: new Date(Date.now() + i * 3 + 1).toISOString(),
      prevHash,
      event: learnFeedbackEvent,
    })
    lines.push(JSON.stringify(feedbackRow))
    prevHash = feedbackRow.eventHash

    if (i % 3 === 0) {
      const rollbackEvent = {
        eventType: 'rollback',
        capability: 'AI_CHANGE_ROLLBACK',
        userId: args.userId,
        projectId: args.projectId,
        filePath,
        outcome: 'success',
        metadata: {
          runId,
          runSource: 'core_loop_drill',
          executionMode,
          drillScenario: 'rollback_recovery',
        },
      }
      const rollbackRow = buildRow({
        timestamp: new Date(Date.now() + i * 3 + 2).toISOString(),
        prevHash,
        event: rollbackEvent,
      })
      lines.push(JSON.stringify(rollbackRow))
      prevHash = rollbackRow.eventHash
      summary.rollbackSuccess += 1
    }
  }

  await fs.appendFile(ledgerFile, `${lines.join('\n')}\n`, 'utf8')

  const output = {
    generatedAt: new Date().toISOString(),
    ledgerFile: path.relative(ROOT, ledgerFile).replace(/\\/g, '/'),
    ...summary,
  }
  const outputPath = path.join(ROOT, 'metrics', 'core-loop-drill-latest.json')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

  console.log(
    `[core-loop-drill] applySuccess=${summary.applySuccess} applyBlocked=${summary.applyBlocked} rollbackSuccess=${summary.rollbackSuccess}`
  )
  console.log(`[core-loop-drill] metrics=metrics/core-loop-drill-latest.json`)
}

main().catch((error) => {
  console.error('[core-loop-drill] FAIL', error)
  process.exit(1)
})
