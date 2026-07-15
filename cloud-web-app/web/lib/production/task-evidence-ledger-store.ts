/**
 * Durable persistence for task evidence ledgers inside `project.settings`.
 *
 * The governed execution kernel produces a `TaskEvidenceLedger` per run; this
 * store is how those receipts survive beyond a single request so the closed
 * loop (decision -> execution -> receipt) is auditable over time. It follows the
 * same settings-key convention as the rest of the production spine
 * (`aethelProductionState`, read receipts, etc.).
 */
import type { TaskEvidenceLedger } from './task-evidence-ledger'

export const TASK_EVIDENCE_LEDGER_SETTINGS_KEY = 'aethelTaskEvidenceLedgers'

const DEFAULT_MAX_LEDGERS = 50

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTaskEvidenceLedger(value: unknown): value is TaskEvidenceLedger {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.taskId === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.events)
  )
}

export function readTaskEvidenceLedgersFromSettings(settings: unknown): Record<string, TaskEvidenceLedger> {
  if (!isRecord(settings)) return {}
  const candidate = settings[TASK_EVIDENCE_LEDGER_SETTINGS_KEY]
  if (!isRecord(candidate)) return {}

  const result: Record<string, TaskEvidenceLedger> = {}
  for (const [key, value] of Object.entries(candidate)) {
    if (isTaskEvidenceLedger(value)) result[key] = value
  }
  return result
}

export function readTaskEvidenceLedgerFromSettings(
  settings: unknown,
  taskId: string
): TaskEvidenceLedger | null {
  return readTaskEvidenceLedgersFromSettings(settings)[taskId] ?? null
}

export function writeTaskEvidenceLedgerToSettings(
  settings: unknown,
  ledger: TaskEvidenceLedger,
  options?: { maxLedgers?: number }
): Record<string, unknown> {
  const maxLedgers = Math.max(1, options?.maxLedgers ?? DEFAULT_MAX_LEDGERS)
  const existing = readTaskEvidenceLedgersFromSettings(settings)
  const merged: Record<string, TaskEvidenceLedger> = { ...existing, [ledger.taskId]: ledger }

  const capped = Object.values(merged)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, maxLedgers)

  const next: Record<string, TaskEvidenceLedger> = {}
  for (const item of capped) next[item.taskId] = item

  return {
    ...(isRecord(settings) ? settings : {}),
    [TASK_EVIDENCE_LEDGER_SETTINGS_KEY]: next,
  }
}

export interface StoredTaskEvidenceSummary {
  ledgerCount: number
  eventCount: number
  latestTaskId: string | null
  latestUpdatedAt: string | null
}

export function summarizeStoredTaskEvidence(settings: unknown): StoredTaskEvidenceSummary {
  const ledgers = Object.values(readTaskEvidenceLedgersFromSettings(settings))
  if (ledgers.length === 0) {
    return { ledgerCount: 0, eventCount: 0, latestTaskId: null, latestUpdatedAt: null }
  }

  const sorted = [...ledgers].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const latest = sorted[0]
  return {
    ledgerCount: ledgers.length,
    eventCount: ledgers.reduce((total, ledger) => total + ledger.events.length, 0),
    latestTaskId: latest.taskId,
    latestUpdatedAt: latest.updatedAt,
  }
}
