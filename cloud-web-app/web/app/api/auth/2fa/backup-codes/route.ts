/**
 * 2FA Backup Codes Route
 * POST /api/auth/2fa/backup-codes
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
      scope: 'auth-2fa-backup-codes',
      key: auth.userId,
      max: 10,
      windowMs: 60 * 60 * 1000,
      message: 'Too many backup code regeneration attempts. Please retry later.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const { code } = VerifySchema.parse(body)

    const newCodes = await twoFactorService.regenerateBackupCodes(auth.userId, code)
    if (!newCodes) {
      return NextResponse.json(
        { error: 'Invalid 2FA code. Backup codes cannot be used to regenerate.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      backupCodes: newCodes,
      message: 'New backup codes generated. Store them securely.',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid code format', details: error.issues }, { status: 400 })
    }
    console.error('2FA backup codes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
