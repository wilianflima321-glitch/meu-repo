import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { getTerminalPtyManager, killTerminalSession } from '@/lib/server/terminal-pty-runtime'

const MAX_SESSION_ID_LENGTH = 120
const normalizeSessionId = (value?: string) => String(value ?? '').trim()
const VALID_SIGNALS = new Set(['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'])

/**
 * POST /api/terminal/kill
 *
 * Sends a signal to a terminal session.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-kill-post',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal kill requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(user.userId)

    const { sessionId, signal = 'SIGTERM' } = await request.json()
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

    const normalizedSignal = VALID_SIGNALS.has(String(signal).toUpperCase())
      ? String(signal).toUpperCase()
      : 'SIGTERM'

    let success = false
    if (normalizedSignal === 'SIGKILL' || normalizedSignal === 'SIGTERM') {
      success = await killTerminalSession(normalizedSessionId)
    } else {
      success = manager.sendSignal(normalizedSessionId, normalizedSignal)
    }

    if (!success) {
      return NextResponse.json(
        { error: 'TERMINAL_SIGNAL_FAILED', message: 'Failed to signal terminal session.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: normalizedSessionId,
      signal: normalizedSignal,
      message: `Signal ${normalizedSignal} sent.`,
    })
  } catch (error) {
    console.error('[terminal/kill] Error:', error)
    return NextResponse.json(
      { error: 'Failed to signal terminal session.' },
      { status: 500 }
    )
  }
}
