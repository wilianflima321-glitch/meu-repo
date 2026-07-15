import type Stripe from 'stripe'

import { prisma } from '@/lib/db'
import { optionalEnv } from '@/lib/env'
import { getStripe } from '@/lib/stripe'

export type CreatorPayoutAccount = {
  id: string
  userId: string
  stripeAccountId: string
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  defaultCurrency: string | null
  country: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}

type CreatorPayoutAccountRow = {
  id: string
  user_id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  default_currency: string | null
  country: string | null
  email: string | null
  created_at: Date
  updated_at: Date
}

export function isStripeConnectConfigured() {
  return Boolean(optionalEnv('STRIPE_SECRET_KEY'))
}

export function buildCreatorConnectUrls(origin: string) {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  return {
    refreshUrl: `${normalizedOrigin}/marketplace?tab=payouts&connect=refresh`,
    returnUrl: `${normalizedOrigin}/marketplace?tab=payouts&connect=return`,
  }
}

function mapCreatorPayoutAccount(row: CreatorPayoutAccountRow): CreatorPayoutAccount {
  return {
    id: row.id,
    userId: row.user_id,
    stripeAccountId: row.stripe_account_id,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    detailsSubmitted: row.details_submitted,
    defaultCurrency: row.default_currency,
    country: row.country,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getCreatorPayoutAccount(userId: string) {
  const rows = await prisma.$queryRaw<CreatorPayoutAccountRow[]>`
    SELECT
      id,
      user_id,
      stripe_account_id,
      charges_enabled,
      payouts_enabled,
      details_submitted,
      default_currency,
      country,
      email,
      created_at,
      updated_at
    FROM marketplace_creator_payout_accounts
    WHERE user_id = ${userId}
    LIMIT 1
  `

  return rows[0] ? mapCreatorPayoutAccount(rows[0]) : null
}

async function upsertCreatorPayoutAccount(params: {
  userId: string
  stripeAccount: Stripe.Account
}) {
  const account = params.stripeAccount
  const id = `creator-payout-${params.userId}`
  const email = typeof account.email === 'string' ? account.email : null
  const country = typeof account.country === 'string' ? account.country : null
  const defaultCurrency = typeof account.default_currency === 'string' ? account.default_currency : null

  await prisma.$executeRaw`
    INSERT INTO marketplace_creator_payout_accounts (
      id,
      user_id,
      stripe_account_id,
      charges_enabled,
      payouts_enabled,
      details_submitted,
      default_currency,
      country,
      email,
      updated_at
    )
    VALUES (
      ${id},
      ${params.userId},
      ${account.id},
      ${Boolean(account.charges_enabled)},
      ${Boolean(account.payouts_enabled)},
      ${Boolean(account.details_submitted)},
      ${defaultCurrency},
      ${country},
      ${email},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_account_id = EXCLUDED.stripe_account_id,
      charges_enabled = EXCLUDED.charges_enabled,
      payouts_enabled = EXCLUDED.payouts_enabled,
      details_submitted = EXCLUDED.details_submitted,
      default_currency = EXCLUDED.default_currency,
      country = EXCLUDED.country,
      email = EXCLUDED.email,
      updated_at = CURRENT_TIMESTAMP
  `

  return getCreatorPayoutAccount(params.userId)
}

export async function createOrRefreshCreatorPayoutAccount(params: {
  userId: string
  email: string
  country?: string
}) {
  const existing = await getCreatorPayoutAccount(params.userId)
  const stripe = getStripe()
  const stripeAccount = existing
    ? await stripe.accounts.retrieve(existing.stripeAccountId)
    : await stripe.accounts.create({
        type: 'express',
        country: params.country || 'US',
        email: params.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Digital assets and creative tools sold through Aethel Marketplace.',
        },
      })

  return upsertCreatorPayoutAccount({
    userId: params.userId,
    stripeAccount: stripeAccount as Stripe.Account,
  })
}

export async function createCreatorOnboardingLink(params: {
  accountId: string
  origin: string
}) {
  const stripe = getStripe()
  const urls = buildCreatorConnectUrls(params.origin)
  return stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: urls.refreshUrl,
    return_url: urls.returnUrl,
    type: 'account_onboarding',
  })
}

export async function syncCreatorPayoutAccountStatus(stripeAccount: Stripe.Account) {
  const email = typeof stripeAccount.email === 'string' ? stripeAccount.email : null
  const country = typeof stripeAccount.country === 'string' ? stripeAccount.country : null
  const defaultCurrency =
    typeof stripeAccount.default_currency === 'string' ? stripeAccount.default_currency : null

  await prisma.$executeRaw`
    UPDATE marketplace_creator_payout_accounts
    SET
      charges_enabled = ${Boolean(stripeAccount.charges_enabled)},
      payouts_enabled = ${Boolean(stripeAccount.payouts_enabled)},
      details_submitted = ${Boolean(stripeAccount.details_submitted)},
      default_currency = ${defaultCurrency},
      country = ${country},
      email = COALESCE(${email}, email),
      updated_at = CURRENT_TIMESTAMP
    WHERE stripe_account_id = ${stripeAccount.id}
  `

  const rows = await prisma.$queryRaw<CreatorPayoutAccountRow[]>`
    SELECT
      id,
      user_id,
      stripe_account_id,
      charges_enabled,
      payouts_enabled,
      details_submitted,
      default_currency,
      country,
      email,
      created_at,
      updated_at
    FROM marketplace_creator_payout_accounts
    WHERE stripe_account_id = ${stripeAccount.id}
    LIMIT 1
  `

  return rows[0] ? mapCreatorPayoutAccount(rows[0]) : null
}

export async function transferToCreator(params: {
  creatorStripeAccountId: string
  amountCents: number
  currency?: string
  sourceTransaction?: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()
  return stripe.transfers.create({
    amount: params.amountCents,
    currency: params.currency || 'usd',
    destination: params.creatorStripeAccountId,
    source_transaction: params.sourceTransaction,
    metadata: params.metadata,
  })
}
