import { prisma } from '@/lib/db';

export type PaymentGateway = 'stripe' | 'disabled';

export type PaymentGatewayConfig = {
  activeGateway: PaymentGateway;
  checkoutEnabled: boolean;
  allowLocalIdeRedirect: boolean;
  checkoutOrigin: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export const PAYMENT_GATEWAY_SETTINGS_KEY = 'payment.gateway.config';
export const PAYMENT_GATEWAY_SETTINGS_SCOPE = 'global';

export const DEFAULT_PAYMENT_GATEWAY_CONFIG: PaymentGatewayConfig = {
  activeGateway: 'stripe',
  checkoutEnabled: true,
  allowLocalIdeRedirect: true,
  checkoutOrigin: null,
  updatedBy: null,
  updatedAt: null,
};

function normalizeCheckoutOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function getIdeSettingModel() {
  const ideSetting = (prisma as any).ideSetting;
  if (!ideSetting) {
    throw new Error('IDE settings model not configured');
  }
  return ideSetting;
}

export function normalizePaymentGatewayConfig(input: unknown): PaymentGatewayConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ...DEFAULT_PAYMENT_GATEWAY_CONFIG };
  }

  const raw = input as Record<string, unknown>;

  return {
    activeGateway: raw.activeGateway === 'disabled' ? 'disabled' : 'stripe',
    checkoutEnabled: raw.checkoutEnabled !== false,
    allowLocalIdeRedirect: raw.allowLocalIdeRedirect !== false,
    checkoutOrigin: normalizeCheckoutOrigin(raw.checkoutOrigin),
    updatedBy: typeof raw.updatedBy === 'string' && raw.updatedBy.trim() ? raw.updatedBy.trim() : null,
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt.trim() ? raw.updatedAt.trim() : null,
  };
}

export async function readPaymentGatewayConfig(): Promise<PaymentGatewayConfig> {
  const ideSetting = getIdeSettingModel();
  const row = await ideSetting.findUnique({
    where: {
      key_scope: {
        key: PAYMENT_GATEWAY_SETTINGS_KEY,
        scope: PAYMENT_GATEWAY_SETTINGS_SCOPE,
      },
    },
    select: { value: true },
  });

  return normalizePaymentGatewayConfig(row?.value);
}
