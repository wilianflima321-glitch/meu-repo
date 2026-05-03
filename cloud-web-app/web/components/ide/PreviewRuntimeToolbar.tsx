'use client'

import type { ReactNode } from 'react'

import type {
  PreviewDeployReadiness,
  PreviewDeployStatus,
  PreviewReviewTarget,
} from '@/components/preview/previewDeployTrust'
import type { PreviewRuntimeHealthStatus, PreviewRuntimeReadinessResponse } from '@/lib/preview/runtime-manager'

import { ptBR } from '@/lib/locales/pt-BR'

type Props = {
  previewRuntimeUrl: string | null
  runtimeHealthStatus: PreviewRuntimeHealthStatus
  runtimeHealthLatencyMs?: number
  runtimeHealthCheckedAt: Date | null
  runtimeHealthHint: string
  runtimeReadiness: PreviewRuntimeReadinessResponse | null
  runtimeStrategyLabel: string
  runtimeStrategyHint: string
  runtimePrimaryAction: 'provision' | 'discover' | 'inline'
  runtimePrimaryActionLabel: string
  runtimeActionBlockedReason: string | null
  runtimeAutomationPlacement: string | null
  runtimeAutomationRequiresConfirmation: boolean
  showRuntimeSettings: boolean
  previewRuntimeInput: string
  onToggleSettings: () => void
  onRuntimeInputChange: (value: string) => void
  onApplyRuntime: () => void
  onUseFallback: () => void
  onRevalidate: () => void
  onOpenRuntime: () => void
  onDiscoverRuntime: () => void
  onProvisionRuntime: () => void
  onSyncRuntime: () => void
  onRunRecommendedAction: () => void
  isDiscoveringRuntime: boolean
  isProvisioningRuntime: boolean
  isSyncingRuntime: boolean
  canSyncRuntime: boolean
  syncRuntimeBlockedReason?: string | null
  runtimeDiscoveryMessage?: string | null
  runtimeDiscoveryTone?: 'info' | 'success' | 'warning'
  deployReadiness: PreviewDeployReadiness | null
  deployStatus: PreviewDeployStatus | null
  deployStatusHref: string | null
  deployUrl: string | null
  deployFeedback: string | null
  reviewTarget: PreviewReviewTarget | null
  isDeploySubmitting: boolean
  isDeployRefreshing: boolean
  onStartDeploy: () => void
  onRefreshDeploy: () => void
  onCopyShareLink: () => void
  onOpenDeployStatus: () => void
  onOpenDeploySite: () => void
}

function CompactMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string | null
}) {
  return (
    <div className="min-w-[148px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_65%,transparent)] px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-[var(--aethel-text-primary)]">{value}</div>
      {hint ? <div className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">{hint}</div> : null}
    </div>
  )
}

function ToolbarChip({
  children,
  toneClass,
}: {
  children: ReactNode
  toneClass: string
}) {
  return (
    <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${toneClass}`}>
      {children}
    </span>
  )
}

export default function PreviewRuntimeToolbar({
  previewRuntimeUrl,
  runtimeHealthStatus,
  runtimeHealthLatencyMs,
  runtimeHealthCheckedAt,
  runtimeHealthHint,
  runtimeReadiness,
  runtimeStrategyLabel,
  runtimeStrategyHint,
  runtimePrimaryAction,
  runtimePrimaryActionLabel,
  runtimeActionBlockedReason,
  runtimeAutomationPlacement,
  runtimeAutomationRequiresConfirmation,
  showRuntimeSettings,
  previewRuntimeInput,
  onToggleSettings,
  onRuntimeInputChange,
  onApplyRuntime,
  onUseFallback,
  onRevalidate,
  onOpenRuntime,
  onDiscoverRuntime,
  onProvisionRuntime,
  onSyncRuntime,
  onRunRecommendedAction,
  isDiscoveringRuntime,
  isProvisioningRuntime,
  isSyncingRuntime,
  canSyncRuntime,
  syncRuntimeBlockedReason = null,
  runtimeDiscoveryMessage,
  runtimeDiscoveryTone = 'info',
  deployReadiness,
  deployStatus,
  deployStatusHref,
  deployUrl,
  deployFeedback,
  reviewTarget,
  isDeploySubmitting,
  isDeployRefreshing,
  onStartDeploy,
  onRefreshDeploy,
  onCopyShareLink,
  onOpenDeployStatus,
  onOpenDeploySite,
}: Props) {
  const t = ptBR.ide.preview
  const tc = ptBR.common

  const reachableCandidates = runtimeReadiness?.metadata?.localDiscovery?.reachableCandidates ?? 0
  const totalCandidates = runtimeReadiness?.metadata?.localDiscovery?.totalCandidates ?? 0
  const configuredEndpoints = runtimeReadiness?.metadata?.configuredEndpoints ?? []
  const managedProvider = runtimeReadiness?.managedProvider ?? null
  const managedProviderLabel = runtimeReadiness?.managedProviderLabel ?? managedProvider
  const managedProviderMode = runtimeReadiness?.managedProviderMode ?? 'unknown'
  const managedSetupEnv = runtimeReadiness?.managedSetupEnv ?? []
  const routeProvisionSupported = runtimeReadiness?.routeProvisionSupported !== false
  const recommendedCommands = runtimeReadiness?.recommendedCommands ?? []

  const discoveryToneClass =
    runtimeDiscoveryTone === 'success'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      : runtimeDiscoveryTone === 'warning'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
        : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'

  const runtimeStateClass =
    runtimeHealthStatus === 'reachable'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      : runtimeHealthStatus === 'checking'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
        : runtimeHealthStatus === 'idle'
          ? 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-tertiary)]'
          : 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'

  const runtimeStateLabel =
    runtimeHealthStatus === 'checking'
      ? tc.status.checking
      : runtimeHealthStatus === 'reachable'
        ? `${tc.status.reachable}${typeof runtimeHealthLatencyMs === 'number' ? ` / ${runtimeHealthLatencyMs}ms` : ''}`
        : runtimeHealthStatus === 'idle'
          ? tc.status.idle
          : tc.status.unavailable

  const readinessLabel =
    runtimeReadiness?.status === 'ready'
      ? tc.status.ready
      : runtimeReadiness?.status === 'partial'
        ? tc.status.partial
        : runtimeReadiness?.blockers?.length
          ? tc.status.blocked
          : tc.status.checking

  const readinessToneClass =
    runtimeReadiness?.status === 'ready'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      : runtimeReadiness?.status === 'partial'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
        : 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'

  const nextStepText =
    runtimePrimaryAction === 'provision'
      ? 'Spin up a managed sandbox to lower preview friction.'
      : runtimePrimaryAction === 'discover'
        ? 'Connect a reachable local server from your machine.'
        : 'Keep shipping with inline preview while external runtime parity stays offline.'

  const primaryActionBusy =
    runtimePrimaryAction === 'provision'
      ? isProvisioningRuntime
      : runtimePrimaryAction === 'discover'
        ? isDiscoveringRuntime
        : false
  const primaryActionDisabled =
    primaryActionBusy ||
    ((runtimePrimaryAction === 'provision' || runtimePrimaryAction === 'discover') &&
      Boolean(runtimeActionBlockedReason))

  const primaryActionBusyLabel =
    runtimePrimaryAction === 'provision'
      ? 'Provisioning...'
      : runtimePrimaryAction === 'discover'
        ? 'Detecting...'
        : runtimePrimaryActionLabel
  const runtimeLaneHint = runtimeActionBlockedReason
    ? runtimeActionBlockedReason
    : runtimeAutomationRequiresConfirmation
      ? 'Automatic runtime actions stay held until you confirm them on this device profile.'
      : runtimeAutomationPlacement
        ? `Runtime automation prefers ${runtimeAutomationPlacement.replace(/-/g, ' ')}.`
        : null

  const firstBlocker = runtimeReadiness?.blockers?.[0] ?? null
  const runtimeModeLabel = previewRuntimeUrl ? t.externalServer : t.inlineFallback
  const checkedAtLabel = runtimeHealthCheckedAt
    ? runtimeHealthCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const deployStatusLabel = getDeployStatusLabel(deployStatus)
  const deployStateClass =
    deployStatus === 'ready'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      : deployStatus === 'building' || deployStatus === 'preparing' || deployStatus === 'uploading'
        ? 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
        : deployStatus === 'error'
          ? 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
          : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'
  const deployHint =
    deployReadiness?.canDeploy === false && deployReadiness.message
      ? deployReadiness.message
      : deployReadiness?.canDeploy === false && deployReadiness.missing?.length
      ? `Configure ${deployReadiness.missing.join(', ')} to publish.`
      : deployStatus === 'ready'
        ? 'Deploy publico pronto para compartilhar.'
        : deployStatusHref
          ? 'Status do deploy acompanhado na mesma lane.'
          : 'Publique quando precisar validar share e parity fora do runtime local.'
  const qaBlockerSummary =
    deployReadiness?.qaGate && !deployReadiness.qaGate.ok
      ? deployReadiness.qaGate.blockers.slice(0, 2).join(', ')
      : null
  const reviewTargetToneClass = getReviewTargetToneClass(reviewTarget?.kind ?? null)
  const reviewTargetBadge = getReviewTargetBadge(reviewTarget?.kind ?? null)
  const reviewActionLabel = reviewTarget?.actionLabel ?? 'Copy review link'

  const quickFacts = [
    { label: t.health, value: runtimeStateLabel, hint: runtimeHealthHint },
    { label: t.strategy, value: runtimeStrategyLabel, hint: runtimeStrategyHint },
    { label: t.nextAction, value: runtimePrimaryActionLabel, hint: nextStepText },
  ]

  const techFacts = [
    managedProvider ? `provider:${managedProviderLabel}` : null,
    managedProvider ? `mode:${managedProviderMode}` : null,
    runtimeAutomationPlacement ? `lane:${runtimeAutomationPlacement}` : null,
    `endpoints:${configuredEndpoints.length}`,
    `local:${reachableCandidates}/${totalCandidates}`,
    runtimeReadiness?.preferredRuntimeUrl ? `preferred:${runtimeReadiness.preferredRuntimeUrl}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,18,25,0.97),rgba(11,13,18,0.985))] px-3 py-2 text-xs shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[280px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">{t.runtime}</span>
            <ToolbarChip
              toneClass={previewRuntimeUrl
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'}
            >
              {runtimeModeLabel}
            </ToolbarChip>
            <ToolbarChip toneClass={readinessToneClass}>Readiness: {readinessLabel}</ToolbarChip>
            <ToolbarChip toneClass={runtimeStateClass}>Health: {runtimeStateLabel}</ToolbarChip>
            {runtimeLaneHint ? (
              <ToolbarChip
                toneClass={
                  runtimeActionBlockedReason
                    ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
                    : 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                }
              >
                {runtimeActionBlockedReason ? 'Automation held' : 'Lane policy'}
              </ToolbarChip>
            ) : null}
            {checkedAtLabel ? (
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Checked {checkedAtLabel}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="min-w-[220px] flex-1">
              <div className="text-[12px] font-semibold text-[var(--aethel-text-primary)]">
                {previewRuntimeUrl
                  ? 'Runtime lane active.'
                  : 'Inline lane active.'}
              </div>
              <div className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">
                {previewRuntimeUrl
                  ? 'Valide health, mantenha o sync e promova a mesma lane para review sem perder contexto.'
                  : 'Use a acao recomendada para descobrir ou provisionar parity real quando o artefato pedir rede, device ou deploy.'}
              </div>
              {runtimeLaneHint ? (
                <div className="mt-1 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">
                  {runtimeLaneHint}
                </div>
              ) : null}
            </div>
            {firstBlocker ? (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-2.5 py-1.5 text-[10px] text-[var(--aethel-warning-light)]">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-warning)]">Primary blocker</div>
                <div className="mt-1">{firstBlocker}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_58%,transparent)] px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
                    Deploy trust
                  </span>
                  <ToolbarChip toneClass={deployStateClass}>
                    {deployStatusLabel}
                  </ToolbarChip>
                  <ToolbarChip
                    toneClass={
                      deployReadiness?.canDeploy === false
                        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
                        : 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
                    }
                  >
                    {deployReadiness?.canDeploy === false ? 'Deploy blocked' : 'Deploy ready'}
                  </ToolbarChip>
                  {qaBlockerSummary ? (
                    <ToolbarChip toneClass="border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]">
                      QA: {qaBlockerSummary}
                    </ToolbarChip>
                  ) : null}
                  {reviewTarget && reviewTargetBadge ? (
                    <ToolbarChip toneClass={reviewTargetToneClass}>
                      {reviewTargetBadge}: {reviewTarget.label}
                    </ToolbarChip>
                  ) : null}
                </div>
                <div className="mt-1.5 text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">
                  {reviewTarget?.summary ?? deployHint}
                </div>
                {deployFeedback ? (
                  <div className="mt-1.5 text-[10px] text-[var(--aethel-text-secondary)]">
                    {deployFeedback}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStartDeploy}
                  disabled={isDeploySubmitting || deployReadiness?.canDeploy === false}
                  aria-label="Create deploy from preview lane"
                  className="min-h-[34px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-success-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDeploySubmitting ? 'Publishing...' : 'Deploy now'}
                </button>
                {deployStatusHref ? (
                  <button
                    type="button"
                    onClick={onOpenDeployStatus}
                    aria-label="Open deploy status page"
                    className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                  >
                    Status
                  </button>
                ) : null}
                {deployUrl ? (
                  <button
                    type="button"
                    onClick={onOpenDeploySite}
                    aria-label="Open deployed site"
                    className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
                  >
                    Open deploy
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onCopyShareLink}
                  disabled={!reviewTarget?.href}
                  aria-label={reviewActionLabel}
                  className="min-h-[34px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {reviewActionLabel}
                </button>
                {deployStatusHref ? (
                  <button
                    type="button"
                    onClick={onRefreshDeploy}
                    disabled={isDeployRefreshing}
                    aria-label="Refresh deploy status"
                    className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isDeployRefreshing ? 'Refreshing...' : 'Refresh deploy'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {showRuntimeSettings ? (
            <div className="flex flex-wrap gap-2">
              {quickFacts.map((item) => (
                <CompactMetric key={item.label} label={item.label} value={item.value} hint={item.hint} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex max-w-[420px] flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSettings}
            aria-label={showRuntimeSettings ? 'Hide preview runtime settings' : 'Open preview runtime settings'}
            aria-pressed={showRuntimeSettings}
            className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            {showRuntimeSettings ? 'Hide runtime' : 'Configure runtime'}
          </button>
          <button
            type="button"
            onClick={onRunRecommendedAction}
            disabled={primaryActionDisabled}
            aria-label={`Run recommended runtime action: ${runtimePrimaryActionLabel}`}
            title={runtimeActionBlockedReason ?? undefined}
            className="min-h-[34px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {primaryActionBusy ? primaryActionBusyLabel : runtimePrimaryActionLabel}
          </button>
          {previewRuntimeUrl ? (
            <button
              type="button"
              onClick={onOpenRuntime}
              aria-label={t.openNewTab}
              className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Open preview
            </button>
          ) : null}
        </div>
      </div>

      {showRuntimeSettings ? (
        <div className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[240px] flex-1">
              <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Runtime endpoint</div>
              <input
                type="url"
                value={previewRuntimeInput}
                onChange={(event) => onRuntimeInputChange(event.target.value)}
                placeholder="https://localhost:5173"
                aria-label={t.manualUrl}
                className="min-h-[38px] w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onApplyRuntime}
                aria-label="Apply manual runtime URL"
                className="min-h-[38px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                {tc.actions.apply}
              </button>
              <button
                type="button"
                onClick={onDiscoverRuntime}
                disabled={isDiscoveringRuntime || Boolean(runtimeActionBlockedReason)}
                aria-label={t.autoDetect}
                title={runtimeActionBlockedReason ?? undefined}
                className="min-h-[38px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDiscoveringRuntime ? 'Detecting...' : t.autoDetect}
              </button>
              <button
                type="button"
                onClick={onProvisionRuntime}
                disabled={isProvisioningRuntime || !routeProvisionSupported || Boolean(runtimeActionBlockedReason)}
                aria-label={t.provisionManaged}
                title={runtimeActionBlockedReason ?? undefined}
                className="min-h-[38px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-success-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isProvisioningRuntime ? 'Provisioning...' : routeProvisionSupported ? t.provisionManaged : 'Provision unavailable'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {canSyncRuntime ? (
              <button
                type="button"
                onClick={onSyncRuntime}
                disabled={isSyncingRuntime || !canSyncRuntime}
                aria-label="Sync current files into the preview runtime"
                title={syncRuntimeBlockedReason ?? undefined}
                className="min-h-[34px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSyncingRuntime ? 'Syncing...' : tc.actions.sync}
              </button>
            ) : null}
            {previewRuntimeUrl ? (
              <button
                type="button"
                onClick={onRevalidate}
                aria-label="Revalidate preview runtime"
                className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                {tc.actions.revalidate}
              </button>
            ) : null}
            {previewRuntimeUrl ? (
              <button
                type="button"
                onClick={onOpenRuntime}
                aria-label="Open runtime in a new tab"
                className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                Open runtime
              </button>
            ) : null}
            {previewRuntimeUrl ? (
              <button
                type="button"
                onClick={onUseFallback}
                aria-label="Switch back to inline preview fallback"
                className="min-h-[34px] rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] font-medium text-[var(--aethel-error-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
              >
                Use inline fallback
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {runtimeDiscoveryMessage ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${discoveryToneClass}`}>{runtimeDiscoveryMessage}</div>
      ) : null}

      <details className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
          {t.technicalDetails}
        </summary>
        <div className="border-t border-[var(--aethel-border-primary)] px-3 py-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
            {techFacts.map((fact) => (
              <span
                key={fact}
                className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1"
              >
                {fact}
              </span>
            ))}
          </div>

          {runtimeReadiness?.instructions && runtimeReadiness.instructions.length > 0 ? (
            <div className="mt-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Runtime instructions</div>
              <div className="flex flex-wrap gap-2">
                {runtimeReadiness.instructions.map((instruction) => (
                  <span
                    key={instruction}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]"
                  >
                    {instruction}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {managedSetupEnv.length > 0 ? (
            <div className="mt-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Env needed</div>
              <div className="flex flex-wrap gap-2">
                {managedSetupEnv.map((envKey) => (
                  <span
                    key={envKey}
                    className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-tertiary)]"
                  >
                    env:{envKey}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {recommendedCommands.length > 0 ? (
            <div className="mt-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Suggested commands</div>
              <div className="flex flex-wrap gap-2">
                {recommendedCommands.map((command) => (
                  <code
                    key={command}
                    className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-info-light)]"
                  >
                    {command}
                  </code>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </details>

      {previewRuntimeUrl && runtimeHealthStatus !== 'reachable' ? (
        <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-warning)]">
          {runtimeHealthHint}
        </div>
      ) : null}
    </div>
  )
}

function getReviewTargetBadge(kind: PreviewReviewTarget['kind'] | null) {
  switch (kind) {
    case 'review_ready_public':
      return 'Review ready';
    case 'review_ready_runtime':
      return 'Runtime review';
    case 'ephemeral_runtime':
      return 'Ephemeral preview';
    case 'blocked_stale':
      return 'Review stale';
    case 'blocked_degraded':
      return 'Review blocked';
    default:
      return null;
  }
}

function getReviewTargetToneClass(kind: PreviewReviewTarget['kind'] | null) {
  switch (kind) {
    case 'review_ready_public':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]';
    case 'review_ready_runtime':
      return 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]';
    case 'ephemeral_runtime':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]';
    case 'blocked_stale':
    case 'blocked_degraded':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]';
    default:
      return 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]';
  }
}

function getDeployStatusLabel(status: PreviewDeployStatus | null) {
  switch (status) {
    case 'preparing':
      return 'Queued';
    case 'uploading':
      return 'Uploading';
    case 'building':
      return 'Building';
    case 'ready':
      return 'Ready';
    case 'error':
      return 'Error';
    case 'canceled':
      return 'Canceled';
    case 'idle':
      return 'Idle';
    default:
      return 'Not started';
  }
}
