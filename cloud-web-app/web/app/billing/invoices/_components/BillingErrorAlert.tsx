import { AlertCircle } from 'lucide-react'

export function BillingErrorAlert({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--aethel-error-light)]" />
        <div>
          <p className="text-sm font-medium text-[var(--aethel-error-light)]">Could not load billing data</p>
          <p className="mt-1 text-sm text-[var(--aethel-error-light)]/80">{error}</p>
        </div>
      </div>
    </div>
  )
}
