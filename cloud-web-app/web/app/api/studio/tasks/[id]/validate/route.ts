import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { validateStudioTask } from '@/lib/server/studio-home-store'

export const dynamic = 'force-dynamic'

type Body = { sessionId?: string }

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

    const session = await validateStudioTask(auth.userId, sessionId, ctx.params.id)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    if (session.status !== 'active') {
      return NextResponse.json(
        {
          error: 'SESSION_NOT_ACTIVE',
          message: 'Studio session is not active. Validation is disabled.',
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
        },
        { status: 409 }
      )
    }
    const task = session.tasks.find((item) => item.id === ctx.params.id)
    if (!task) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }

    if (task.validationVerdict === 'failed') {
      return NextResponse.json(
        {
          error: 'VALIDATION_FAILED',
          message: 'Task failed deterministic validation.',
          session,
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_TASK_VALIDATE',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate studio task'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_VALIDATE_FAILED', message }, { status: 500 })
  }
}
