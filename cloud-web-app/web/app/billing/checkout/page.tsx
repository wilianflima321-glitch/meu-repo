'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/auth';

const SELF_SERVE_PLANS = new Set(['starter', 'basic', 'pro', 'studio']);
const ALLOWED_INTERVALS = new Set(['month', 'year']);

export default function BillingCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
          throw new Error('Plano inválido para checkout.');
        }

        if (planId === 'enterprise') {
          router.replace('/contact-sales?source=billing-checkout-enterprise');
          return;
        }

        if (!SELF_SERVE_PLANS.has(planId)) {
          throw new Error('Plano invalido para checkout.');
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
          throw new Error(payload?.message || payload?.error || 'Falha ao iniciar checkout.');
        }

        if (!payload?.checkoutUrl || typeof payload.checkoutUrl !== 'string') {
          throw new Error('Checkout URL ausente na resposta.');
        }

        window.location.href = payload.checkoutUrl;
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Falha no checkout.');
      }
    };

    run();
  }, [interval, planId, router]);

  if (status === 'error') {
    return (
      <main className='min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] flex items-center justify-center p-6'>
        <div className='max-w-lg w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6'>
          <h1 className='text-xl font-semibold mb-2'>Checkout indisponível</h1>
          <p className='text-sm text-[var(--aethel-text-secondary)] mb-4'>{error || 'Não foi possível iniciar o checkout.'}</p>
          <button
            onClick={() => router.push('/billing')}
            className='px-4 py-2 rounded bg-[var(--aethel-primary-dark)] hover:bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] text-sm'
          >
            Voltar para Billing
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] flex items-center justify-center p-6'>
      <div className='max-w-lg w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6'>
        <h1 className='text-xl font-semibold mb-2'>Preparando checkout</h1>
        <p className='text-sm text-[var(--aethel-text-secondary)]'>Estamos iniciando o gateway de pagamento para o plano selecionado.</p>
      </div>
    </main>
  );
}
