/**
 * 2FA Backup Codes Route
 * POST /api/auth/2fa/backup-codes
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromRequest } from '@/lib/auth-server'
import { twoFactorService } from '@/lib/security/two-factor-auth'

const BackupCodeSchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
})

export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = BackupCodeSchema.parse(body)

    const newCodes = await twoFactorService.regenerateBackupCodes(decoded.userId, code)
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid code format', details: error.issues },
        { status: 400 }
      )
    }

    console.error('2FA backup codes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
