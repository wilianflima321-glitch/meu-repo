'use client'

/**
 * Block 6H.6 — Studio org pool UI (HELD until entitlements API ships).
 * Honest capability gate — no fake org numbers.
 */

import Link from 'next/link'

export function StudioOrgPoolPanel() {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--aethel-warning-light)]">
        Held — Block 6H.6
      </p>
      <h3 className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
        Studio org shared pool
      </h3>
      <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
        Per-member caps and shared Studio pool admin ship with org entitlements (Journey J4). We will not
        invent org usage meters before the API exists.
      </p>
      <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
        capabilityStatus: HELD · personal Fast/Premium meters above remain live for your account.
      </p>
      <Link
        href="/pricing"
        className="mt-4 inline-block text-sm text-[var(--aethel-info-light)] underline"
      >
        View Studio plans
      </Link>
    </div>
  )
}

export default StudioOrgPoolPanel
