/**
 * 2FA Status Route
 * GET /api/auth/2fa/status
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { twoFactorService } from '@/lib/security/two-factor-auth'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-2fa-status',
      key: auth.userId,
      max: 120,
      windowMs: 60 * 1000,
      message: 'Too many 2FA status requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const status = await twoFactorService.getStatus(auth.userId)

    return NextResponse.json({
      twoFactorEnabled: status.enabled,
      verifiedAt: status.verifiedAt,
      backupCodesRemaining: status.backupCodesRemaining,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('2FA status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
