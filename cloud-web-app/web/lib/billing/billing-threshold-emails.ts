/**
 * Block 6H.8 — Server billing threshold emails (PAYG §4.3).
 * 80% Fast/Premium + PAYG 50%/100% of spend cap.
 * Fail-closed: no Resend/SendGrid key → HELD (never claim delivered).
 * Dedupe once per user×kind×period via Notification type key.
 */

import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email-system'
import type { EmailTemplate } from '@/lib/email-system.types'
import { createComponentLogger } from '@/lib/observability/logger'
import { optionalEnv } from '@/lib/env'
import { currentPaygPeriodKey } from '@/lib/billing/payg-constants'
import { loadPaygSnapshot } from '@/lib/billing/payg-policy'
import { getPlanLimits, getCurrentUsage } from '@/lib/plan-limits'
import {
  buildThresholdToastKey,
  isPoolAtWarnThreshold,
} from '@/lib/billing/usage-meter-math'

const log = createComponentLogger('billing-threshold-emails')

export type BillingThresholdKind = 'fast80' | 'prem80' | 'payg50' | 'payg100'

export type BillingEmailCapabilityStatus = 'IMPLEMENTED' | 'HELD'

const TEMPLATE_BY_KIND: Record<BillingThresholdKind, EmailTemplate> = {
  fast80: 'usage_pool_80',
  prem80: 'usage_pool_80',
  payg50: 'payg_cap_50',
  payg100: 'payg_cap_100',
}

export function resolveBillingEmailCapability(): {
  status: BillingEmailCapabilityStatus
  message: string
  provider: 'resend' | 'sendgrid' | 'none'
} {
  const configured = optionalEnv('EMAIL_PROVIDER')?.toLowerCase()
  const resendKey = optionalEnv('RESEND_API_KEY') || optionalEnv('EMAIL_API_KEY')
  const sendGridKey = optionalEnv('SENDGRID_API_KEY')

  if ((configured === 'resend' || (!configured && resendKey)) && resendKey) {
    return {
      status: 'IMPLEMENTED',
      provider: 'resend',
      message: 'Transactional billing emails send via Resend.',
    }
  }
  if (configured === 'sendgrid' && sendGridKey) {
    return {
      status: 'IMPLEMENTED',
      provider: 'sendgrid',
      message: 'Transactional billing emails send via SendGrid.',
    }
  }
  return {
    status: 'HELD',
    provider: 'none',
    message:
      'Billing emails are held until RESEND_API_KEY or SENDGRID_API_KEY is configured. In-app toasts (6C.7) still fire.',
  }
}

export function whichBillingThresholdsCrossed(input: {
  fastUsed: number
  fastLimit: number
  premiumUsed: number
  premiumLimit: number
  paygEnabled: boolean
  spendCapUsdCents: number | null
  accruedUsdCents: number
}): BillingThresholdKind[] {
  const out: BillingThresholdKind[] = []
  if (isPoolAtWarnThreshold(input.fastUsed, input.fastLimit)) out.push('fast80')
  if (isPoolAtWarnThreshold(input.premiumUsed, input.premiumLimit)) out.push('prem80')
  if (
    input.paygEnabled &&
    input.spendCapUsdCents != null &&
    input.spendCapUsdCents > 0
  ) {
    const pct = (input.accruedUsdCents / input.spendCapUsdCents) * 100
    if (pct >= 100) out.push('payg100')
    else if (pct >= 50) out.push('payg50')
  }
  return out
}

function notificationType(kind: BillingThresholdKind, periodKey: string): string {
  return `billing_email:${buildThresholdToastKey(kind, periodKey)}`
}

function usagePageUrl(): string {
  const base = (
    optionalEnv('NEXT_PUBLIC_APP_URL') ||
    optionalEnv('NEXTAUTH_URL') ||
    'https://aethel.dev'
  ).replace(/\/+$/, '')
  return `${base}/billing`
}

async function claimOnce(
  userId: string,
  kind: BillingThresholdKind,
  periodKey: string,
  title: string,
  message: string,
): Promise<boolean> {
  const type = notificationType(kind, periodKey)
  const existing = await prisma.notification.findFirst({
    where: { userId, type },
    select: { id: true },
  })
  if (existing) return false

  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: { kind, periodKey, channel: 'email', milestone: '6H.8' },
    },
  })
  return true
}

function poolPercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 1000) / 10)
}

/**
 * Evaluate pools + PAYG and send at most one email per kind per period.
 * Safe to fire-and-forget from spend paths — never throws to callers.
 */
export async function maybeSendBillingThresholdEmails(userId: string): Promise<{
  capability: BillingEmailCapabilityStatus
  attempted: BillingThresholdKind[]
  sent: BillingThresholdKind[]
  skipped: BillingThresholdKind[]
}> {
  const capability = resolveBillingEmailCapability()
  const empty = {
    capability: capability.status,
    attempted: [] as BillingThresholdKind[],
    sent: [] as BillingThresholdKind[],
    skipped: [] as BillingThresholdKind[],
  }

  try {
    if (capability.status === 'HELD') {
      return empty
    }

    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { emailNotifications: true },
    })
    if (prefs && prefs.emailNotifications === false) {
      return empty
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, plan: true },
    })
    if (!user?.email) {
      return empty
    }

    const plan = (user.plan || 'starter').replace('_trial', '')
    const limits = getPlanLimits(plan)
    const [usage, payg] = await Promise.all([
      getCurrentUsage(userId),
      loadPaygSnapshot(userId),
    ])

    const periodKey = payg?.periodKey || currentPaygPeriodKey()
    const crossed = whichBillingThresholdsCrossed({
      fastUsed: usage.tokensFastUsed,
      fastLimit: limits.tokensFastPerMonth,
      premiumUsed: usage.tokensPremiumRawUsed,
      premiumLimit: limits.tokensPremiumRawPerMonth,
      paygEnabled: Boolean(payg?.enabled),
      spendCapUsdCents: payg?.spendCapUsdCents ?? null,
      accruedUsdCents: payg?.accruedUsdCents ?? 0,
    })

    const sent: BillingThresholdKind[] = []
    const skipped: BillingThresholdKind[] = []
    const usageUrl = usagePageUrl()
    const displayName = user.name?.trim() || 'there'

    for (const kind of crossed) {
      const title =
        kind === 'fast80'
          ? 'Fast AI pool at 80%+'
          : kind === 'prem80'
            ? 'Premium AI pool at 80%+'
            : kind === 'payg50'
              ? 'PAYG at 50% of spend cap'
              : 'PAYG spend cap reached'

      const message =
        kind === 'fast80' || kind === 'prem80'
          ? 'Buy credits or enable pay-as-you-go with a spend cap. Your IDE stays open.'
          : kind === 'payg50'
            ? `Accrued $${((payg?.accruedUsdCents ?? 0) / 100).toFixed(2)} of $${((payg?.spendCapUsdCents ?? 0) / 100).toFixed(2)}.`
            : 'AI post-quota path is paused until next period, wallet top-up, or a higher cap.'

      const claimed = await claimOnce(userId, kind, periodKey, title, message)
      if (!claimed) {
        skipped.push(kind)
        continue
      }

      const poolLabel = kind === 'fast80' ? 'Fast' : kind === 'prem80' ? 'Premium' : null
      const poolPct =
        kind === 'fast80'
          ? poolPercent(usage.tokensFastUsed, limits.tokensFastPerMonth)
          : kind === 'prem80'
            ? poolPercent(usage.tokensPremiumRawUsed, limits.tokensPremiumRawPerMonth)
            : null

      const result = await emailService.sendTemplate(
        TEMPLATE_BY_KIND[kind],
        { email: user.email, name: displayName },
        {
          name: displayName,
          poolLabel,
          poolPercent: poolPct,
          accruedUsd: ((payg?.accruedUsdCents ?? 0) / 100).toFixed(2),
          capUsd: ((payg?.spendCapUsdCents ?? 0) / 100).toFixed(2),
          usageUrl,
          periodKey,
        },
      )

      if (result.success && result.provider !== 'mock') {
        sent.push(kind)
        log.info('billing_threshold_email_sent', {
          userId,
          kind,
          periodKey,
          provider: result.provider,
          messageId: result.id,
        })
      } else {
        log.warn('billing_threshold_email_provider_failed', {
          userId,
          kind,
          periodKey,
          provider: result.provider,
          error: result.error,
        })
      }
    }

    return {
      capability: capability.status,
      attempted: crossed,
      sent,
      skipped,
    }
  } catch (error) {
    log.error('billing_threshold_email_eval_failed', error)
    return empty
  }
}
