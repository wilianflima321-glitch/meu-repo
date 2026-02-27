import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { revokeFullAccessGrant } from '@/lib/server/studio-home-store'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120
const normalizeRouteId = (value?: string) => String(value ?? '').trim()
type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext
) {
  try {
    const auth = requireAuth(req)
    const resolved = await ctx.params
    const grantId = normalizeRouteId(resolved?.id)
    if (!grantId || grantId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_GRANT_ID',
          message: 'grantId is required and must be under 120 characters.',
        },
        { status: 400 }
      )
    }
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-full-access-revoke',
      key: auth.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many full access revoke requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const url = new URL(req.url)
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    if (!sessionId || sessionId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'SESSION_ID_REQUIRED',
          message: 'sessionId query is required and must be under 120 characters.',
        },
        { status: 400 }
      )
    }

    const session = await revokeFullAccessGrant(auth.userId, sessionId, grantId)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_FULL_ACCESS',
      capabilityStatus: 'IMPLEMENTED',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke full access'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_FULL_ACCESS_REVOKE_FAILED', message }, { status: 500 })
  }
}
