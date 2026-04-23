import { Suspense } from 'react';
import BillingCheckoutContent from './checkout-content';

function BillingCheckoutFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="mb-2 text-xl font-semibold">Preparando checkout</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando parametros do checkout...</p>
      </div>
    </main>
  );
}

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={<BillingCheckoutFallback />}>
      <BillingCheckoutContent />
    </Suspense>
  );
}
