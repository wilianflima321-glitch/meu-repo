import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getPlanLimits } from '@/lib/plan-limits'
import { prisma } from '@/lib/db'
import { getStudioSession, runStudioTask } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120
const normalizeRouteId = (value?: string) => String(value ?? '').trim()
type RouteContext = { params: Promise<{ id: string }> }

type Body = { sessionId?: string }

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
      scope: 'studio-task-run',
      key: auth.userId,
      max: 90,
      windowMs: 60 * 1000,
      message: 'Too many studio task run operations. Please retry shortly.',
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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true },
    })
    const limits = getPlanLimits(user?.plan || 'starter_trial')
    if (limits.maxAgents < 3) {
      return capabilityResponse({
        status: 403,
        error: 'FEATURE_NOT_ALLOWED',
        message: 'Your plan does not support 3-role studio orchestration.',
        capability: 'STUDIO_HOME_MULTI_AGENT',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { maxAgents: limits.maxAgents, required: 3 },
      })
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
        message: 'Studio session is not active. Start a new session to continue execution.',
        capability: 'STUDIO_HOME_TASK_RUN',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }

    const task = current.tasks.find((item) => item.id === taskId)
    if (!task) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }
    const runEligible =
      task.status === 'queued' ||
      task.status === 'blocked' ||
      task.status === 'error' ||
      (task.ownerRole === 'planner' && task.status === 'planning')
    if (!runEligible) {
      return capabilityResponse({
        status: 422,
        error: 'TASK_RUN_NOT_ALLOWED',
        message: 'Task cannot be executed in current state.',
        capability: 'STUDIO_HOME_TASK_RUN',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { taskId: task.id, ownerRole: task.ownerRole, status: task.status },
      })
    }

    const session = await runStudioTask(auth.userId, sessionId, taskId)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    const updatedTask = session.tasks.find((item) => item.id === taskId)
    if (!updatedTask) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found in session.' },
        { status: 404 }
      )
    }
    if (updatedTask.status === 'blocked') {
      return capabilityResponse({
        status: 422,
        error: 'TASK_RUN_BLOCKED',
        message: updatedTask.result || 'Task run blocked by orchestration guard.',
        capability: 'STUDIO_HOME_TASK_RUN',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { taskId: updatedTask.id, ownerRole: updatedTask.ownerRole },
      })
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_TASK_RUN',
      capabilityStatus: 'PARTIAL',
      metadata: {
        executionMode: 'orchestration_only',
        applyPolicy: 'manual-review-before-ide-apply',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run studio task'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_RUN_FAILED', message }, { status: 500 })
  }
}
