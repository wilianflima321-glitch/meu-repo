import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { revokeFullAccessGrant } from '@/lib/server/studio-home-store'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  ctx: { params: { id: string } }
) {
  try {
    const auth = requireAuth(req)
    const url = new URL(req.url)
    const sessionId = (url.searchParams.get('sessionId') || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId query is required.' },
        { status: 400 }
      )
    }

    const session = await revokeFullAccessGrant(auth.userId, sessionId, ctx.params.id)
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

