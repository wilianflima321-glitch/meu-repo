import { describe, expect, it } from 'vitest'

import { createTaskEvidenceLedger } from '@/lib/production/task-evidence-ledger'
import {
  TASK_EVIDENCE_LEDGER_SETTINGS_KEY,
  readTaskEvidenceLedgerFromSettings,
  readTaskEvidenceLedgersFromSettings,
  summarizeStoredTaskEvidence,
  writeTaskEvidenceLedgerToSettings,
} from '@/lib/production/task-evidence-ledger-store'

function ledger(taskId: string, updatedAt: string) {
  return {
    ...createTaskEvidenceLedger({
      taskId,
      projectId: 'project-1',
      mission: `mission ${taskId}`,
      ownerAgent: 'workspace-apply',
      now: updatedAt,
    }),
    updatedAt,
  }
}

describe('task-evidence-ledger-store', () => {
  it('writes a ledger under the canonical settings key without dropping siblings', () => {
    const settings = writeTaskEvidenceLedgerToSettings({ existing: true }, ledger('task-1', '2026-06-01T00:00:00.000Z'))

    expect(settings.existing).toBe(true)
    expect(settings[TASK_EVIDENCE_LEDGER_SETTINGS_KEY]).toBeTypeOf('object')
    expect(readTaskEvidenceLedgerFromSettings(settings, 'task-1')?.mission).toBe('mission task-1')
  })

  it('round-trips multiple ledgers keyed by taskId', () => {
    let settings: unknown = {}
    settings = writeTaskEvidenceLedgerToSettings(settings, ledger('task-1', '2026-06-01T00:00:00.000Z'))
    settings = writeTaskEvidenceLedgerToSettings(settings, ledger('task-2', '2026-06-02T00:00:00.000Z'))

    const all = readTaskEvidenceLedgersFromSettings(settings)
    expect(Object.keys(all).sort()).toEqual(['task-1', 'task-2'])
  })

  it('caps the number of stored ledgers, keeping the most recent', () => {
    let settings: unknown = {}
    for (let index = 0; index < 5; index += 1) {
      const day = String(index + 1).padStart(2, '0')
      settings = writeTaskEvidenceLedgerToSettings(settings, ledger(`task-${index}`, `2026-06-${day}T00:00:00.000Z`), {
        maxLedgers: 3,
      })
    }

    const all = readTaskEvidenceLedgersFromSettings(settings)
    expect(Object.keys(all).sort()).toEqual(['task-2', 'task-3', 'task-4'])
  })

  it('ignores malformed ledger payloads', () => {
    const settings = { [TASK_EVIDENCE_LEDGER_SETTINGS_KEY]: { bad: { version: 2, taskId: 'x' } } }
    expect(readTaskEvidenceLedgersFromSettings(settings)).toEqual({})
  })

  it('summarizes stored evidence across ledgers', () => {
    let settings: unknown = {}
    settings = writeTaskEvidenceLedgerToSettings(settings, ledger('task-1', '2026-06-01T00:00:00.000Z'))
    settings = writeTaskEvidenceLedgerToSettings(settings, ledger('task-2', '2026-06-03T00:00:00.000Z'))

    const summary = summarizeStoredTaskEvidence(settings)
    expect(summary.ledgerCount).toBe(2)
    expect(summary.latestTaskId).toBe('task-2')
    expect(summary.latestUpdatedAt).toBe('2026-06-03T00:00:00.000Z')
  })

  it('returns empty summary when nothing is stored', () => {
    expect(summarizeStoredTaskEvidence({})).toEqual({
      ledgerCount: 0,
      eventCount: 0,
      latestTaskId: null,
      latestUpdatedAt: null,
    })
  })
})
