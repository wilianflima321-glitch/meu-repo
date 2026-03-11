import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { readPaymentGatewayConfig } from '@/lib/server/payment-gateway-config';
import { capabilityResponse } from '@/lib/server/capability-response';
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
      return capabilityResponse({
        error: 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE',
        message: `Active gateway "${gatewayConfig.activeGateway}" is not available in this build.`,
        status: 503,
        capability: 'PAYMENT_GATEWAY_RUNTIME',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          activeGateway: gatewayConfig.activeGateway,
          supportedGateway: 'stripe',
          checkoutEnabled: gatewayConfig.checkoutEnabled,
        },
      });
    }

    const body = await req.json().catch(() => ({}));
    const planId = typeof body?.planId === 'string' ? body.planId.trim().toLowerCase() : '';
    const intervalRaw = typeof body?.interval === 'string' ? body.interval.trim().toLowerCase() : '';
    const interval = intervalRaw === 'year' || intervalRaw === 'month' ? intervalRaw : 'month';

    if (!ALLOWED_PLANS.has(planId)) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Valid plans: starter, basic, pro, studio, enterprise' },
        { status: 400 }
      );
    }

    const origin = (gatewayConfig.checkoutOrigin || buildAppUrl('', req)).replace(/\/+$/, '');
    const webCheckoutUrl = `${origin}/billing/checkout?plan=${encodeURIComponent(planId)}&interval=${encodeURIComponent(interval)}`;

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
