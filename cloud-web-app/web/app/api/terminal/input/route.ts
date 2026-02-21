import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { getTerminalPtyManager, writeToTerminal } from '@/lib/server/terminal-pty-runtime'

const MAX_SESSION_ID_LENGTH = 120
const normalizeSessionId = (value?: string) => String(value ?? '').trim()

/**
 * POST /api/terminal/input
 *
 * Sends input to a terminal session.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-input-post',
      key: user.userId,
      max: 3600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal input requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(user.userId)

    const { sessionId, data } = await request.json()
    const normalizedSessionId = normalizeSessionId(sessionId)

    if (!normalizedSessionId || data === undefined) {
      return NextResponse.json(
        { error: 'sessionId and data are required.' },
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

    const success = writeToTerminal(normalizedSessionId, String(data))
    if (!success) {
      return NextResponse.json(
        { error: 'TERMINAL_SESSION_NOT_ACTIVE', message: 'Terminal session is not active.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: normalizedSessionId,
    })
  } catch (error) {
    console.error('[terminal/input] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send terminal input.' },
      { status: 500 }
    )
  }
}
