import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession, validateStudioTask } from '@/lib/server/studio-home-store'

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

    const current = await getStudioSession(auth.userId, sessionId)
    if (!current) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    if (current.status !== 'active') {
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
    const task = current.tasks.find((item) => item.id === ctx.params.id)
    if (!task) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }
    if (task.ownerRole !== 'reviewer') {
      return NextResponse.json(
        {
          error: 'REVIEW_GATE_REQUIRED',
          message: 'Validation is allowed only for reviewer checkpoints.',
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
          metadata: { ownerRole: task.ownerRole },
        },
        { status: 422 }
      )
    }
    if (task.status !== 'done') {
      return NextResponse.json(
        {
          error: 'VALIDATION_NOT_READY',
          message: 'Validation is available only after task run is completed.',
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
          metadata: { status: task.status },
        },
        { status: 422 }
      )
    }
    if (task.validationVerdict === 'passed') {
      return NextResponse.json(
        {
          error: 'VALIDATION_ALREADY_PASSED',
          message: 'Validation has already passed for this task.',
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
        },
        { status: 409 }
      )
    }
    if (task.validationVerdict === 'failed') {
      return NextResponse.json(
        {
          error: 'VALIDATION_ALREADY_FAILED',
          message: 'Validation already failed. Re-run reviewer task before validating again.',
          capability: 'STUDIO_HOME_TASK_VALIDATE',
          capabilityStatus: 'PARTIAL',
        },
        { status: 409 }
      )
    }

    const session = await validateStudioTask(auth.userId, sessionId, ctx.params.id)
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

    if (updatedTask.validationVerdict === 'failed') {
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
