import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const LEDGER_ROOT = path.resolve(process.cwd(), '.aethel', 'change-ledger')
const DEFAULT_LOOKBACK_DAYS = 14
const REHEARSAL_RUN_SOURCES = new Set([
  'core_loop_drill',
  'qa_harness',
  'synthetic',
  'simulation',
  'test',
  'ci',
])

export interface ChangeRunLedgerEvent {
  eventType: 'apply' | 'rollback' | 'apply_blocked' | 'rollback_blocked'
  capability: 'AI_CHANGE_APPLY' | 'AI_CHANGE_ROLLBACK'
  userId: string
  projectId: string
  filePath: string
  outcome: 'success' | 'blocked' | 'failed'
  metadata?: Record<string, unknown>
}

export interface ChangeRunLedgerRow extends ChangeRunLedgerEvent {
  timestamp: string
  eventId?: string
  prevHash?: string | null
  eventHash?: string
}

export type ChangeRunSampleClass = 'production' | 'rehearsal'

export interface ChangeRunLedgerSummary {
  total: number
  applySuccess: number
  applyBlocked: number
  applyFailed: number
  rollbackSuccess: number
  rollbackBlocked: number
  rollbackFailed: number
  successRate: number
}

export interface ChangeRunLedgerGroup {
  runId: string
  firstTimestamp: string
  lastTimestamp: string
  eventCount: number
  applyCount: number
  rollbackCount: number
  blockedCount: number
  failedCount: number
  successCount: number
  finalOutcome: 'success' | 'blocked' | 'failed'
  files: string[]
  executionModes: string[]
  runSources: string[]
  sampleClass: ChangeRunSampleClass
}

function buildLedgerFilePath(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  return path.join(LEDGER_ROOT, `${yyyy}-${mm}-${dd}.ndjson`)
}

function toUtcDateString(date: Date): string {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseRow(line: string): ChangeRunLedgerRow | null {
  if (!line.trim()) return null
  try {
    const parsed = JSON.parse(line) as ChangeRunLedgerRow
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.timestamp !== 'string') return null
    if (typeof parsed.userId !== 'string') return null
    if (typeof parsed.eventType !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}

function computeEventHash(payload: {
  timestamp: string
  eventId: string
  prevHash: string | null
  event: ChangeRunLedgerEvent
}): string {
  const canonical = stableStringify({
    timestamp: payload.timestamp,
    eventId: payload.eventId,
    prevHash: payload.prevHash,
    event: payload.event,
  })
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

async function readLastLedgerHash(filePath: string): Promise<string | null> {
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

async function listLedgerFiles(daysLookback = DEFAULT_LOOKBACK_DAYS): Promise<string[]> {
  const files: string[] = []
  for (let i = 0; i < daysLookback; i += 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    files.push(path.join(LEDGER_ROOT, `${toUtcDateString(date)}.ndjson`))
  }
  return files
}

export async function appendChangeRunLedgerEvent(event: ChangeRunLedgerEvent): Promise<void> {
  await fs.mkdir(LEDGER_ROOT, { recursive: true })
  const timestamp = new Date().toISOString()
  const filePath = buildLedgerFilePath()
  const prevHash = await readLastLedgerHash(filePath)
  const eventId = crypto.randomUUID()
  const eventHash = computeEventHash({
    timestamp,
    eventId,
    prevHash,
    event,
  })
  const line = JSON.stringify({
    timestamp,
    eventId,
    prevHash,
    eventHash,
    ...event,
  })
  await fs.appendFile(filePath, `${line}\n`, 'utf8')
}

export async function readChangeRunLedgerEvents(options?: {
  userId?: string
  eventTypes?: ChangeRunLedgerEvent['eventType'][]
  outcomes?: ChangeRunLedgerEvent['outcome'][]
  sinceIso?: string
  limit?: number
  daysLookback?: number
}): Promise<ChangeRunLedgerRow[]> {
  const files = await listLedgerFiles(options?.daysLookback)
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 1000))
  const sinceTimestamp =
    options?.sinceIso && !Number.isNaN(new Date(options.sinceIso).getTime())
      ? new Date(options.sinceIso).getTime()
      : null

  const rows: ChangeRunLedgerRow[] = []
  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
    if (!raw) continue
    const lines = raw.split(/\r?\n/)
    for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
      const row = parseRow(lines[idx])
      if (!row) continue
      if (sinceTimestamp && new Date(row.timestamp).getTime() < sinceTimestamp) continue
      if (options?.userId && row.userId !== options.userId) continue
      if (options?.eventTypes && options.eventTypes.length > 0 && !options.eventTypes.includes(row.eventType)) continue
      if (options?.outcomes && options.outcomes.length > 0 && !options.outcomes.includes(row.outcome)) continue
      rows.push(row)
      if (rows.length >= limit) {
        return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    }
  }

  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function summarizeChangeRunLedger(rows: ChangeRunLedgerRow[]): ChangeRunLedgerSummary {
  let applySuccess = 0
  let applyBlocked = 0
  let applyFailed = 0
  let rollbackSuccess = 0
  let rollbackBlocked = 0
  let rollbackFailed = 0

  for (const row of rows) {
    if (row.eventType === 'apply') applySuccess += 1
    if (row.eventType === 'apply_blocked' && row.outcome === 'blocked') applyBlocked += 1
    if (row.eventType === 'apply_blocked' && row.outcome === 'failed') applyFailed += 1
    if (row.eventType === 'rollback') rollbackSuccess += 1
    if (row.eventType === 'rollback_blocked' && row.outcome === 'blocked') rollbackBlocked += 1
    if (row.eventType === 'rollback_blocked' && row.outcome === 'failed') rollbackFailed += 1
  }

  const successDenominator = applySuccess + applyBlocked + applyFailed
  const successRate = successDenominator > 0 ? applySuccess / successDenominator : 1

  return {
    total: rows.length,
    applySuccess,
    applyBlocked,
    applyFailed,
    rollbackSuccess,
    rollbackBlocked,
    rollbackFailed,
    successRate,
  }
}

function extractRunId(row: ChangeRunLedgerRow): string {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null
  const runId = typeof meta?.runId === 'string' ? meta.runId.trim() : ''
  if (runId) return runId
  return `ungrouped:${row.timestamp}`
}

function extractExecutionMode(row: ChangeRunLedgerRow): string | null {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null
  const executionMode = typeof meta?.executionMode === 'string' ? meta.executionMode.trim() : ''
  if (!executionMode) return null
  return executionMode
}

function normalizeRunSource(value: unknown): string {
  if (typeof value !== 'string') return 'production'
  const normalized = value.trim().toLowerCase()
  if (!normalized) return 'production'
  return normalized.replace(/[^a-z0-9._:-]+/g, '_')
}

export function extractRunSource(row: ChangeRunLedgerRow): string {
  const meta = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : null
  return normalizeRunSource(meta?.runSource)
}

export function classifyChangeRunSample(row: ChangeRunLedgerRow): ChangeRunSampleClass {
  const source = extractRunSource(row)
  return REHEARSAL_RUN_SOURCES.has(source) ? 'rehearsal' : 'production'
}

export function filterChangeRunLedgerBySample(
  rows: ChangeRunLedgerRow[],
  sampleClass: ChangeRunSampleClass | 'all'
): ChangeRunLedgerRow[] {
  if (sampleClass === 'all') return rows
  return rows.filter((row) => classifyChangeRunSample(row) === sampleClass)
}

export function summarizeChangeRunGroups(rows: ChangeRunLedgerRow[], limit = 50): ChangeRunLedgerGroup[] {
  const grouped = new Map<
    string,
    {
      runId: string
      firstTimestamp: string
      lastTimestamp: string
      eventCount: number
      applyCount: number
      rollbackCount: number
      blockedCount: number
      failedCount: number
      successCount: number
      files: Set<string>
      executionModes: Set<string>
      runSources: Set<string>
    }
  >()

  for (const row of rows) {
    const runId = extractRunId(row)
    const existing = grouped.get(runId)
    const base =
      existing ??
      {
        runId,
        firstTimestamp: row.timestamp,
        lastTimestamp: row.timestamp,
        eventCount: 0,
        applyCount: 0,
        rollbackCount: 0,
        blockedCount: 0,
        failedCount: 0,
        successCount: 0,
        files: new Set<string>(),
        executionModes: new Set<string>(),
        runSources: new Set<string>(),
      }

    base.eventCount += 1
    if (row.eventType === 'apply') base.applyCount += 1
    if (row.eventType === 'rollback') base.rollbackCount += 1
    if (row.outcome === 'blocked') base.blockedCount += 1
    if (row.outcome === 'failed') base.failedCount += 1
    if (row.outcome === 'success') base.successCount += 1
    if (row.filePath) base.files.add(row.filePath)
    const executionMode = extractExecutionMode(row)
    if (executionMode) base.executionModes.add(executionMode)
    base.runSources.add(extractRunSource(row))
    if (new Date(row.timestamp).getTime() < new Date(base.firstTimestamp).getTime()) base.firstTimestamp = row.timestamp
    if (new Date(row.timestamp).getTime() > new Date(base.lastTimestamp).getTime()) base.lastTimestamp = row.timestamp
    grouped.set(runId, base)
  }

  return [...grouped.values()]
    .map((group) => {
      const finalOutcome: ChangeRunLedgerGroup['finalOutcome'] =
        group.failedCount > 0 ? 'failed' : group.blockedCount > 0 ? 'blocked' : 'success'
      const runSources = [...group.runSources]
      const rehearsalSources = runSources.filter((source) => REHEARSAL_RUN_SOURCES.has(source))
      const sampleClass: ChangeRunLedgerGroup['sampleClass'] =
        rehearsalSources.length > 0 && rehearsalSources.length === runSources.length
          ? 'rehearsal'
          : 'production'
      return {
        runId: group.runId,
        firstTimestamp: group.firstTimestamp,
        lastTimestamp: group.lastTimestamp,
        eventCount: group.eventCount,
        applyCount: group.applyCount,
        rollbackCount: group.rollbackCount,
        blockedCount: group.blockedCount,
        failedCount: group.failedCount,
        successCount: group.successCount,
        finalOutcome,
        files: [...group.files].slice(0, 50),
        executionModes: [...group.executionModes],
        runSources,
        sampleClass,
      }
    })
    .sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime())
    .slice(0, Math.max(1, Math.min(limit, 200)))
}

export async function verifyChangeRunLedgerIntegrity(options?: {
  daysLookback?: number
}): Promise<{
  filesChecked: number
  rowsChecked: number
  validRows: number
  invalidRows: number
  legacyRows: number
  issues: Array<{ file: string; line: number; reason: string }>
}> {
  const files = await listLedgerFiles(options?.daysLookback)
  let rowsChecked = 0
  let validRows = 0
  let invalidRows = 0
  let legacyRows = 0
  const issues: Array<{ file: string; line: number; reason: string }> = []
  let filesChecked = 0

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8').catch(() => null)
    if (!raw) continue
    filesChecked += 1
    const relativeFile = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    const lines = raw.split(/\r?\n/)
    let previousHash: string | null = null

    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx]
      if (!line.trim()) continue
      rowsChecked += 1
      const row = parseRow(line)
      if (!row) {
        invalidRows += 1
        issues.push({ file: relativeFile, line: idx + 1, reason: 'INVALID_JSON_ROW' })
        continue
      }

      if (!row.eventId || !row.eventHash) {
        legacyRows += 1
        issues.push({ file: relativeFile, line: idx + 1, reason: 'LEGACY_UNHASHED_ROW' })
        previousHash = null
        continue
      }

      if ((row.prevHash ?? null) !== previousHash) {
        invalidRows += 1
        issues.push({ file: relativeFile, line: idx + 1, reason: 'PREV_HASH_MISMATCH' })
      }

      const recomputed = computeEventHash({
        timestamp: row.timestamp,
        eventId: row.eventId,
        prevHash: row.prevHash ?? null,
        event: {
          eventType: row.eventType,
          capability: row.capability,
          userId: row.userId,
          projectId: row.projectId,
          filePath: row.filePath,
          outcome: row.outcome,
          metadata: row.metadata,
        },
      })

      if (recomputed !== row.eventHash) {
        invalidRows += 1
        issues.push({ file: relativeFile, line: idx + 1, reason: 'EVENT_HASH_MISMATCH' })
      } else {
        validRows += 1
      }

      previousHash = row.eventHash
    }
  }

  return {
    filesChecked,
    rowsChecked,
    validRows,
    invalidRows,
    legacyRows,
    issues: issues.slice(0, 200),
  }
}
