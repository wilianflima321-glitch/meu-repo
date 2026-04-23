import { Suspense } from 'react'
import BillingSuccessContent from './success-content'

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

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<BillingSuccessFallback />}>
      <BillingSuccessContent />
    </Suspense>
  )
}
