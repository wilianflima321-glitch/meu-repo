'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';

const SELF_SERVE_PLANS = new Set(['starter', 'basic', 'pro', 'studio']);
const ALLOWED_INTERVALS = new Set(['month', 'year']);

export default function BillingCheckoutContent() {
  const router = useRouter();
  const search = useBrowserSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const planId = useMemo(() => {
    const raw = (searchParams.get('plan') || searchParams.get('planId') || '').trim().toLowerCase();
    return raw;
  }, [searchParams]);

  const interval = useMemo(() => {
    const raw = (searchParams.get('interval') || searchParams.get('billingInterval') || '').trim().toLowerCase();
    return ALLOWED_INTERVALS.has(raw) ? raw : 'month';
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!planId) {
          throw new Error('Invalid plan for checkout.');
        }

        if (planId === 'enterprise') {
          router.replace('/contact-sales?source=billing-checkout-enterprise');
          return;
        }

        if (!SELF_SERVE_PLANS.has(planId)) {
          throw new Error('Invalid plan for checkout.');
        }

        const token = getToken();
        if (!token) {
          const nextPath = encodeURIComponent(`/billing/checkout?plan=${planId}&interval=${interval}`);
          router.replace(`/login?next=${nextPath}`);
          return;
        }

        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId, interval }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.message || payload?.error || 'Failed to start checkout.');
        }

        if (!payload?.checkoutUrl || typeof payload.checkoutUrl !== 'string') {
          throw new Error('Checkout URL is missing from the response.');
        }

        window.location.href = payload.checkoutUrl;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Checkout failed.');
      }
    };

    void run();
  }, [interval, planId, router]);

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
        <div className="w-full max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
          <h1 className="mb-2 text-xl font-semibold">Checkout unavailable</h1>
          <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            {error || 'Unable to start checkout.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/billing')}
            className="rounded bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary)]"
          >
            Back to billing
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="mb-2 text-xl font-semibold">Preparing checkout</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">
          Starting the payment gateway for the selected plan.
        </p>
      </div>
    </main>
  );
}
