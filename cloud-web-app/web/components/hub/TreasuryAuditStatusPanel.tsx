'use client'

/**
 * Internal H.1+ Treasury audit status — shows HELD reasons only.
 * Never renders Buy / Coins mint CTAs. Auth-gated via treasury-honesty API.
 */

import { useEffect, useState } from 'react'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('TreasuryAuditStatusPanel')

type AuditHeldItem = {
  id: string
  kind?: string
  title: string
  status: string
  reason: string
  heldReason?: string
}

type AuditPayload = {
  hubCheckoutAudited?: boolean
  audit?: {
    claim?: string
    productCopy?: string
    certificatePresent?: boolean
    forbiddenForceEnvPresent?: boolean
    heldItems?: AuditHeldItem[]
    checklist?: AuditHeldItem[]
  }
}

type Props = {
  /** When provided (from public hub-honesty), skip auth API. */
  heldReasons?: AuditHeldItem[]
  claim?: string
  compact?: boolean
}

export function TreasuryAuditStatusPanel({
  heldReasons: heldReasonsProp,
  claim: claimProp,
  compact = false,
}: Props) {
  const [payload, setPayload] = useState<AuditPayload | null>(null)
  const [authDenied, setAuthDenied] = useState(false)

  useEffect(() => {
    if (heldReasonsProp) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/runtime/treasury-honesty', { cache: 'no-store' })
        if (res.status === 401) {
          if (!cancelled) setAuthDenied(true)
          return
        }
        if (!res.ok) throw new Error(`treasury honesty ${res.status}`)
        const data = (await res.json()) as AuditPayload
        if (!cancelled) setPayload(data)
      } catch (err) {
        log.warn('treasury_audit_status_fetch_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [heldReasonsProp])

  const held =
    heldReasonsProp ??
    payload?.audit?.heldItems ??
    payload?.audit?.checklist?.filter((c) => c.status !== 'PASS') ??
    []
  const claim =
    claimProp ??
    payload?.audit?.claim ??
    'Hub checkout / Aethel Coins [HELD] until H.1+ Treasury audit'
  const audited = payload?.hubCheckoutAudited === true && held.length === 0

  if (audited) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)] px-4 py-3"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-success-light)]">
          Treasury audit live
        </p>
        <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{claim}</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div
        role="status"
        title={claim}
        className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-4 py-3"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
          Hub checkout / Coins [HELD]
        </p>
        <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
          {held.length > 0
            ? `${held.length} Treasury audit item(s) open — no Buy or Coins CTAs.`
            : authDenied
              ? 'Sign in to view internal Treasury audit checklist. Hub checkout stays fail-closed.'
              : 'Fail-closed until H.1+ Treasury audit PASSes — not a mock store strip.'}
        </p>
        {held.length > 0 ? (
          <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]">
            {held.slice(0, 6).map((item) => (
              <li key={item.id}>
                <span className="text-[var(--aethel-warning-light)]">{item.title}</span>
                {': '}
                {item.reason}
              </li>
            ))}
            {held.length > 6 ? <li>+{held.length - 6} more</li> : null}
          </ul>
        ) : null}
      </div>
    )
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-4 py-3"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-warning-light)]">
        Treasury H.1+ audit [HELD]
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--aethel-text-tertiary)]">{claim}</p>
      {payload?.audit?.forbiddenForceEnvPresent ? (
        <p className="mt-2 text-[11px] text-[var(--aethel-warning-light)]">
          FORCE_HUB_CHECKOUT env detected and ignored — no theater unlock.
        </p>
      ) : null}
      {held.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {held.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] px-2.5 py-1.5 text-[11px] leading-4 text-[var(--aethel-text-tertiary)]"
            >
              <span className="font-semibold text-[var(--aethel-warning-light)]">
                {item.kind === 'human' ? 'Human' : 'Technical'} · {item.title}
              </span>
              <span className="mt-0.5 block">{item.reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          {authDenied
            ? 'Sign in to load the internal audit checklist. Checkout remains fail-closed.'
            : 'Loading audit checklist…'}
        </p>
      )}
    </div>
  )
}

export default TreasuryAuditStatusPanel
