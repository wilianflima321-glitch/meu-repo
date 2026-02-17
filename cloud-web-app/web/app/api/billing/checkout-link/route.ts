import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { readPaymentGatewayConfig } from '@/lib/server/payment-gateway-config';
import { notImplementedCapability } from '@/lib/server/capability-response';
import { buildAppUrl } from '@/lib/server/app-origin';

const ALLOWED_PLANS = new Set(['starter', 'basic', 'pro', 'studio', 'enterprise']);

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);

    const gatewayConfig = await readPaymentGatewayConfig();
    if (!gatewayConfig.checkoutEnabled) {
      return NextResponse.json(
        { error: 'CHECKOUT_DISABLED', message: 'Checkout is temporarily disabled by admin.' },
        { status: 503 }
      );
    }

    if (!gatewayConfig.allowLocalIdeRedirect) {
      return NextResponse.json(
        { error: 'LOCAL_IDE_REDIRECT_DISABLED', message: 'IDE checkout handoff is disabled by admin.' },
        { status: 403 }
      );
    }

    if (gatewayConfig.activeGateway !== 'stripe') {
      return notImplementedCapability({
        error: 'PAYMENT_GATEWAY_NOT_IMPLEMENTED',
        message: `Active gateway "${gatewayConfig.activeGateway}" is not available in this build.`,
        capability: 'PAYMENT_GATEWAY_RUNTIME',
        milestone: 'P1',
        metadata: { activeGateway: gatewayConfig.activeGateway },
      });
    }

    const body = await req.json().catch(() => ({}));
    const planId = typeof body?.planId === 'string' ? body.planId.trim().toLowerCase() : '';

    if (!ALLOWED_PLANS.has(planId)) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Valid plans: starter, basic, pro, studio, enterprise' },
        { status: 400 }
      );
    }

    const origin = (gatewayConfig.checkoutOrigin || buildAppUrl('', req)).replace(/\/+$/, '');
    const webCheckoutUrl = `${origin}/billing/checkout?plan=${encodeURIComponent(planId)}`;

    return NextResponse.json({
      planId,
      webCheckoutUrl,
      handoff: 'open_in_browser',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('[billing/checkout-link] Error:', error);
    return NextResponse.json({ error: 'Failed to create checkout link' }, { status: 500 });
  }
}
