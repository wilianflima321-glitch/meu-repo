'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'

import PublicFooter from '@/components/ui/PublicFooter'
import PublicHeader from '@/components/ui/PublicHeader'

type CreatorConnectStatus = {
  configured: boolean
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  stripeAccountId: string | null
  defaultCurrency: string | null
  country: string | null
  onboardingUrl?: string
  expiresAt?: string
  urls?: {
    refreshUrl: string
    returnUrl: string
  }
}

type LoadState = 'loading' | 'ready' | 'error'

function statusCopy(status: CreatorConnectStatus | null) {
  if (!status) return { label: 'Checking', tone: 'neutral', helper: 'Loading creator payout readiness.' }
  if (!status.configured) {
    return {
      label: 'Provider not configured',
      tone: 'warning',
      helper: 'Stripe Connect is intentionally held until STRIPE_SECRET_KEY is configured.',
    }
  }
  if (status.payoutsEnabled) {
    return {
      label: 'Payouts active',
      tone: 'success',
      helper: 'Your creator account can receive marketplace payouts after sales clear.',
    }
  }
  if (status.detailsSubmitted) {
    return {
      label: 'Under Stripe review',
      tone: 'info',
      helper: 'Stripe has your details and is completing eligibility checks.',
    }
  }
  if (status.connected) {
    return {
      label: 'Onboarding incomplete',
      tone: 'warning',
      helper: 'Continue Stripe Express onboarding to unlock real payouts.',
    }
  }
  return {
    label: 'Not connected',
    tone: 'neutral',
    helper: 'Connect Stripe Express before listing paid marketplace assets.',
  }
}

function readinessSteps(status: CreatorConnectStatus | null) {
  return [
    { label: 'Stripe provider configured', done: Boolean(status?.configured) },
    { label: 'Creator account created', done: Boolean(status?.connected) },
    { label: 'Identity and business details submitted', done: Boolean(status?.detailsSubmitted) },
    { label: 'Charges enabled', done: Boolean(status?.chargesEnabled) },
    { label: 'Payouts enabled', done: Boolean(status?.payoutsEnabled) },
  ]
}

export default function CreatorPayoutOnboardingPage() {
  const [status, setStatus] = useState<CreatorConnectStatus | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    setLoadState('loading')
    setError(null)
    try {
      const response = await fetch('/api/marketplace/creator/connect', { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as CreatorConnectStatus | { message?: string; error?: string } | null
      if (!response.ok) {
        throw new Error(payload && 'message' in payload ? payload.message || payload.error || 'Failed to load creator payout status.' : 'Failed to load creator payout status.')
      }
      setStatus(payload as CreatorConnectStatus)
      setLoadState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load creator payout status.')
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const startOnboarding = useCallback(async () => {
    setIsStarting(true)
    setError(null)
    try {
      const response = await fetch('/api/marketplace/creator/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: status?.country || 'US' }),
      })
      const payload = (await response.json().catch(() => null)) as CreatorConnectStatus | { message?: string; error?: string } | null
      if (!response.ok || !payload || !('onboardingUrl' in payload) || !payload.onboardingUrl) {
        throw new Error(payload && 'message' in payload ? payload.message || payload.error || 'Stripe onboarding is not ready.' : 'Stripe onboarding is not ready.')
      }
      window.location.assign(payload.onboardingUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe Express onboarding.')
      setIsStarting(false)
    }
  }, [status?.country])

  const copy = useMemo(() => statusCopy(status), [status])
  const steps = useMemo(() => readinessSteps(status), [status])
  const completedSteps = steps.filter((step) => step.done).length

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_98%,transparent))] p-8 shadow-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-secondary)] px-3 py-1 text-xs text-[var(--aethel-text-tertiary)]">
              <WalletCards className="h-3.5 w-3.5" />
              Marketplace creator payouts
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Connect Stripe Express without fake payout promises.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--aethel-text-secondary)] md:text-base">
              Aethel only unlocks paid marketplace flows after the creator account, charge capability, payout capability, and review evidence are explicit.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startOnboarding}
                disabled={!status?.configured || isStarting || loadState === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--aethel-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                {status?.connected ? 'Continue Stripe onboarding' : 'Start Stripe Express'}
              </button>
              <button
                type="button"
                onClick={() => void loadStatus()}
                disabled={loadState === 'loading'}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)] disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
                Refresh status
              </button>
            </div>
            {error ? (
              <div className="mt-5 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_32%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">
                {error}
              </div>
            ) : null}
          </div>

          <aside className="rounded-3xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Current status</p>
                <h2 className="mt-2 text-2xl font-semibold">{copy.label}</h2>
                <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">{copy.helper}</p>
              </div>
              <ShieldCheck className="h-7 w-7 text-[var(--aethel-success)]" />
            </div>
            <div className="mt-6 rounded-2xl border border-[var(--aethel-border-secondary)] p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-[var(--aethel-text-tertiary)]">
                <span>Readiness</span>
                <span>{completedSteps}/{steps.length}</span>
              </div>
              <div className="space-y-3">
                {steps.map((step) => (
                  <div key={step.label} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`h-4 w-4 ${step.done ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-text-quaternary)]'}`} />
                    <span className={step.done ? 'text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)]'}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-[var(--aethel-border-secondary)] p-3">
                <dt className="text-xs text-[var(--aethel-text-tertiary)]">Account</dt>
                <dd className="mt-1 truncate font-mono text-xs">{status?.stripeAccountId || 'not connected'}</dd>
              </div>
              <div className="rounded-xl border border-[var(--aethel-border-secondary)] p-3">
                <dt className="text-xs text-[var(--aethel-text-tertiary)]">Currency</dt>
                <dd className="mt-1 font-semibold">{status?.defaultCurrency?.toUpperCase() || 'USD'}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="rounded-3xl border border-[var(--aethel-border-primary)] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">What happens next</h2>
              <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Creator monetization stays evidence-first: no paid asset goes live without onboarding, ledger readiness, and reviewable payout state.</p>
            </div>
            <a href="/marketplace" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--aethel-primary-light)] hover:underline">
              Back to marketplace
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
