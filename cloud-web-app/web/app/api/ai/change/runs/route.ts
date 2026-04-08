import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  filterChangeRunLedgerBySample,
  readChangeRunLedgerEvents,
  summarizeChangeRunGroups,
  summarizeChangeRunLedger,
  type ChangeRunLedgerEvent,
  type ChangeRunSampleClass,
} from '@/lib/server/change-run-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_RUNS'
const ALLOWED_EVENT_TYPES: ChangeRunLedgerEvent['eventType'][] = [
  'apply',
  'rollback',
  'apply_blocked',
  'rollback_blocked',
  'learn_feedback',
]
const ALLOWED_OUTCOMES: ChangeRunLedgerEvent['outcome'][] = ['success', 'blocked', 'failed']
const ALLOWED_SAMPLE_CLASSES: Array<ChangeRunSampleClass | 'all'> = ['all', 'production', 'rehearsal']

function parseCsvParam<T extends string>(raw: string | null, allowed: T[]): T[] {
  if (!raw) return []
  const set = new Set(allowed)
  const values = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is T => set.has(part as T))
  return [...new Set(values)]
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const params = new URL(request.url).searchParams
    const limit = Math.max(1, Math.min(Number.parseInt(params.get('limit') || '50', 10) || 50, 200))
    const hours = Math.max(1, Math.min(Number.parseInt(params.get('hours') || '72', 10) || 72, 24 * 30))
    const eventTypes = parseCsvParam(params.get('eventTypes'), ALLOWED_EVENT_TYPES)
    const outcomes = parseCsvParam(params.get('outcomes'), ALLOWED_OUTCOMES)
    const sampleClassParam = String(params.get('sampleClass') || 'all').trim().toLowerCase()
    const sampleClass = ALLOWED_SAMPLE_CLASSES.includes(sampleClassParam as ChangeRunSampleClass | 'all')
      ? (sampleClassParam as ChangeRunSampleClass | 'all')
      : 'all'
    const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const allRows = await readChangeRunLedgerEvents({
      userId: user.userId,
      eventTypes: eventTypes.length > 0 ? eventTypes : undefined,
      outcomes: outcomes.length > 0 ? outcomes : undefined,
      sinceIso,
      limit,
    })
    const rows = filterChangeRunLedgerBySample(allRows, sampleClass)
    const summary = summarizeChangeRunLedger(rows)
    const summaryAll = summarizeChangeRunLedger(allRows)
    const runGroups = summarizeChangeRunGroups(rows, 50)

    return capabilityResponse({
      error: 'NONE',
      message: 'Change run ledger loaded.',
      status: 200,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        sinceIso,
        limit,
        eventTypes: eventTypes.length > 0 ? eventTypes : ALLOWED_EVENT_TYPES,
        outcomes: outcomes.length > 0 ? outcomes : ALLOWED_OUTCOMES,
        sampleClass,
        total: rows.length,
        summary,
        summaryAll,
        runGroups,
        rows,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'CHANGE_RUNS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to load change runs',
      },
      { status: 500 }
    )
  }
}
