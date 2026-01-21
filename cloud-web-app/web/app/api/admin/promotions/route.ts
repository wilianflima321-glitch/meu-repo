import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withAdminAuth } from '@/lib/rbac';
import { getStripe } from '@/lib/stripe';

// =============================================================================
// PROMOTIONS API (Stripe-backed)
// =============================================================================

type PromotionSummary = {
  id: string;
  name: string;
  code: string | null;
  discount: number | null;
  type: 'percentage' | 'fixed' | 'other';
  active: boolean;
  timesRedeemed: number | null;
  expiresAt: string | null;
};

function mapPromotionCode(promo: Stripe.PromotionCode): PromotionSummary {
  const coupon = promo.coupon as Stripe.Coupon | null;
  const percent = coupon?.percent_off ?? null;
  const amountOff = coupon?.amount_off ?? null;
  const amountOffFormatted = amountOff != null ? amountOff / 100 : null;

  let type: PromotionSummary['type'] = 'other';
  let discount: number | null = null;

  if (percent != null) {
    type = 'percentage';
    discount = percent;
  } else if (amountOffFormatted != null) {
    type = 'fixed';
    discount = amountOffFormatted;
  }

  return {
    id: promo.id,
    name: coupon?.name || promo.code || promo.id,
    code: promo.code,
    discount,
    type,
    active: promo.active,
    timesRedeemed: promo.times_redeemed ?? null,
    expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
  };
}

async function getHandler(_req: NextRequest) {
  try {
    const stripe = getStripe();
    const promoCodes = await stripe.promotionCodes.list({
      limit: 100,
      expand: ['data.coupon'],
    });

    return NextResponse.json({
      promotions: promoCodes.data.map(mapPromotionCode),
    });
  } catch (error) {
    console.error('[Promotions] Error:', error);
    return NextResponse.json({ error: 'Stripe not configured or unavailable' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:finance:view');

type PromotionCreatePayload = {
  name?: string;
  code?: string;
  type?: 'percentage' | 'fixed';
  discount?: number;
  maxRedemptions?: number;
  expiresAt?: string;
  currency?: string;
};

async function postHandler(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PromotionCreatePayload;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const type = body.type === 'fixed' ? 'fixed' : 'percentage';
    const discount = typeof body.discount === 'number' ? body.discount : Number(body.discount);
    const maxRedemptions = typeof body.maxRedemptions === 'number'
      ? body.maxRedemptions
      : Number(body.maxRedemptions);
    const currency = typeof body.currency === 'string' ? body.currency.toLowerCase() : 'usd';
    const expiresAt = typeof body.expiresAt === 'string' ? body.expiresAt : null;

    if (!name || !code || !Number.isFinite(discount) || discount <= 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const stripe = getStripe();
    const couponParams: Stripe.CouponCreateParams = {
      name,
    };

    if (type === 'percentage') {
      couponParams.percent_off = Math.min(100, discount);
    } else {
      couponParams.amount_off = Math.round(discount * 100);
      couponParams.currency = currency;
    }

    const coupon = await stripe.coupons.create(couponParams);

    const promoParams: Stripe.PromotionCodeCreateParams = {
      coupon: coupon.id,
      code,
      max_redemptions: Number.isFinite(maxRedemptions) && maxRedemptions > 0 ? maxRedemptions : undefined,
      expires_at: expiresAt ? Math.floor(new Date(expiresAt).getTime() / 1000) : undefined,
    };

    const promotionCode = await stripe.promotionCodes.create(promoParams);

    const expanded = await stripe.promotionCodes.retrieve(promotionCode.id, {
      expand: ['coupon'],
    });

    return NextResponse.json({ promotion: mapPromotionCode(expanded) });
  } catch (error) {
    console.error('[Promotions] Create Error:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}

type PromotionTogglePayload = {
  id?: string;
  active?: boolean;
};

async function patchHandler(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as PromotionTogglePayload;
    const id = typeof body.id === 'string' ? body.id : '';
    const active = typeof body.active === 'boolean' ? body.active : null;

    if (!id || active === null) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const stripe = getStripe();
    const updated = await stripe.promotionCodes.update(id, { active });
    const expanded = await stripe.promotionCodes.retrieve(updated.id, {
      expand: ['coupon'],
    });

    return NextResponse.json({ promotion: mapPromotionCode(expanded) });
  } catch (error) {
    console.error('[Promotions] Update Error:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

export const POST = withAdminAuth(postHandler, 'ops:finance:refund');
export const PATCH = withAdminAuth(patchHandler, 'ops:finance:refund');
