/**
 * Core Loop Feedback API
 * POST /api/ai/core-loop/feedback
 * Captures user feedback on AI generation outcomes for L4 readiness evidence.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'
const routeLogger = createComponentLogger('api/ai/core-loop/feedback/route')

interface FeedbackPayload {
  runId: string
  outcome: 'accepted' | 'rejected' | 'partial' | 'rolled_back'
  regression: boolean
  userSignal?: 'positive' | 'negative' | 'neutral'
  comment?: string
  context?: {
    projectId?: string
    surface?: string
    model?: string
    tokensUsed?: number
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    if (!auth?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: FeedbackPayload = await req.json()

    if (!body.runId || !body.outcome) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'runId and outcome are required.' },
        { status: 400 }
      )
    }

    const validOutcomes = ['accepted', 'rejected', 'partial', 'rolled_back']
    if (!validOutcomes.includes(body.outcome)) {
      return NextResponse.json(
        { error: 'INVALID_OUTCOME', message: `outcome must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      )
    }

    // Store feedback in the audit log for L4 evidence
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'core_loop_feedback',
        resource: `run:${body.runId}`,
        metadata: JSON.stringify({
          outcome: body.outcome,
          regression: body.regression,
          userSignal: body.userSignal || 'neutral',
          comment: body.comment || '',
          context: body.context || {},
          timestamp: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      success: true,
      runId: body.runId,
      outcome: body.outcome,
      regression: body.regression,
      recordedAt: new Date().toISOString(),
    })
  } catch (error) {
    routeLogger.error('[core-loop/feedback] Error:', error)
    return NextResponse.json(
      { error: 'FEEDBACK_FAILED', message: 'Unable to record feedback.' },
      { status: 500 }
    )
  }
}
