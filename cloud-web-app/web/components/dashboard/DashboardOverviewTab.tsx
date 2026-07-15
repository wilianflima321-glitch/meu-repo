'use client'

import dynamic from 'next/dynamic'
import { CheckCircle2, Coins, ShieldCheck } from 'lucide-react'
import { APIError } from '@/lib/api'
import type { ConnectivityResponse, WalletSummary } from '@/lib/api'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

import type { Project } from './aethel-dashboard-model'
import { DashboardWorkspaceLaunch } from './DashboardWorkspaceLaunch'

type Point3 = {
  x: number
  y: number
  z: number
}

const CanonicalPreviewSurface = dynamic(() => import('@/components/preview/CanonicalPreviewSurface'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[260px] flex-col justify-between rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)] px-6 py-5 text-sm text-[var(--aethel-text-secondary)]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Preview</p>
        <p className="mt-2 text-base font-semibold text-[var(--aethel-text-primary)]">Warming up the artifact preview</p>
        <p className="mt-2 max-w-lg text-xs leading-5 text-[var(--aethel-text-secondary)]">
          The Studio shell stays interactive while the heavier preview chunk loads.
        </p>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-3" aria-hidden="true">
        <div className="h-16 rounded-2xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)]" />
        <div className="h-16 rounded-2xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)]" />
        <div className="h-16 rounded-2xl bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)]" />
      </div>
    </div>
  ),
})

export type DashboardOverviewTabProps = {
  aiActivity: string
  projects: Project[]
  livePreviewSuggestions: string[]
  authReady: boolean
  hasToken: boolean
  backendOnline: boolean
  aiProviderConfigured: boolean
  currentPlanName?: string | null
  onOpenProjects: () => void
  onOpenAiChat: (missionDraft?: string) => void
  onOpenIde: () => void
  onOpenBilling: () => void
  onRefreshWallet: () => void
  lastWalletUpdate: string | null
  walletLoading: boolean
  walletError: Error | null | undefined
  walletData: WalletSummary | undefined
  walletTransactions: WalletSummary['transactions']
  formatCurrencyLabel: (currency?: string | null) => string
  connectivityData: ConnectivityResponse | undefined
  connectivityLoading: boolean
  connectivityError: Error | null | undefined
  connectivityServices: ConnectivityResponse['services'] | undefined
  formatConnectivityStatus: (status?: string | null) => string
  miniPreviewExpanded: boolean
  onToggleMiniPreviewExpanded: () => void
  onMagicWandSelect: (position: Point3) => void
  onSendSuggestion: (suggestion: string) => Promise<void>
  isGenerating: boolean
}

type Tone = 'positive' | 'warning' | 'danger' | 'neutral'

const toneClasses: Record<Tone, string> = {
  positive:
    'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]',
  warning:
    'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]',
  danger:
    'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error)]',
  neutral:
    'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]',
}

export function DashboardOverviewTab({
  aiActivity,
  projects,
  livePreviewSuggestions,
  authReady,
  hasToken,
  backendOnline,
  aiProviderConfigured,
  currentPlanName,
  onOpenProjects,
  onOpenAiChat,
  onOpenIde,
  onOpenBilling,
  onRefreshWallet,
  lastWalletUpdate,
  walletLoading,
  walletError,
  walletData,
  walletTransactions,
  formatCurrencyLabel,
  connectivityData,
  connectivityLoading,
  connectivityError,
  connectivityServices = [],
  formatConnectivityStatus,
  miniPreviewExpanded,
  onToggleMiniPreviewExpanded,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: DashboardOverviewTabProps) {
  const activeProjects = projects.filter((project) => project.status === 'active')
  const primaryProject = activeProjects[0] ?? projects[0]
  const pendingApprovals = livePreviewSuggestions.length

  const walletSummary = !authReady
    ? 'Checking session'
    : !hasToken
      ? 'Sign in to unlock billing and wallet'
      : walletLoading
        ? 'Budget sync pending'
        : walletError
          ? walletError instanceof APIError && walletError.status === 401
            ? 'Session expired'
            : 'Wallet unavailable'
          : walletData
            ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}`
            : 'No wallet data'

  const walletFootnote = walletData
    ? `${walletTransactions.length} transactions - ${lastWalletUpdate ? `Updated ${new Date(lastWalletUpdate).toLocaleTimeString()}` : 'Live state'}`
    : 'Billing and budget stay visible without leaving Studio Home.'

  const connectivitySummary = connectivityLoading
    ? 'Monitoring services'
    : connectivityError
      ? 'Connectivity unavailable'
      : connectivityData
        ? formatConnectivityStatus(connectivityData.overall_status)
        : 'Not configured'

  const topConnectivityServices = connectivityServices.slice(0, 3)

  const panelClass =
    'overflow-hidden rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] p-5 shadow-[var(--aethel-shadow-xl)] sm:p-6'
  const ghostButtonClass = `inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-1 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className="space-y-6">
      <DashboardWorkspaceLaunch
        aiActivity={aiActivity}
        projects={projects}
        primaryProject={primaryProject}
        pendingApprovals={pendingApprovals}
        backendOnline={backendOnline}
        aiProviderConfigured={aiProviderConfigured}
        currentPlanName={currentPlanName}
        onOpenProjects={onOpenProjects}
        onOpenIde={onOpenIde}
        onOpenAiChat={onOpenAiChat}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className={panelClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Preview</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Preview</h3>
            </div>
            <button
              type="button"
              onClick={onToggleMiniPreviewExpanded}
              aria-label={miniPreviewExpanded ? 'Collapse live preview' : 'Expand live preview'}
              className={ghostButtonClass}
            >
              {miniPreviewExpanded ? 'Compact preview' : 'Expand preview'}
            </button>
          </div>
          <CanonicalPreviewSurface
            variant="live"
            onMagicWandSelect={onMagicWandSelect}
            suggestions={livePreviewSuggestions}
            onSendSuggestion={onSendSuggestion}
            isGenerating={isGenerating}
          />
        </div>

        <div className="space-y-6">
          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Budget</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Budget</h3>
              </div>
              <Coins className="h-4.5 w-4.5 text-[var(--aethel-text-quaternary)]" />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4">
              <div className="text-2xl font-semibold text-[var(--aethel-text-primary)]">{walletSummary}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{walletFootnote}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {authReady && hasToken ? (
                <button type="button" onClick={onRefreshWallet} className={ghostButtonClass}>
                  Refresh wallet
                </button>
              ) : null}
              <button type="button" onClick={onOpenBilling} className={ghostButtonClass}>
                Open billing
              </button>
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Trust</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Service status</h3>
              </div>
              <ShieldCheck className="h-4.5 w-4.5 text-[var(--aethel-text-quaternary)]" />
            </div>
            <div className="mt-4 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">Overall status</span>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${toneClasses[connectivityData?.overall_status === 'healthy' ? 'positive' : connectivityData?.overall_status === 'degraded' ? 'warning' : connectivityData?.overall_status ? 'danger' : 'neutral']}`}>
                  {connectivitySummary}
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {topConnectivityServices.length > 0 ? (
                  topConnectivityServices.map((service) => (
                    <div key={service.name} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-3 py-2.5">
                      <span className="text-sm text-[var(--aethel-text-secondary)] capitalize">{service.name.replace(/_/g, ' ')}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[service.status === 'healthy' ? 'positive' : service.status === 'degraded' ? 'warning' : 'danger']}`}>
                        {formatConnectivityStatus(service.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-4 text-sm text-[var(--aethel-text-secondary)]">
                    {connectivityLoading
                      ? 'Loading service health...'
                      : connectivityError
                        ? 'Connectivity status is temporarily unavailable.'
                        : 'Connect services to unlock operator and deploy flows.'}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[var(--aethel-success-light)]" />
                Summary first. Deep diagnostics stay in Studio and logs.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
