'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, ExternalLink, FileText, RefreshCcw } from 'lucide-react'
import { AethelAPIClient, APIError, type BillingReadiness } from '@/lib/api'

interface Invoice {
  id: string
  number: string | null
  status: string
  amount: number
  currency: string
  created: number
  pdfUrl: string | null
  hostedUrl: string | null
}

interface Subscription {
  id: string
  status: string
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  cancelAt: number | null
}

interface PaymentMethod {
  id: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  isDefault: boolean
}

interface BillingData {
  hasSubscription: boolean
  plan: string
  subscription: Subscription | null
  trial: {
    endsAt: string
    isActive: boolean
    daysRemaining: number
  } | null
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  canAccessPortal: boolean
}

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  open: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  draft: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)] text-[var(--aethel-text-secondary)] border border-[var(--aethel-border-secondary)]',
  uncollectible: 'bg-[var(--aethel-error)]/15 text-red-300 border border-red-500/30',
  void: 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_40%,transparent)] text-[var(--aethel-text-secondary)] border border-[var(--aethel-border-secondary)]',
  active: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  canceled: 'bg-[var(--aethel-error)]/15 text-red-300 border border-red-500/30',
  incomplete: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
}

const statusLabels: Record<string, string> = {
  paid: 'Paid',
  open: 'Open',
  draft: 'Draft',
  uncollectible: 'Uncollectible',
  void: 'Void',
  active: 'Active',
  trialing: 'Trialing',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100)
}

function formatUnixDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function formatIsoDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function getErrorMessage(error: unknown) {
  if (error instanceof APIError) {
    const code =
      typeof error.data === 'object' && error.data && 'error' in error.data
        ? String((error.data as { error?: unknown }).error ?? '')
        : ''
    if (code === 'PAYMENT_GATEWAY_RUNTIME_UNAVAILABLE') {
      return 'Billing runtime is still partial. Configure checkout, portal, and webhook before treating billing as live.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Failed to load billing data.'
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}>
      {statusLabels[status] || status}
    </span>
  )
}

export default function InvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [portalData, readinessData] = await Promise.all([
        fetch('/api/billing/portal', { cache: 'no-store' }).then(async (res) => {
          const payload = await res.json().catch(() => null)
          if (!res.ok) {
            const message =
              (payload && typeof payload === 'object' && ('message' in payload || 'error' in payload)
                ? String((payload as { message?: unknown; error?: unknown }).message || (payload as { error?: unknown }).error)
                : null) || `HTTP ${res.status}`
            throw new Error(message)
          }
          return payload as BillingData
        }),
        AethelAPIClient.getBillingReadiness(),
      ])

      setBillingData(portalData)
      setReadiness(readinessData)
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openPortal = useCallback(async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const result = await AethelAPIClient.openBillingPortal()
      if (result.url && typeof window !== 'undefined') {
        window.location.href = result.url
        return
      }
      throw new Error('Billing portal URL was not returned.')
    } catch (nextError) {
      setError(getErrorMessage(nextError))
    } finally {
      setPortalLoading(false)
    }
  }, [])

  const missingEnv = readiness?.stripe?.missingEnv ?? []
  const subscriptionPeriodLabel = useMemo(() => {
    if (!billingData?.subscription) return null
    if (billingData.subscription.cancelAtPeriodEnd) {
      return `Cancels on ${formatUnixDate(billingData.subscription.currentPeriodEnd)}`
    }
    return `Next billing date: ${formatUnixDate(billingData.subscription.currentPeriodEnd)}`
  }, [billingData?.subscription])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] flex items-center justify-center">
        <div className="text-sm text-[var(--aethel-text-secondary)]">Loading billing data...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Invoices and Billing</h1>
            <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">
              Billing surfaces now reflect live runtime readiness. Do not assume checkout or portal are active unless readiness is green.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => router.push('/billing')}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to billing
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-[var(--aethel-error)]/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
              <div>
                <p className="text-sm font-medium text-red-200">Billing data could not be loaded</p>
                <p className="mt-1 text-sm text-red-100/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {readiness && (
          <div className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={readiness.checkoutReady ? 'active' : 'incomplete'} />
              <span className="text-sm text-[var(--aethel-text-secondary)]">
                checkout {readiness.checkoutReady ? 'ready' : 'partial'}
              </span>
              <StatusPill status={readiness.portalReady ? 'active' : 'incomplete'} />
              <span className="text-sm text-[var(--aethel-text-secondary)]">
                portal {readiness.portalReady ? 'ready' : 'partial'}
              </span>
              <StatusPill status={readiness.webhookReady ? 'active' : 'incomplete'} />
              <span className="text-sm text-[var(--aethel-text-secondary)]">
                webhook {readiness.webhookReady ? 'ready' : 'partial'}
              </span>
            </div>
            {readiness.provider ? (
              <p className="mt-3 text-xs text-[var(--aethel-text-secondary)]">
                provider={readiness.provider.label}
                {readiness.provider.webhookPath ? ` | webhook ${readiness.provider.webhookPath}` : ''}
                {readiness.stripe
                  ? ` | publishable=${String(readiness.stripe.publishableKeyConfigured)} | prices=${readiness.stripe.configuredPriceCount}/${readiness.stripe.requiredPriceCount}`
                  : ''}
              </p>
            ) : null}
            {missingEnv.length > 0 && (
              <p className="mt-3 text-xs text-[var(--aethel-text-secondary)]">
                Missing Stripe env: {missingEnv.join(', ')}.
              </p>
            )}
          </div>
        )}

        {billingData?.subscription && (
          <section className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm text-[var(--aethel-text-secondary)]">Current plan</p>
                <h2 className="mt-1 text-xl font-semibold">{billingData.plan}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill status={billingData.subscription.status} />
                  {subscriptionPeriodLabel && <span className="text-sm text-[var(--aethel-text-secondary)]">{subscriptionPeriodLabel}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={portalLoading || readiness?.portalReady === false}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalLoading ? 'Opening...' : readiness?.portalReady === false ? 'Portal unavailable' : 'Manage subscription'}
              </button>
            </div>
          </section>
        )}

        {billingData?.trial?.isActive && (
          <section className="mb-6 rounded-xl border border-sky-500/30 bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-4 text-sm text-sky-100">
            Trial active. {billingData.trial.daysRemaining} days remaining. Trial ends on {formatIsoDate(billingData.trial.endsAt)}.
          </section>
        )}

        {billingData?.paymentMethods && billingData.paymentMethods.length > 0 && (
          <section className="mb-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Payment methods</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Stripe-backed payment methods attached to this customer.</p>
              </div>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={portalLoading || readiness?.portalReady === false}
                className="text-sm text-blue-300 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Update in portal
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {billingData.paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--aethel-text-primary)]">
                      {(pm.brand || 'card').toUpperCase()} ending in {pm.last4 || '----'}
                    </p>
                    <p className="text-xs text-[var(--aethel-text-secondary)]">
                      Expires {String(pm.expMonth || '').padStart(2, '0')}/{pm.expYear || '----'}
                    </p>
                  </div>
                  {pm.isDefault && <StatusPill status="active" />}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)]">
          <div className="border-b border-[var(--aethel-border-primary)] px-6 py-4">
            <h2 className="text-lg font-semibold">Invoice history</h2>
          </div>
          {billingData?.invoices && billingData.invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-[var(--aethel-surface-primary)]/60">
                  <tr className="text-left text-xs uppercase tracking-wide text-[var(--aethel-text-secondary)]">
                    <th className="px-6 py-3">Invoice</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {billingData.invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-[var(--aethel-surface-primary)]/60">
                      <td className="px-6 py-4 text-sm text-[var(--aethel-text-primary)]">{invoice.number || invoice.id.slice(-8)}</td>
                      <td className="px-6 py-4 text-sm text-[var(--aethel-text-secondary)]">{formatUnixDate(invoice.created)}</td>
                      <td className="px-6 py-4 text-sm text-[var(--aethel-text-primary)]">{formatCurrency(invoice.amount, invoice.currency)}</td>
                      <td className="px-6 py-4"><StatusPill status={invoice.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3 text-sm">
                          {invoice.hostedUrl && (
                            <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200">
                              View
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {invoice.pdfUrl && (
                            <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
                              PDF
                              <FileText className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-10 w-10 text-[var(--aethel-text-tertiary)]" />
              <h3 className="mt-4 text-sm font-medium text-[var(--aethel-text-primary)]">No invoices yet</h3>
              <p className="mt-2 text-sm text-[var(--aethel-text-secondary)]">Invoices will appear here after the first completed billing cycle.</p>
            </div>
          )}
        </section>

        <div className="mt-6 text-center">
          <Link href="/billing" className="text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]">
            Back to billing workspace
          </Link>
        </div>
      </div>
    </main>
  )
}
