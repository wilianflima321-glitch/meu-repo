import { Suspense } from 'react'
import { BillingPageClient } from './_components/BillingPageClient'

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--aethel-surface-primary)]" />}>
      <BillingPageClient />
    </Suspense>
  )
}
