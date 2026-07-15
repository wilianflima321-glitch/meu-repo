import { APIError } from '@/lib/api'

export const statusStyles: Record<string, string> = {
  paid: 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
  open: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)] border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
  draft: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)] text-[var(--aethel-text-secondary)] border border-[var(--aethel-border-secondary)]',
  uncollectible: 'bg-[var(--aethel-error)]/15 text-[var(--aethel-error-light)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
  void: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)] text-[var(--aethel-text-secondary)] border border-[var(--aethel-border-secondary)]',
  active: 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)] border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
  trialing: 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info)] border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
  canceled: 'bg-[var(--aethel-error)]/15 text-[var(--aethel-error-light)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
  incomplete: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)] border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
}

export const statusLabels: Record<string, string> = {
  paid: 'Paid',
  open: 'Open',
  draft: 'Draft',
  uncollectible: 'Uncollectible',
  void: 'Voided',
  active: 'Active',
  trialing: 'Trialing',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

export function formatUnixDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function formatIsoDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function getErrorMessage(error: unknown) {
  if (error instanceof APIError) {
    const code = typeof error.data === 'object' && error.data && 'error' in error.data ? String((error.data as { error?: unknown }).error ?? '') : ''
    if (code === 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE') return 'Billing runtime is still partial. Configure checkout, portal, and webhook before treating billing as active.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Failed to load billing data.'
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}>
      {statusLabels[status] || status}
    </span>
  )
}
