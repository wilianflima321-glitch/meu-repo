import { afterEach, describe, expect, it } from 'vitest';

import { buildCreatorConnectUrls, isStripeConnectConfigured } from '@/lib/server/stripe-connect';

describe('stripe-connect helpers', () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('normalizes marketplace creator onboarding return URLs', () => {
    expect(buildCreatorConnectUrls('https://aethel.app/')).toEqual({
      refreshUrl: 'https://aethel.app/marketplace?tab=payouts&connect=refresh',
      returnUrl: 'https://aethel.app/marketplace?tab=payouts&connect=return',
    });
  });

  it('keeps creator payout onboarding behind Stripe configuration', () => {
    expect(isStripeConnectConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = 'sk_test_aethel';
    expect(isStripeConnectConfigured()).toBe(true);
  });
});