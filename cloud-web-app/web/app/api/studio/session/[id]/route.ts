import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { loadStudioSession } from '@/lib/server/studio-session-store'

export async function GET(request: NextRequest, context: { params: { id: string } }) {
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

    return NextResponse.json({ session })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'STUDIO_SESSION_LOAD_FAILED' }, { status: 500 })
  }
}
