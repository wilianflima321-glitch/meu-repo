import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession, rollbackStudioTask } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

type Body = {
  sessionId?: string
  applyToken?: string
}

export async function POST(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const auth = requireAuth(req)
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
        message: 'Studio session is not active. Rollback is disabled.',
        capability: 'STUDIO_HOME_TASK_ROLLBACK',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }
    const currentTask = current.tasks.find((item) => item.id === ctx.params.id)
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

    const session = await rollbackStudioTask(auth.userId, sessionId, ctx.params.id, body.applyToken)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }

    const task = session.tasks.find((item) => item.id === ctx.params.id)
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
