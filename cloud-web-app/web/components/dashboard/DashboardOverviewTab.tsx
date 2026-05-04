'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Coins, Layers3, ShieldCheck, Sparkles } from 'lucide-react'
import { APIError } from '@/lib/api'
import type { ConnectivityResponse, WalletSummary } from '@/lib/api'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import { DeviceRuntimeGuardCard } from '@/components/device/DeviceRuntimeGuardCard'
import { useRuntimeCapabilityProfile } from '@/hooks/useRuntimeCapabilityProfile'

import type { Project } from './aethel-dashboard-model'
import { DashboardMissionLedgerCard } from './DashboardMissionLedgerCard'
import { DashboardProjectBrainCard } from './DashboardProjectBrainCard'
import { DashboardRepositoryCartographyCard } from './DashboardRepositoryCartographyCard'
import { buildDashboardMissionLedgerSnapshot } from './dashboard-mission-ledger'
import { buildDashboardProjectBrainSnapshot } from './dashboard-project-brain'
import { buildDashboardRepositoryCartographySnapshot } from './dashboard-repository-cartography'
import { readAgenticProductionStateFromSettings } from '@/lib/production/agentic-production-state'
import { readRepositoryContextBudgetExecutionStateFromSettings } from '@/lib/production/repository-context-budget-execution'
import { readRepositoryCartographyManifestFromSettings } from '@/lib/production/repository-cartography'

type Point3 = {
  x: number
  y: number
  z: number
}

const CanonicalPreviewSurface = dynamic(() => import('@/components/preview/CanonicalPreviewSurface'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[260px] items-center justify-center rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] px-6 py-8 text-sm text-[var(--aethel-text-secondary)]">
      Loading studio preview...
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
  onOpenAiChat: () => void
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

function formatProjectType(type?: string) {
  switch (type) {
    case 'web':
      return 'Web'
    case 'code':
      return 'Code'
    case 'unreal':
      return 'Unreal'
    default:
      return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Workspace'
  }
}

function formatProjectStatus(status?: string) {
  switch (status) {
    case 'active':
      return 'Active'
    case 'planning':
      return 'Planning'
    case 'paused':
      return 'Paused'
    case 'completed':
      return 'Completed'
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Idle'
  }
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
  const { profile: deviceProfile, localBridge } = useRuntimeCapabilityProfile()
  const [cartographyScanState, setCartographyScanState] = useState<'idle' | 'scanning' | 'complete' | 'error'>('idle')
  const [cartographyScanNote, setCartographyScanNote] = useState<string | null>(null)
  const activeProjects = projects.filter((project) => project.status === 'active')
  const primaryProject = activeProjects[0] ?? projects[0]
  const productionState = readAgenticProductionStateFromSettings(primaryProject?.settings)
  const repositoryCartographyManifest = readRepositoryCartographyManifestFromSettings(primaryProject?.settings)
  const repositoryContextBudgetExecution = readRepositoryContextBudgetExecutionStateFromSettings(primaryProject?.settings)
  const pendingApprovals = livePreviewSuggestions.length
  const agentCount = aiProviderConfigured ? Math.max(2, Math.min(5, activeProjects.length + 2)) : 0
  const runState: Tone = !backendOnline ? 'danger' : pendingApprovals > 0 ? 'warning' : 'positive'
  const runStateLabel = !backendOnline ? 'Blocked' : pendingApprovals > 0 ? 'Review ready' : 'Running'
  const primaryObjective = primaryProject
    ? `${formatProjectStatus(primaryProject.status)} flow for ${primaryProject.name}`
    : 'Start a mission to create your first workspace and handoff.'

  const missionSignals = [
    {
      label: 'Project',
      value: primaryProject?.name ?? 'No active mission',
      tone: primaryProject ? 'positive' : 'neutral',
    },
    {
      label: 'State',
      value: runStateLabel,
      tone: runState,
    },
    {
      label: 'Agents',
      value: aiProviderConfigured ? `${agentCount} online` : 'Configure AI',
      tone: aiProviderConfigured ? 'neutral' : 'warning',
    },
    {
      label: 'Plan',
      value: currentPlanName || 'Free',
      tone: currentPlanName ? 'neutral' : 'warning',
    },
  ] as const

  const liveStrip = [
    {
      label: 'Active runs',
      value: backendOnline ? `${Math.max(1, activeProjects.length || 1)}` : '0',
      tone: backendOnline ? 'positive' : 'danger',
    },
    {
      label: 'Approvals',
      value: pendingApprovals ? `${pendingApprovals} waiting` : 'Clear',
      tone: pendingApprovals ? 'warning' : 'positive',
    },
    {
      label: 'Evidence',
      value: aiProviderConfigured ? 'Tracked' : 'Pending setup',
      tone: aiProviderConfigured ? 'neutral' : 'warning',
    },
    {
      label: 'Preview',
      value: backendOnline ? 'Live' : 'Offline',
      tone: backendOnline ? 'positive' : 'danger',
    },
  ] as const

  const recentWork = [
    ...projects.slice(0, 3).map((project) => ({
      title: project.name,
      context: `${formatProjectType(project.type)} · ${formatProjectStatus(project.status)}`,
      action: 'Open project',
      onClick: onOpenProjects,
    })),
    ...livePreviewSuggestions.slice(0, 2).map((suggestion) => ({
      title: suggestion,
      context: 'Review suggestion in preview',
      action: 'Review',
      onClick: onOpenIde,
    })),
  ].slice(0, 4)

  const nextActions = [
    {
      title: pendingApprovals > 0 ? 'Review pending proposal' : 'Open AI Console',
      description:
        pendingApprovals > 0
          ? 'Existe mudanca pronta para revisar antes do apply.'
          : 'Continue o plano, a pesquisa ou a execucao com contexto preservado.',
      action: pendingApprovals > 0 ? 'Expand Studio' : 'Open AI Console',
      onClick: pendingApprovals > 0 ? onOpenIde : onOpenAiChat,
      primary: true,
    },
    {
      title: primaryProject ? 'Continue current workspace' : 'Create a workspace',
      description: primaryProject
        ? 'Volte para codigo, viewport e operator sem perder a missao.'
        : 'Comece um fluxo novo e deixe o Studio assumir na hora certa.',
      action: primaryProject ? 'Expand Studio' : 'Create project',
      onClick: primaryProject ? onOpenIde : onOpenProjects,
    },
    {
      title: walletData ? 'Review budget and billing' : 'Set up billing readiness',
      description: walletData
        ? 'Cheque consumo e limites antes de escalar agentes e runtime.'
        : 'Garanta capacidade, governanca e menos friccao comercial.',
      action: 'Open billing',
      onClick: onOpenBilling,
    },
  ]

  const walletSummary = !authReady
    ? 'Checking session'
    : !hasToken
      ? 'Sign in to unlock billing and wallet'
      : walletLoading
        ? 'Loading wallet'
        : walletError
          ? walletError instanceof APIError && walletError.status === 401
            ? 'Session expired'
            : 'Wallet unavailable'
          : walletData
            ? `${walletData.balance.toLocaleString()} ${formatCurrencyLabel(walletData.currency)}`
            : 'No wallet data'

  const walletFootnote = walletData
    ? `${walletTransactions.length} transactions · ${lastWalletUpdate ? `Updated ${new Date(lastWalletUpdate).toLocaleTimeString()}` : 'Live state'}`
    : 'Billing and budget stay visible without leaving Studio Home.'

  const connectivitySummary = connectivityLoading
    ? 'Monitoring services'
    : connectivityError
      ? 'Connectivity unavailable'
      : connectivityData
        ? formatConnectivityStatus(connectivityData.overall_status)
        : 'Not configured'

  const topConnectivityServices = connectivityServices.slice(0, 3)
  const projectBrainSnapshot = buildDashboardProjectBrainSnapshot({
    primaryProject,
    backendOnline,
    aiProviderConfigured,
    pendingApprovals,
    walletReady: Boolean(walletData),
    connectivityStatus: connectivityData?.overall_status,
    localRuntime: {
      connection: localBridge.connection,
      executorLabel: localBridge.executorLabel,
    },
    productionState,
    productionPersisted: Boolean(productionState),
  })
  const missionLedgerSnapshot = buildDashboardMissionLedgerSnapshot({
    primaryProject,
    backendOnline,
    aiProviderConfigured,
    pendingApprovals,
    walletReady: Boolean(walletData),
    connectivityStatus: connectivityData?.overall_status,
    productionState,
    productionPersisted: Boolean(productionState),
  })
  const repositoryCartographySnapshot = buildDashboardRepositoryCartographySnapshot({
    productionState,
    manifest: repositoryCartographyManifest,
    contextBudgetExecution: repositoryContextBudgetExecution,
  })

  const handleScanRepositoryContext = async () => {
    if (!primaryProject || cartographyScanState === 'scanning') return

    setCartographyScanState('scanning')
    setCartographyScanNote('Scanning workspace metadata without loading heavy files into chat context.')

    try {
      const response = await fetch(`/api/projects/${primaryProject.id}/production-state/cartography`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ maxFiles: 5000, maxDepth: 14, maxHashBytes: 8 * 1024 * 1024 }),
      })

      if (!response.ok) {
        setCartographyScanState('error')
        setCartographyScanNote('Workspace scan needs an authenticated editable project workspace.')
        return
      }

      const payload = (await response.json()) as {
        scan?: {
          files?: number
          skipped?: unknown[]
          truncated?: boolean
        }
      }
      const files = payload.scan?.files ?? 0
      const skipped = Array.isArray(payload.scan?.skipped) ? payload.scan.skipped.length : 0
      const truncated = payload.scan?.truncated ? ' Truncated at safety limit.' : ''

      setCartographyScanState('complete')
      setCartographyScanNote(`Mapped ${files} files, skipped ${skipped} unsafe/heavy entries.${truncated}`)
    } catch {
      setCartographyScanState('error')
      setCartographyScanNote('Workspace scan failed safely; no production memory was changed.')
    }
  }

  const panelClass =
    'overflow-hidden rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(8,10,16,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.34)] sm:p-6'
  const ghostButtonClass = `inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] bg-transparent px-3 py-1 text-sm font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.92)_46%,rgba(14,165,233,0.08)_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
        <div className="grid gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-info-light)]">
                Studio Home
              </span>
              {primaryProject ? (
                <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                  {formatProjectType(primaryProject.type)}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--aethel-text-primary)] sm:text-[2.55rem] sm:leading-[1.06]">
              {primaryProject ? `Continue ${primaryProject.name} in Studio` : 'Start in Studio with one clear mission'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--aethel-text-secondary)]">
              {primaryObjective}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--aethel-text-tertiary)]">{aiActivity}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {missionSignals.map((signal) => (
                <span key={signal.label} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses[signal.tone]}`}>
                  {signal.label}: {signal.value}
                </span>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenIde}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,rgba(79,70,229,0.96),rgba(14,165,233,0.9))] px-5 py-3 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] transition hover:brightness-110"
              >
                Expand Studio
                <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={onOpenAiChat} className={ghostButtonClass}>
                Open AI Console
              </button>
              <button type="button" onClick={onOpenProjects} className={ghostButtonClass}>
                New project
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Embedded Studio</p>
                <p className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)]">You are already inside the Studio shell.</p>
              </div>
              <Sparkles className="h-4.5 w-4.5 text-[var(--aethel-info-light)]" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Preview + review</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[pendingApprovals > 0 ? 'warning' : 'positive']}`}>
                    {pendingApprovals > 0 ? `${pendingApprovals} pending` : 'clear'}
                  </span>
                </div>
              </div>
              <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Operator + evidence</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[aiProviderConfigured ? 'neutral' : 'warning']}`}>
                    {aiProviderConfigured ? 'ready' : 'setup'}
                  </span>
                </div>
              </div>
              <div className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--aethel-text-secondary)]">Deploy + trust</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${toneClasses[backendOnline ? 'positive' : 'danger']}`}>
                    {backendOnline ? 'live' : 'blocked'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenIde}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--aethel-info-light)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_36%,transparent)]"
            >
              Expand Studio
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {liveStrip.map((item) => (
          <div
            key={item.label}
            className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.18)]"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{item.label}</div>
            <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[item.tone]}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <DashboardProjectBrainCard
        snapshot={projectBrainSnapshot}
        onOpenAiChat={onOpenAiChat}
        onOpenIde={onOpenIde}
        onOpenProjects={onOpenProjects}
      />

      <DashboardMissionLedgerCard
        snapshot={missionLedgerSnapshot}
        onOpenAiChat={onOpenAiChat}
        onOpenIde={onOpenIde}
        onOpenProjects={onOpenProjects}
      />

      <DashboardRepositoryCartographyCard
        snapshot={repositoryCartographySnapshot}
        onOpenAiChat={onOpenAiChat}
        onOpenIde={onOpenIde}
        onScanContext={primaryProject ? handleScanRepositoryContext : undefined}
        scanNote={cartographyScanNote}
        scanState={cartographyScanState}
      />

      <DeviceRuntimeGuardCard
        profile={deviceProfile}
        localBridge={localBridge}
        onRequestLocalProbe={localBridge.requestCapabilities}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_380px]">
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Recent work</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Resume the strongest thread, not the whole product map.</h3>
            </div>
            <button type="button" onClick={onOpenProjects} className={ghostButtonClass}>
              View all projects
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {recentWork.length > 0 ? (
              recentWork.map((item) => (
                <button
                  key={`${item.title}-${item.context}`}
                  type="button"
                  onClick={item.onClick}
                  className="rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4 text-left transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{item.title}</div>
                    <ArrowRight className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                  </div>
                  <div className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{item.context}</div>
                  <div className="mt-3 text-xs font-medium text-[var(--aethel-info-light)]">{item.action}</div>
                </button>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-4 text-sm text-[var(--aethel-text-secondary)] sm:col-span-2">
                Crie uma missao ou abra o AI Console para iniciar o primeiro workspace.
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Next actions</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Keep the next move obvious.</h3>
            </div>
            <Layers3 className="h-4.5 w-4.5 text-[var(--aethel-text-quaternary)]" />
          </div>
          <div className="mt-5 space-y-3">
            {nextActions.map((action) => (
              <button
                key={action.title}
                type="button"
                onClick={action.onClick}
                className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                  action.primary
                    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_34%,transparent)] bg-[linear-gradient(135deg,rgba(79,70,229,0.18),rgba(14,165,233,0.12))] shadow-[0_18px_40px_rgba(56,189,248,0.12)] hover:brightness-110'
                    : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">{action.title}</span>
                  <span className="text-xs font-medium text-[var(--aethel-info-light)]">{action.action}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
        <div className={panelClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Preview</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Artifact preview stays close, while deeper Studio work expands only when needed.</h3>
            </div>
            <button
              type="button"
              onClick={onToggleMiniPreviewExpanded}
              aria-label={miniPreviewExpanded ? 'Recolher preview ao vivo' : 'Expandir preview ao vivo'}
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
                <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Wallet and billing stay close to the mission.</h3>
              </div>
              <Coins className="h-4.5 w-4.5 text-[var(--aethel-text-quaternary)]" />
            </div>
            <div className="mt-4 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4">
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
                <h3 className="mt-2 text-xl font-semibold text-[var(--aethel-text-primary)]">Health, sync and service readiness.</h3>
              </div>
              <ShieldCheck className="h-4.5 w-4.5 text-[var(--aethel-text-quaternary)]" />
            </div>
            <div className="mt-4 rounded-[22px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 py-4">
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
                Studio Home stays summary-first. Deep diagnostics still belong in Studio and logs.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

