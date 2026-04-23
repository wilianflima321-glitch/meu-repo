'use client'

import type { ReactNode } from 'react'

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
  runtimeDiscoveryMessage?: string | null
  runtimeDiscoveryTone?: 'info' | 'success' | 'warning'
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
    <div className="min-w-[170px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_65%,transparent)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{label}</div>
      <div className="mt-1 text-[12px] font-semibold text-[var(--aethel-text-primary)]">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">{hint}</div> : null}
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
  runtimeDiscoveryMessage,
  runtimeDiscoveryTone = 'info',
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

  const primaryActionBusyLabel =
    runtimePrimaryAction === 'provision'
      ? 'Provisioning...'
      : runtimePrimaryAction === 'discover'
        ? 'Detecting...'
        : runtimePrimaryActionLabel

  const firstBlocker = runtimeReadiness?.blockers?.[0] ?? null
  const runtimeModeLabel = previewRuntimeUrl ? t.externalServer : t.inlineFallback
  const checkedAtLabel = runtimeHealthCheckedAt
    ? runtimeHealthCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const quickFacts = [
    { label: t.health, value: runtimeStateLabel, hint: runtimeHealthHint },
    { label: t.strategy, value: runtimeStrategyLabel, hint: runtimeStrategyHint },
    { label: t.nextAction, value: runtimePrimaryActionLabel, hint: nextStepText },
  ]

  const techFacts = [
    managedProvider ? `provider:${managedProviderLabel}` : null,
    managedProvider ? `mode:${managedProviderMode}` : null,
    `endpoints:${configuredEndpoints.length}`,
    `local:${reachableCandidates}/${totalCandidates}`,
    runtimeReadiness?.preferredRuntimeUrl ? `preferred:${runtimeReadiness.preferredRuntimeUrl}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,18,25,0.97),rgba(11,13,18,0.985))] px-3 py-2.5 text-xs shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[320px] flex-1 flex-col gap-2.5">
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
            {checkedAtLabel ? (
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">Checked {checkedAtLabel}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            <div className="min-w-[220px] flex-1">
              <div className="text-[13px] font-semibold text-[var(--aethel-text-primary)]">
                {previewRuntimeUrl
                  ? 'Preview routed to an external runtime.'
                  : 'Inline preview is active while runtime orchestration stays offline.'}
              </div>
              <div className="mt-1 text-[11px] leading-5 text-[var(--aethel-text-tertiary)]">
                {previewRuntimeUrl
                  ? 'Validate health, keep runtime synced, and jump into the hosted surface without losing editor context.'
                  : 'Use the recommended action to discover or provision a runtime when you need real network, device, or deploy parity.'}
              </div>
            </div>
            {firstBlocker ? (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-warning-light)]">
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-warning)]">Primary blocker</div>
                <div className="mt-1">{firstBlocker}</div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {quickFacts.map((item) => (
              <CompactMetric key={item.label} label={item.label} value={item.value} hint={item.hint} />
            ))}
          </div>
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
            disabled={primaryActionBusy}
            aria-label={`Run recommended runtime action: ${runtimePrimaryActionLabel}`}
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
                disabled={isDiscoveringRuntime}
                aria-label={t.autoDetect}
                className="min-h-[38px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDiscoveringRuntime ? 'Detecting...' : t.autoDetect}
              </button>
              <button
                type="button"
                onClick={onProvisionRuntime}
                disabled={isProvisioningRuntime || !routeProvisionSupported}
                aria-label={t.provisionManaged}
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
                disabled={isSyncingRuntime}
                aria-label="Sync current files into the preview runtime"
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
