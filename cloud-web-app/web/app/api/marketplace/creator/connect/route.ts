import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import {
  buildCreatorConnectUrls,
  createCreatorOnboardingLink,
  createOrRefreshCreatorPayoutAccount,
  getCreatorPayoutAccount,
  isStripeConnectConfigured,
} from '@/lib/server/stripe-connect'
import { enforceRouteRateLimit, MARKETPLACE_READ_RATE_LIMIT, MARKETPLACE_STRIPE_CONNECT_RATE_LIMIT } from '@/lib/server/route-rate-limit'

export const dynamic = 'force-dynamic'

function resolveOrigin(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    request.headers.get('origin') ||
    request.nextUrl.origin
  )
}

function serializeConnectStatus(account: Awaited<ReturnType<typeof getCreatorPayoutAccount>>) {
  if (!account) {
    return {
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      stripeAccountId: null,
      country: null,
      defaultCurrency: null,
    }
  }

  return {
    connected: true,
    chargesEnabled: account.chargesEnabled,
    payoutsEnabled: account.payoutsEnabled,
    detailsSubmitted: account.detailsSubmitted,
    stripeAccountId: account.stripeAccountId,
    country: account.country,
    defaultCurrency: account.defaultCurrency,
    updatedAt: account.updatedAt.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_CREATOR_CONNECT_STATUS',
      route: '/api/marketplace/creator/connect:status',
      config: MARKETPLACE_READ_RATE_LIMIT,
      identifier: user.userId,
    })
    if (rateLimited) return rateLimited

    const account = await getCreatorPayoutAccount(user.userId)
    const origin = resolveOrigin(request)

    return NextResponse.json({
      configured: isStripeConnectConfigured(),
      ...serializeConnectStatus(account),
      urls: buildCreatorConnectUrls(origin),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to load creator payout status')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)

    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_CREATOR_CONNECT_ONBOARD',
      route: '/api/marketplace/creator/connect:onboard',
      config: MARKETPLACE_STRIPE_CONNECT_RATE_LIMIT,
      identifier: user.userId,
    })
    if (rateLimited) return rateLimited

    if (!isStripeConnectConfigured()) {
      return NextResponse.json(
        {
          error: 'STRIPE_CONNECT_NOT_CONFIGURED',
          message: 'Set STRIPE_SECRET_KEY before onboarding marketplace creators.',
        },
        { status: 503 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const country = typeof body?.country === 'string' ? body.country.toUpperCase().slice(0, 2) : undefined
    const account = await createOrRefreshCreatorPayoutAccount({
      userId: user.userId,
      email: user.email,
      country,
    })

    if (!account) {
      return apiInternalError('Failed to prepare creator payout account')
    }

    const link = await createCreatorOnboardingLink({
      accountId: account.stripeAccountId,
      origin: resolveOrigin(request),
    })

    return NextResponse.json({
      ...serializeConnectStatus(account),
      onboardingUrl: link.url,
      expiresAt: new Date(link.expires_at * 1000).toISOString(),
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to create Stripe Connect onboarding link')
  }
}

