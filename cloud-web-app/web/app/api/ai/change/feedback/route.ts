import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import { appendChangeRunLedgerEvent } from '@/lib/server/change-run-ledger'
import { getScopedProjectId } from '@/lib/server/workspace-scope'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_LEARN'
const MAX_NOTES_CHARS = 2000

type FeedbackKind = 'accepted' | 'rejected' | 'needs_work'

type FeedbackBody = {
  projectId?: string
  runId?: string
  filePath?: string
  feedback?: FeedbackKind
  rating?: number
  reason?: string
  notes?: string
  runSource?: string
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeFeedback(value: unknown): FeedbackKind | null {
  const raw = toString(value).toLowerCase()
  if (raw === 'accepted') return 'accepted'
  if (raw === 'rejected') return 'rejected'
  if (raw === 'needs_work') return 'needs_work'
  return null
}

function normalizeRunSource(value: unknown): string {
  const raw = toString(value).toLowerCase()
  if (!raw) return 'production'
  return raw.replace(/[^a-z0-9._:-]+/g, '_')
}

function normalizeRating(value: unknown, feedback: FeedbackKind): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(-1, Math.min(1, Math.trunc(value)))
  }
  if (feedback === 'accepted') return 1
  if (feedback === 'rejected') return -1
  return 0
}

export async function POST(request: NextRequest) {
  const user = requireAuth(request)
  await requireEntitlementsForUser(user.userId)

  const body = (await request.json().catch(() => null)) as FeedbackBody | null
  if (!body || typeof body !== 'object') {
    return capabilityResponse({
      error: 'INVALID_BODY',
      message: 'Invalid JSON body.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }

  const feedback = normalizeFeedback(body.feedback)
  if (!feedback) {
    return capabilityResponse({
      error: 'FEEDBACK_REQUIRED',
      message: 'feedback must be accepted, rejected or needs_work.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        acceptedValues: ['accepted', 'rejected', 'needs_work'],
      },
    })
  }

  const runId = toString(body.runId)
  if (!runId) {
    return capabilityResponse({
      error: 'RUN_ID_REQUIRED',
      message: 'runId is required for learn feedback.',
      status: 400,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
    })
  }

  const notes = toString(body.notes)
  if (notes.length > MAX_NOTES_CHARS) {
    return capabilityResponse({
      error: 'FEEDBACK_NOTES_TOO_LONG',
      message: `notes exceeded ${MAX_NOTES_CHARS} characters.`,
      status: 413,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        maxChars: MAX_NOTES_CHARS,
        receivedChars: notes.length,
      },
    })
  }

  const projectId = getScopedProjectId(request, body as Record<string, unknown>)
  const filePath = toString(body.filePath) || '/unknown'
  const reason = toString(body.reason)
  const rating = normalizeRating(body.rating, feedback)
  const runSource = normalizeRunSource(body.runSource)
  const submittedAt = new Date().toISOString()

  await appendChangeRunLedgerEvent({
    eventType: 'learn_feedback',
    capability: CAPABILITY,
    userId: user.userId,
    projectId,
    filePath,
    outcome: 'success',
    metadata: {
      runId,
      feedback,
      rating,
      reason: reason || undefined,
      notes: notes || undefined,
      runSource,
      submittedAt,
    },
  }).catch(() => {})

  return capabilityResponse({
    error: 'NONE',
    message: 'Learn feedback saved.',
    status: 200,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    metadata: {
      runId,
      feedback,
      rating,
      runSource,
      submittedAt,
    },
  })
}

