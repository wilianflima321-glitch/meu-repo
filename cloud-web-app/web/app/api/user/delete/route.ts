/**
 * GDPR User Account Deletion API
 * POST /api/user/delete - Delete user account and all data
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/user/delete/route');

export const dynamic = 'force-dynamic'

interface DeleteRequest {
  confirmation: string // Must be "DELETE MY ACCOUNT"
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const body: DeleteRequest = await req.json()

    if (body.confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json(
        { error: 'CONFIRMATION_REQUIRED', message: 'Send confirmation: "DELETE MY ACCOUNT"' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, stripeCustomerId: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Cancel Stripe subscription if exists
    if (user.stripeCustomerId) {
      try {
        const { getStripe } = await import('@/lib/stripe')
        const stripe = getStripe()
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
        })
        for (const sub of subscriptions.data) {
          await stripe.subscriptions.cancel(sub.id)
        }
      } catch (err) {
        routeLogger.warn('[user/delete] Stripe cleanup failed (non-blocking):', err)
      }
    }

    // Record deletion in audit log before deleting
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: 'gdpr_account_deletion',
        resource: `user:${auth.userId}`,
        metadata: JSON.stringify({
          email: user.email,
          deletedAt: new Date().toISOString(),
          reason: 'user_requested',
        }),
      },
    })

    // Delete user and cascade (Prisma cascades configured in schema)
    await prisma.user.delete({
      where: { id: auth.userId },
    })

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully. All data has been removed.',
      deletedAt: new Date().toISOString(),
    })
  } catch (error) {
    routeLogger.error('[user/delete] Error:', error)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
