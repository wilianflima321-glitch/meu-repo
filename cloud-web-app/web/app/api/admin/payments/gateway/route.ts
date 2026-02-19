import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import {
  getIdeSettingModel,
  normalizePaymentGatewayConfig,
  PAYMENT_GATEWAY_SETTINGS_KEY,
  PAYMENT_GATEWAY_SETTINGS_SCOPE,
  readPaymentGatewayConfig,
  type PaymentGateway,
  type PaymentGatewayConfig,
} from '@/lib/server/payment-gateway-config';
import { enforceRateLimit } from '@/lib/server/rate-limit';

async function getHandler(_request: NextRequest, context: { user: { id: string } }) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'admin-payments-gateway-get',
      key: context.user.id,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many payment gateway reads. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const config = await readPaymentGatewayConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[Admin Payments Gateway] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment gateway config' }, { status: 500 });
  }
}

async function putHandler(request: NextRequest, context: { user: { id: string; email: string; role: string } }) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'admin-payments-gateway-put',
      key: context.user.id,
      max: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Too many payment gateway updates. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => ({}));

    const base = normalizePaymentGatewayConfig(body);
    const activeGateway: PaymentGateway = base.activeGateway;

    const config: PaymentGatewayConfig = {
      ...base,
      updatedBy: context.user.id,
      updatedAt: new Date().toISOString(),
    };

    const ideSetting = getIdeSettingModel();
    await ideSetting.upsert({
      where: { key_scope: { key: PAYMENT_GATEWAY_SETTINGS_KEY, scope: PAYMENT_GATEWAY_SETTINGS_SCOPE } },
      create: {
        key: PAYMENT_GATEWAY_SETTINGS_KEY,
        scope: PAYMENT_GATEWAY_SETTINGS_SCOPE,
        value: config,
        updatedBy: context.user.id,
      },
      update: {
        value: config,
        updatedBy: context.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
        category: 'security',
        severity: 'warning',
        adminId: context.user.id,
        adminEmail: context.user.email,
        adminRole: context.user.role,
        resource: 'payment.gateway.config',
        metadata: {
          activeGateway,
          checkoutEnabled: config.checkoutEnabled,
          allowLocalIdeRedirect: config.allowLocalIdeRedirect,
          checkoutOrigin: config.checkoutOrigin,
        } as any,
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[Admin Payments Gateway] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update payment gateway config' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:settings:view');
export const PUT = withAdminAuth(putHandler, 'ops:settings:edit');
