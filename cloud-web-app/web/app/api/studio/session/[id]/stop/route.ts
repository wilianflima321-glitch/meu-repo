import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { loadStudioSession, stopStudioSession } from '@/lib/server/studio-session-store'

type StopBody = {
  reason?: string
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const sessionId = context.params?.id
    if (!sessionId) {
      return NextResponse.json({ error: 'MISSING_SESSION_ID' }, { status: 400 })
    }

    const session = await loadStudioSession(user.userId, sessionId)
    if (!session) {
      return NextResponse.json({ error: 'STUDIO_SESSION_NOT_FOUND' }, { status: 404 })
    }

    const body = (await request.json().catch(() => null)) as StopBody | null
    const stopped = await stopStudioSession(session, {
      reason: typeof body?.reason === 'string' ? body.reason : undefined,
    })

    return NextResponse.json({ session: stopped })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'STUDIO_SESSION_STOP_FAILED' }, { status: 500 })
  }
}
