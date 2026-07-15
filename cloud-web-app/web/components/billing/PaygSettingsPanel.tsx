'use client'

/**
 * Block 6C.6 + 6C.4 — PAYG settings panel (mandatory spend cap + PM setup).
 */

import React, { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, CreditCard, Loader2, Zap } from 'lucide-react'
import {
  PAYG_CAP_PRESETS_USD,
  PAYG_CUSTOM_CAP_MAX_USD,
  PAYG_CUSTOM_CAP_MIN_USD,
} from '@/lib/billing/payg-constants'
import { createComponentLogger } from '@/lib/observability/logger'

const logger = createComponentLogger('PaygSettingsPanel')

type PaygApiResponse = {
  success?: boolean
  payg?: {
    enabled: boolean
    spendCapUsdCents: number | null
    accruedUsdCents: number
    remainingCapUsdCents: number | null
    periodKey: string
    hasPaymentMethod: boolean
    invoiceCapabilityStatus?: string
    invoiceMessage?: string
  }
  presetsUsd?: number[]
  message?: string
  error?: string
  checkoutUrl?: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function centsToUsdLabel(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

export function PaygSettingsPanel({ focusId = 'payg-panel' }: { focusId?: string }) {
  const { data, mutate, isLoading } = useSWR<PaygApiResponse>('/api/billing/payg', fetcher, {
    refreshInterval: 30_000,
  })
  const payg = data?.payg
  const presets = data?.presetsUsd?.length ? data.presetsUsd : [...PAYG_CAP_PRESETS_USD]

  const [enabledDraft, setEnabledDraft] = useState<boolean | null>(null)
  const [capUsd, setCapUsd] = useState<string>('25')
  const [customMode, setCustomMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTone, setNoticeTone] = useState<'error' | 'info'>('info')

  const enabled = enabledDraft ?? Boolean(payg?.enabled)

  React.useEffect(() => {
    if (payg?.spendCapUsdCents != null) {
      setCapUsd(String(payg.spendCapUsdCents / 100))
    }
  }, [payg?.spendCapUsdCents])

  const accruedPct = useMemo(() => {
    if (!payg?.spendCapUsdCents || payg.spendCapUsdCents <= 0) return 0
    return Math.min(100, Math.round((payg.accruedUsdCents / payg.spendCapUsdCents) * 100))
  }, [payg])

  const save = useCallback(
    async (nextEnabled: boolean) => {
      setBusy(true)
      setNotice(null)
      try {
        const body: { enabled: boolean; spendCapUsd?: number } = { enabled: nextEnabled }
        if (nextEnabled) {
          const n = Number(capUsd)
          if (!Number.isFinite(n)) {
            setNoticeTone('error')
            setNotice('Choose a valid spend cap before enabling PAYG.')
            setBusy(false)
            return
          }
          body.spendCapUsd = n
        }

        const res = await fetch('/api/billing/payg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const payload = (await res.json().catch(() => ({}))) as PaygApiResponse
        if (!res.ok) {
          setNoticeTone('error')
          setNotice(payload.message || payload.error || 'Could not update PAYG settings.')
          return
        }
        setEnabledDraft(null)
        setNoticeTone('info')
        setNotice(
          nextEnabled
            ? 'Pay-as-you-go enabled with your spend cap. IDE stays unlocked.'
            : 'Pay-as-you-go turned off. Subscription pools and wallet still apply.',
        )
        await mutate()
      } catch (err) {
        logger.error('payg_save_failed', err)
        setNoticeTone('error')
        setNotice('Network error while updating PAYG.')
      } finally {
        setBusy(false)
      }
    },
    [capUsd, mutate],
  )

  const startPaymentMethodSetup = useCallback(async () => {
    setBusy(true)
    setNotice(null)
    try {
      const res = await fetch('/api/billing/payg/setup-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = (await res.json().catch(() => ({}))) as PaygApiResponse
      if (!res.ok || !payload.checkoutUrl) {
        setNoticeTone('error')
        setNotice(
          payload.message ||
            payload.error ||
            'Could not start payment-method setup. Stripe checkout may be held.',
        )
        return
      }
      window.location.href = payload.checkoutUrl
    } catch (err) {
      logger.error('payg_pm_setup_failed', err)
      setNoticeTone('error')
      setNotice('Network error while starting payment-method setup.')
    } finally {
      setBusy(false)
    }
  }, [])

  if (isLoading && !payg) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 text-sm text-[var(--aethel-text-tertiary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading PAYG settings…
      </div>
    )
  }

  return (
    <section
      id={focusId}
      className="space-y-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)]">
            <Zap className="h-5 w-5 text-[var(--aethel-info-light)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--aethel-text-primary)]">Pay-as-you-go</h3>
            <p className="mt-1 max-w-xl text-sm text-[var(--aethel-text-tertiary)]">
              After Fast/Premium pools and wallet, continue AI at prepaid × 1.10 with a mandatory
              monthly spend cap. Default is off — no surprise bills.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--aethel-text-secondary)]">
          <span>{enabled ? 'On' : 'Off'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={busy}
            onClick={() => {
              const next = !enabled
              setEnabledDraft(next)
              if (!next) void save(false)
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              enabled ? 'bg-[var(--aethel-success)]' : 'bg-[var(--aethel-surface-tertiary)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--aethel-text-primary)] transition-transform ${
                enabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex gap-2 rounded-lg px-3 py-2 text-sm ${
            noticeTone === 'error'
              ? 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">
          Spend cap (required to enable)
        </p>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => {
                setCustomMode(false)
                setCapUsd(String(p))
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                !customMode && Number(capUsd) === p
                  ? 'border-[var(--aethel-info)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)]'
                  : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              ${p}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => setCustomMode(true)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              customMode
                ? 'border-[var(--aethel-info)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
                : 'border-[var(--aethel-border-primary)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            Custom
          </button>
        </div>
        {customMode && (
          <label className="flex flex-col gap-1 text-xs text-[var(--aethel-text-tertiary)]">
            Custom USD ({PAYG_CUSTOM_CAP_MIN_USD}–{PAYG_CUSTOM_CAP_MAX_USD})
            <input
              type="number"
              min={PAYG_CUSTOM_CAP_MIN_USD}
              max={PAYG_CUSTOM_CAP_MAX_USD}
              step="1"
              value={capUsd}
              onChange={(e) => setCapUsd(e.target.value)}
              className="w-36 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)]"
            />
          </label>
        )}
      </div>

      {payg?.enabled && (
        <div className="space-y-2 rounded-lg bg-[var(--aethel-surface-tertiary)] p-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--aethel-text-tertiary)]">Accrued this period</span>
            <span className="font-medium text-[var(--aethel-text-primary)]">
              {centsToUsdLabel(payg.accruedUsdCents)} / {centsToUsdLabel(payg.spendCapUsdCents)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--aethel-surface-primary)]">
            <div
              className={`h-full rounded-full ${
                accruedPct >= 100
                  ? 'bg-[var(--aethel-error)]'
                  : accruedPct >= 50
                    ? 'bg-[var(--aethel-warning)]'
                    : 'bg-[var(--aethel-success)]'
              }`}
              style={{ width: `${accruedPct}%` }}
            />
          </div>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Remaining cap: {centsToUsdLabel(payg.remainingCapUsdCents)} · Period {payg.periodKey}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] p-3">
        <CreditCard className="h-4 w-4 shrink-0 text-[var(--aethel-text-tertiary)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
            {payg?.hasPaymentMethod ? 'Payment method on file' : 'No payment method'}
          </p>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">
            Invoice status: {payg?.invoiceCapabilityStatus || 'HELD'} —{' '}
            {payg?.invoiceMessage ||
              'Save a card to enable Stripe flush at $25 accrued or month-end.'}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void startPaymentMethodSetup()}
          className="rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)] disabled:opacity-50"
        >
          {payg?.hasPaymentMethod ? 'Update card' : 'Add payment method'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !enabled}
          onClick={() => void save(true)}
          className="rounded-lg bg-[var(--aethel-info)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] disabled:opacity-50"
        >
          {busy ? 'Saving…' : payg?.enabled ? 'Update spend cap' : 'Enable with this cap'}
        </button>
      </div>
    </section>
  )
}
