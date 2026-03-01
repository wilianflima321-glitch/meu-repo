/**
 * 2FA Validate Route
 * POST /api/auth/2fa/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { twoFactorService } from '@/lib/security/two-factor-auth'
import { prisma } from '@/lib/db'

const ValidateSchema = z.object({
  userId: z.string(),
  code: z.string().min(6).max(9),
  sessionToken: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, code, sessionToken } = ValidateSchema.parse(body)

    const session = await prisma.pendingTwoFactorSession.findUnique({
      where: { token: sessionToken },
    })

    if (!session || session.userId !== userId || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    const result = await twoFactorService.verify(userId, code)
    if (!result.valid) {
      await prisma.pendingTwoFactorSession.update({
        where: { token: sessionToken },
        data: { attempts: { increment: 1 } },
      })

      if (session.attempts >= 4) {
        await prisma.pendingTwoFactorSession.delete({
          where: { token: sessionToken },
        })
        return NextResponse.json(
          { error: 'Too many failed attempts. Please login again.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid code', attemptsRemaining: 5 - session.attempts - 1 },
        { status: 400 }
      )
    }

    await prisma.pendingTwoFactorSession.delete({
      where: { token: sessionToken },
    })

    return NextResponse.json({
      success: true,
      validated: true,
      warning: result.usedBackupCode
        ? `Backup code used. ${result.remainingBackupCodes} codes remaining.`
        : undefined,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    console.error('2FA validate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
