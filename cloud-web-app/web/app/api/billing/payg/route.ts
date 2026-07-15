/**
 * POST /api/billing/payg — enable/disable PAYG with mandatory spend cap (6C.1–6C.2).
 * GET  /api/billing/payg — current PAYG snapshot for Usage UI.
 *
 * Stripe metered invoice flush (6C.4) remains HELD until payment method + meter live.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  PAYG_BILL_THRESHOLD_USD_CENTS,
  PAYG_CAP_PRESETS_USD,
  PAYG_CUSTOM_CAP_MAX_USD,
  PAYG_CUSTOM_CAP_MIN_USD,
  loadPaygSnapshot,
  setPaygSettings,
} from '@/lib/billing/payg-policy'
import { resolvePaygInvoiceCapability } from '@/lib/billing/payg-invoice-flush'

const routeLogger = createComponentLogger('api/billing/payg/route')
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const snapshot = await loadPaygSnapshot(user.userId)
    if (!snapshot) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
    }

    const invoice = resolvePaygInvoiceCapability(snapshot)

    return NextResponse.json({
      success: true,
      payg: {
        enabled: snapshot.enabled,
        spendCapUsdCents: snapshot.spendCapUsdCents,
        accruedUsdCents: snapshot.accruedUsdCents,
        remainingCapUsdCents:
          snapshot.spendCapUsdCents == null
            ? null
            : Math.max(0, snapshot.spendCapUsdCents - snapshot.accruedUsdCents),
        periodKey: snapshot.periodKey,
        hasPaymentMethod: snapshot.hasPaymentMethod,
        billThresholdUsdCents: PAYG_BILL_THRESHOLD_USD_CENTS,
        invoiceCapabilityStatus: invoice.status,
        invoiceMessage: invoice.message,
        setupPaymentMethodPath: '/api/billing/payg/setup-payment-method',
      },
      presetsUsd: [...PAYG_CAP_PRESETS_USD],
      customCapMinUsd: PAYG_CUSTOM_CAP_MIN_USD,
      customCapMaxUsd: PAYG_CUSTOM_CAP_MAX_USD,
      capability: 'PAYG',
      capabilityStatus: 'IMPLEMENTED',
      ideLocked: false,
    })
  } catch (error) {
    routeLogger.error('payg_get_error', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as {
      enabled?: boolean
      spendCapUsd?: number
      stripePaymentMethodId?: string | null
    }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        {
          error: 'INVALID_BODY',
          message: 'Body must include enabled: boolean. Cap required when enabling.',
          capability: 'PAYG',
          capabilityStatus: 'IMPLEMENTED',
          ideLocked: false,
        },
        { status: 400 },
      )
    }

    const result = await setPaygSettings({
      userId: user.userId,
      enabled: body.enabled,
      spendCapUsd: body.spendCapUsd,
      stripePaymentMethodId: body.stripePaymentMethodId,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.code,
          message: result.message,
          capability: 'PAYG',
          capabilityStatus: 'IMPLEMENTED',
          ideLocked: false,
        },
        { status: result.code === 'USER_NOT_FOUND' ? 404 : 400 },
      )
    }

    return NextResponse.json({
      success: true,
      payg: result.snapshot,
      capability: 'PAYG',
      capabilityStatus: 'IMPLEMENTED',
      ideLocked: false,
    })
  } catch (error) {
    routeLogger.error('payg_post_error', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
