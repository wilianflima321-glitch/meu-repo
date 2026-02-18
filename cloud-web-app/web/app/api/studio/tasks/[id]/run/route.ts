import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getPlanLimits } from '@/lib/plan-limits'
import { prisma } from '@/lib/db'
import { runStudioTask } from '@/lib/server/studio-home-store'

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

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true },
    })
    const limits = getPlanLimits(user?.plan || 'starter_trial')
    if (limits.maxAgents < 3) {
      return NextResponse.json(
        {
          error: 'FEATURE_NOT_ALLOWED',
          message: 'Your plan does not support 3-role studio orchestration.',
          capability: 'STUDIO_HOME_MULTI_AGENT',
          capabilityStatus: 'PARTIAL',
          metadata: { maxAgents: limits.maxAgents, required: 3 },
        },
        { status: 403 }
      )
    }

    const session = await runStudioTask(auth.userId, sessionId, ctx.params.id)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_TASK_RUN',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run studio task'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_TASK_RUN_FAILED', message }, { status: 500 })
  }
}

