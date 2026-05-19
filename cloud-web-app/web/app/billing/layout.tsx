import type { ReactNode } from 'react'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

function BillingLayoutFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-primary)]">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] p-6 shadow-2xl shadow-[0_24px_70px_rgba(2,8,23,0.35)]">
        <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Loading billing</p>
        <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">
          Preparing plans, usage, and workspace billing status.
        </p>
      </div>
    </div>
  )
}

const BillingRuntimeLayout = nextDynamic(() => import('./billing-runtime-layout'), {
  ssr: false,
  loading: () => <BillingLayoutFallback />,
})

export default function BillingLayout({ children }: { children: ReactNode }) {
  return <BillingRuntimeLayout>{children}</BillingRuntimeLayout>
}
