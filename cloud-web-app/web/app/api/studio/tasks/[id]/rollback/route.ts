import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession, rollbackStudioTask } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120
const normalizeRouteId = (value?: string) => String(value ?? '').trim()
type RouteContext = { params: Promise<{ id: string }> }

type Body = {
  sessionId?: string
  applyToken?: string
}

export async function POST(
  req: NextRequest,
  ctx: RouteContext
) {
  try {
    const auth = requireAuth(req)
    const resolved = await ctx.params
    const taskId = normalizeRouteId(resolved?.id)
    if (!taskId || taskId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_TASK_ID',
          message: 'taskId is required and must be under 120 characters.',
        },
        { status: 400 }
      )
    }
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-task-rollback',
      key: auth.userId,
      max: 45,
      windowMs: 60 * 1000,
      message: 'Too many studio task rollback operations. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId || sessionId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'SESSION_ID_REQUIRED',
          message: 'sessionId is required and must be under 120 characters.',
        },
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
        message: 'Studio session is not active. Rollback is disabled.',
        capability: 'STUDIO_HOME_TASK_ROLLBACK',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }
    const currentTask = current.tasks.find((item) => item.id === taskId)
    if (!currentTask) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }
    if (!currentTask.applyToken) {
      return capabilityResponse({
        status: 409,
        error: 'ROLLBACK_NOT_AVAILABLE',
        message: 'Rollback is only available after a successful apply.',
        capability: 'STUDIO_HOME_TASK_ROLLBACK',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }
    if (body.applyToken && body.applyToken !== currentTask.applyToken) {
      return capabilityResponse({
        status: 409,
        error: 'ROLLBACK_TOKEN_MISMATCH',
        message: 'Provided rollback token does not match the latest applied checkpoint.',
        capability: 'STUDIO_HOME_TASK_ROLLBACK',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          taskId: currentTask.id,
          tokenProvided: true,
        },
      })
    }

    const session = await rollbackStudioTask(auth.userId, sessionId, taskId, body.applyToken)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }

    const task = session.tasks.find((item) => item.id === taskId)
    if (!task) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }

    if (task.status !== 'blocked' || task.applyToken) {
      return capabilityResponse({
        status: 409,
        error: 'ROLLBACK_NOT_AVAILABLE',
        message: 'Rollback is only available after a successful apply.',
        capability: 'STUDIO_HOME_TASK_ROLLBACK',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_TASK_ROLLBACK',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rollback studio task'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_ROLLBACK_FAILED', message }, { status: 500 })
  }
}
