import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession, planStudioTasks } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

type Body = { sessionId?: string; force?: boolean }

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-task-plan',
      key: auth.userId,
      max: 30,
      windowMs: 60 * 1000,
      message: 'Too many super plan requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId is required to generate super plan.' },
        { status: 400 }
      )
    }
    const force = Boolean(body.force)
    const current = await getStudioSession(auth.userId, sessionId)
    if (!current) {
      return NextResponse.json(
        {
          error: 'STUDIO_SESSION_NOT_FOUND',
          message: 'Studio session not found for current user.',
        },
        { status: 404 }
      )
    }
    if (current.status !== 'active') {
      return capabilityResponse({
        status: 409,
        error: 'SESSION_NOT_ACTIVE',
        message: 'Studio session is not active. Super plan generation is disabled.',
        capability: 'STUDIO_HOME_SUPER_PLAN',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
      })
    }
    if (!force && current.tasks.length > 0) {
      return capabilityResponse({
        status: 409,
        error: 'PLAN_ALREADY_EXISTS',
        message: 'A super plan already exists for this session.',
        capability: 'STUDIO_HOME_SUPER_PLAN',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          taskCount: current.tasks.length,
          force: false,
        },
      })
    }

    const session = await planStudioTasks(auth.userId, sessionId)
    if (!session) {
      return NextResponse.json(
        {
          error: 'STUDIO_SESSION_NOT_FOUND',
          message: 'Studio session not found for current user.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_SUPER_PLAN',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate super plan'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_PLAN_FAILED', message }, { status: 500 })
  }
}
