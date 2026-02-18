import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { planStudioTasks } from '@/lib/server/studio-home-store'

export const dynamic = 'force-dynamic'

type Body = { sessionId?: string }

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId is required to generate super plan.' },
        { status: 400 }
      )
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

