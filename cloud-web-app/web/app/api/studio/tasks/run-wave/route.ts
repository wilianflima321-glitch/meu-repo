import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getPlanLimits } from '@/lib/plan-limits'
import { prisma } from '@/lib/db'
import { getStudioSession, runStudioWave } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120

type Body = { sessionId?: string; maxSteps?: number }

function normalizeMaxSteps(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 3
  return Math.max(1, Math.min(3, Math.floor(parsed)))
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-task-run-wave',
      key: auth.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many studio wave run operations. Please retry shortly.',
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
        message: 'Your plan does not support 3-role studio wave execution.',
        capability: 'STUDIO_HOME_MULTI_AGENT',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { maxAgents: limits.maxAgents, required: 3, mode: 'run-wave' },
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
        capability: 'STUDIO_HOME_TASK_RUN_WAVE',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }
    if (current.tasks.length === 0) {
      return capabilityResponse({
        status: 422,
        error: 'RUN_WAVE_REQUIRES_PLAN',
        message: 'Generate a super plan before running a wave.',
        capability: 'STUDIO_HOME_TASK_RUN_WAVE',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { taskCount: 0 },
      })
    }
    if (current.tasks.every((task) => task.status === 'done')) {
      return capabilityResponse({
        status: 409,
        error: 'RUN_WAVE_ALREADY_COMPLETE',
        message: 'All tasks are already complete for this session.',
        capability: 'STUDIO_HOME_TASK_RUN_WAVE',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: { taskCount: current.tasks.length },
      })
    }

    const result = await runStudioWave(auth.userId, sessionId, { maxSteps: normalizeMaxSteps(body.maxSteps) })
    if (!result.session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    if (result.executedTaskIds.length === 0) {
      return capabilityResponse({
        status: 422,
        error: 'TASK_RUN_BLOCKED',
        message: 'No task could be executed in this wave due to orchestration guards or budget.',
        capability: 'STUDIO_HOME_TASK_RUN_WAVE',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          blockedTaskIds: result.blockedTaskIds,
          executedTaskIds: result.executedTaskIds,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      session: result.session,
      capability: 'STUDIO_HOME_TASK_RUN_WAVE',
      capabilityStatus: 'IMPLEMENTED',
      metadata: {
        executionMode: 'parallel-wave-queued',
        applyPolicy: 'serial-review-gated',
        missionDomain: result.session.missionDomain || 'general',
        executedTaskIds: result.executedTaskIds,
        blockedTaskIds: result.blockedTaskIds,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run studio wave'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_RUN_WAVE_FAILED', message }, { status: 500 })
  }
}
