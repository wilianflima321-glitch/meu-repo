import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { applyStudioTask, getStudioSession } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

type Body = { sessionId?: string }

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-task-apply',
      key: auth.userId,
      max: 45,
      windowMs: 60 * 1000,
      message: 'Too many studio task apply operations. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId is required.' },
        { status: 400 }
      )
    }

    const current = await getStudioSession(auth.userId, sessionId)
    if (!current) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    if (current.status !== 'active') {
      return capabilityResponse({
        status: 409,
        error: 'SESSION_NOT_ACTIVE',
        message: 'Studio session is not active. Apply is disabled.',
        capability: 'STUDIO_HOME_TASK_APPLY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    const task = current.tasks.find((item) => item.id === ctx.params.id)
    if (!task) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }
    if (task.applyToken) {
      return capabilityResponse({
        status: 409,
        error: 'APPLY_ALREADY_COMPLETED',
        message: 'Apply already completed for this task. Use rollback before re-applying.',
        capability: 'STUDIO_HOME_TASK_APPLY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { applyToken: task.applyToken },
      })
    }

    if (task.validationVerdict !== 'passed') {
      return capabilityResponse({
        status: 422,
        error: 'VALIDATION_REQUIRED',
        message: 'Apply is blocked until deterministic validation passes.',
        capability: 'STUDIO_HOME_TASK_APPLY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { validationVerdict: task.validationVerdict },
      })
    }
    if (task.ownerRole !== 'reviewer') {
      return capabilityResponse({
        status: 422,
        error: 'REVIEW_GATE_REQUIRED',
        message: 'Apply is allowed only for reviewer-approved checkpoints.',
        capability: 'STUDIO_HOME_TASK_APPLY',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { ownerRole: task.ownerRole },
      })
    }

    const session = await applyStudioTask(auth.userId, sessionId, ctx.params.id)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    const updatedTask = session.tasks.find((item) => item.id === ctx.params.id)
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      session,
      applyToken: updatedTask.applyToken ?? null,
      capability: 'STUDIO_HOME_TASK_APPLY',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to apply studio task'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_APPLY_FAILED', message }, { status: 500 })
  }
}
