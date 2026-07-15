/**
 * POST /api/cron/payg-flush — month-end / scheduled PAYG invoice flush (6C.4).
 * Auth: CRON_SECRET bearer. Forces flush for users with accrued > 0 + PM.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import { flushPaygInvoiceForUser } from '@/lib/billing/payg-invoice-flush'
import { optionalEnv } from '@/lib/env'

const log = createComponentLogger('api/cron/payg-flush')
export const dynamic = 'force-dynamic'

function authorizeCron(req: NextRequest): boolean {
  const secret = optionalEnv('CRON_SECRET')
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  return header === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      paygEnabled: true,
      stripePaymentMethodId: { not: null },
      paygAccruedUsdCents: { gt: 0 },
    },
    select: { id: true },
    take: 500,
  })

  const results: Array<{ userId: string; ok: boolean; code?: string; invoiceId?: string }> = []
  for (const u of users) {
    const flushed = await flushPaygInvoiceForUser({
      userId: u.id,
      force: true,
      reason: 'month_end',
    })
    results.push({
      userId: u.id,
      ok: flushed.ok,
      code: flushed.ok ? undefined : flushed.code,
      invoiceId: flushed.ok ? flushed.invoiceId : undefined,
    })
  }

  log.info('payg_cron_flush_complete', { users: users.length, results: results.length })
  return NextResponse.json({
    success: true,
    flushed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
