import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic'

function BillingCheckoutFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-lg rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="mb-2 text-xl font-semibold">Preparing checkout</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">Loading checkout parameters...</p>
      </div>
    </main>
  );
}

const BillingCheckoutContent = nextDynamic(() => import('./checkout-content'), {
  ssr: false,
  loading: () => <BillingCheckoutFallback />,
})

export default function BillingCheckoutPage() {
  return <BillingCheckoutContent />
}
