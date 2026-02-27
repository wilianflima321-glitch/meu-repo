/**
 * 2FA Verify Route
 * POST /api/auth/2fa/verify
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth-server'
import { twoFactorService } from '@/lib/security/two-factor-auth'
import { enforceRateLimit } from '@/lib/server/rate-limit'

const VerifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-2fa-verify',
      key: auth.userId,
      max: 20,
      windowMs: 15 * 60 * 1000,
      message: 'Too many 2FA verify attempts. Please retry later.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { code } = VerifySchema.parse(body)

    const success = await twoFactorService.verifyAndEnable(auth.userId, code)
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid code. Please check your authenticator app and try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid code format', details: error.issues }, { status: 400 })
    }
    console.error('2FA verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
