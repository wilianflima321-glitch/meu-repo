import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { getTerminalPtyManager, killTerminalSession } from '@/lib/server/terminal-pty-runtime'

const MAX_SESSION_ID_LENGTH = 120
const normalizeSessionId = (value?: string) => String(value ?? '').trim()

/**
 * POST /api/terminal/close
 *
 * Closes a terminal session.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-close-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal close requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(user.userId)

    const { sessionId } = await request.json()
    const normalizedSessionId = normalizeSessionId(sessionId)

    if (!normalizedSessionId) {
      return NextResponse.json(
        { error: 'sessionId is required.' },
        { status: 400 }
      )
    }

    if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'INVALID_SESSION_ID',
          message: 'sessionId must be under 120 characters.',
        },
        { status: 400 }
      )
    }

    const manager = getTerminalPtyManager()
    const session = manager.getSession(normalizedSessionId)
    if (!session || session.userId !== user.userId) {
      return NextResponse.json(
        { error: 'TERMINAL_SESSION_NOT_FOUND', message: 'Terminal session not found.' },
        { status: 404 }
      )
    }

    const success = await killTerminalSession(normalizedSessionId)
    if (!success) {
      return NextResponse.json(
        { error: 'TERMINAL_SESSION_NOT_ACTIVE', message: 'Terminal session is not active.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: normalizedSessionId,
      message: 'Terminal session closed.',
    })
  } catch (error) {
    console.error('[terminal/close] Error:', error)
    return NextResponse.json(
      { error: 'Failed to close terminal session.' },
      { status: 500 }
    )
  }
}
