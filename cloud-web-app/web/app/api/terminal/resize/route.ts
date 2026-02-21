import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import { getTerminalPtyManager, resizeTerminal } from '@/lib/server/terminal-pty-runtime'

const MAX_SESSION_ID_LENGTH = 120
const normalizeSessionId = (value?: string) => String(value ?? '').trim()

/**
 * POST /api/terminal/resize
 *
 * Resizes a terminal session.
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-resize-post',
      key: user.userId,
      max: 1200,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal resize requests. Please wait before retrying.',
    })
    if (rateLimitResponse) return rateLimitResponse
    await requireEntitlementsForUser(user.userId)

    const { sessionId, cols, rows } = await request.json()
    const normalizedSessionId = normalizeSessionId(sessionId)

    if (!normalizedSessionId || cols === undefined || rows === undefined) {
      return NextResponse.json(
        { error: 'sessionId, cols and rows are required.' },
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

    const parsedCols = Number(cols)
    const parsedRows = Number(rows)
    if (!Number.isFinite(parsedCols) || !Number.isFinite(parsedRows)) {
      return NextResponse.json(
        { error: 'Invalid terminal size parameters.' },
        { status: 400 }
      )
    }

    const validCols = Math.max(10, Math.min(500, Math.round(parsedCols)))
    const validRows = Math.max(5, Math.min(200, Math.round(parsedRows)))

    const manager = getTerminalPtyManager()
    const session = manager.getSession(normalizedSessionId)
    if (!session || session.userId !== user.userId) {
      return NextResponse.json(
        { error: 'TERMINAL_SESSION_NOT_FOUND', message: 'Terminal session not found.' },
        { status: 404 }
      )
    }

    const success = resizeTerminal(normalizedSessionId, validCols, validRows)
    if (!success) {
      return NextResponse.json(
        { error: 'TERMINAL_SESSION_NOT_ACTIVE', message: 'Terminal session is not active.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: normalizedSessionId,
      cols: validCols,
      rows: validRows,
    })
  } catch (error) {
    console.error('[terminal/resize] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resize terminal.' },
      { status: 500 }
    )
  }
}
