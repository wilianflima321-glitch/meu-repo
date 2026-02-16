'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getToken } from '@/lib/auth';

const ALLOWED_PLANS = new Set(['starter', 'basic', 'pro', 'studio', 'enterprise']);

export default function BillingCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const planId = useMemo(() => {
    const raw = (searchParams.get('plan') || searchParams.get('planId') || '').trim().toLowerCase();
    return ALLOWED_PLANS.has(raw) ? raw : '';
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!planId) {
          throw new Error('Plano inválido para checkout.');
        }

        const token = getToken();
        if (!token) {
          const nextPath = encodeURIComponent(`/billing/checkout?plan=${planId}`);
          router.replace(`/login?next=${nextPath}`);
          return;
        }

        const res = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ planId }),
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
  }, [planId, router]);

  if (status === 'error') {
    return (
      <main className='min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6'>
        <div className='max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6'>
          <h1 className='text-xl font-semibold mb-2'>Checkout indisponível</h1>
          <p className='text-sm text-slate-400 mb-4'>{error || 'Não foi possível iniciar o checkout.'}</p>
          <button
            onClick={() => router.push('/billing')}
            className='px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm'
          >
            Voltar para Billing
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6'>
      <div className='max-w-lg w-full rounded-xl border border-slate-800 bg-slate-900 p-6'>
        <h1 className='text-xl font-semibold mb-2'>Preparando checkout</h1>
        <p className='text-sm text-slate-400'>Estamos iniciando o gateway de pagamento para o plano selecionado.</p>
      </div>
    </main>
  );
}
