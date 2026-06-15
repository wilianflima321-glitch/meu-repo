import React from 'react'

export type DashboardAlertBannersProps = {
  authErrorText?: string | null
  billingErrorText?: string | null
}

export function DashboardAlertBanners({
  authErrorText,
  billingErrorText,
}: DashboardAlertBannersProps) {
  if (!authErrorText && !billingErrorText) return null

  return (
    <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
      <div className="flex flex-wrap gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3 text-xs text-[var(--aethel-text-secondary)]">
        {authErrorText && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-error-light)]">
            Auth: {authErrorText}
          </span>
        )}
        {billingErrorText && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-warning-light)]">
            Billing: {billingErrorText}
          </span>
        )}
      </div>
    </div>
  )
}
