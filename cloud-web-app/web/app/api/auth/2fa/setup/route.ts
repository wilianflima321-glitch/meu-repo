/**
 * 2FA Setup Route
 * POST /api/auth/2fa/setup
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { twoFactorService } from '@/lib/security/two-factor-auth'
import { prisma } from '@/lib/db'
import { enforceRateLimit } from '@/lib/server/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-2fa-setup',
      key: auth.userId,
      max: 10,
      windowMs: 15 * 60 * 1000,
      message: 'Too many 2FA setup attempts. Please retry later.',
    })
    if (rateLimitResponse) return rateLimitResponse

    const status = await twoFactorService.getStatus(auth.userId)
    if (status.enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to re-setup.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const setup = await twoFactorService.setupTwoFactor(auth.userId, user.email)

    return NextResponse.json({
      success: true,
      qrCode: setup.qrCodeDataURL,
      secret: setup.secretBase32,
      backupCodes: setup.backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code.',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
