import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { getStudioSession } from '@/lib/server/studio-home-store'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120
const normalizeRouteId = (value?: string) => String(value ?? '').trim()
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  req: NextRequest,
  ctx: RouteContext
) {
  try {
    const auth = requireAuth(req)
    const resolved = await ctx.params
    const sessionId = normalizeRouteId(resolved?.id)
    if (!sessionId || sessionId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_SESSION_ID',
          message: 'sessionId is required and must be under 120 characters.',
        },
        { status: 400 }
      )
    }
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-session-read',
      key: auth.userId,
      max: 240,
      windowMs: 60 * 1000,
      message: 'Too many studio session read requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const session = await getStudioSession(auth.userId, sessionId)
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
      capability: 'STUDIO_HOME_SESSION',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load studio session'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_SESSION_READ_FAILED', message }, { status: 500 })
  }
}
