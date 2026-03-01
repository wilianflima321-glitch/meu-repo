/**
 * 2FA Disable Route
 * POST /api/auth/2fa/disable
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getUserFromRequest } from '@/lib/auth-server'
import { twoFactorService } from '@/lib/security/two-factor-auth'
import { prisma } from '@/lib/db'

const DisableSchema = z.object({
  code: z.string().min(6).max(9),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromRequest(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code, password } = DisableSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
    }

    const success = await twoFactorService.disable(decoded.userId, code)
    if (!success) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      )
    }

    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
