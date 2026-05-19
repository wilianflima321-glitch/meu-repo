import { ArrowLeft, RefreshCcw } from 'lucide-react'

type BillingInvoicesHeaderProps = {
  onRefresh: () => void
  onBack: () => void
}

export function BillingInvoicesHeader({ onRefresh, onBack }: BillingInvoicesHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold">Invoices and billing</h1>
        <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
          Billing surfaces now reflect runtime readiness. Do not assume checkout or portal access is live unless readiness is green.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]">
          <ArrowLeft className="h-4 w-4" />
          Back to billing
        </button>
      </div>
    </div>
  )
}
