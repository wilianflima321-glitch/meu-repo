import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

function BillingSuccessFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-xl rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
        <h1 className="mb-2 text-2xl font-semibold">Checkout concluido</h1>
        <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando confirmacao do billing...</p>
      </div>
    </main>
  )
}

const BillingSuccessContent = nextDynamic(() => import('./success-content'), {
  ssr: false,
  loading: () => <BillingSuccessFallback />,
})

export default function BillingSuccessPage() {
  return <BillingSuccessContent />
}
