'use client'

import {
  CompactMetric,
  PREVIEW_COMMON_COPY,
  PreviewDeployTrustPanel,
  PreviewRuntimeSettingsPanel,
  PreviewRuntimeTechnicalDetails,
  PREVIEW_RUNTIME_COPY,
  ToolbarChip,
  getDeployStatusLabel,
  getReviewTargetBadge,
  getReviewTargetToneClass,
  type PreviewRuntimeToolbarProps,
} from './PreviewRuntimeToolbar.parts'

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
  projectId = null,
  isDeploySubmitting,
  isDeployRefreshing,
  onStartDeploy,
  onRefreshDeploy,
  onCopyShareLink,
  onOpenDeployStatus,
  onOpenDeploySite,
}: PreviewRuntimeToolbarProps) {
  const t = PREVIEW_RUNTIME_COPY
  const tc = PREVIEW_COMMON_COPY

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

  const nextStepText =
    runtimePrimaryAction === 'provision'
      ? 'Open a managed sandbox for this preview.'
      : runtimePrimaryAction === 'discover'
        ? 'Connect a local server from this machine.'
        : 'Keep reviewing here until a live runtime is ready.'

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
      ? 'This action waits for your confirmation on this device.'
      : runtimeAutomationPlacement
        ? `Best run path: ${runtimeAutomationPlacement.replace(/-/g, ' ')}.`
        : null

  const firstBlocker = runtimeReadiness?.blockers?.[0] ?? null
  const runtimeModeLabel = previewRuntimeUrl ? t.externalServer : t.inlineFallback
  const checkedAtLabel = runtimeHealthCheckedAt
    ? runtimeHealthCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const deployStatusLabel = getDeployStatusLabel(deployStatus)
  const evidenceHref = `/evidence${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`
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
        ? 'Public deploy ready to share.'
        : deployStatusHref
          ? 'Deploy status is tracked in the same lane.'
          : 'Publish when you need shareable validation and parity outside the local runtime.'
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
          <div className="flex flex-wrap items-center gap-2" data-preview-runtime-toolbar="calm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Preview
            </span>
            <ToolbarChip toneClass={runtimeStateClass}>{runtimeStateLabel}</ToolbarChip>
            <span className="text-[11px] text-[var(--aethel-text-tertiary)]">
              {runtimeModeLabel}
              {checkedAtLabel ? ` / checked ${checkedAtLabel}` : ''}
            </span>
            {firstBlocker ? (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-2.5 py-1 text-[10px] text-[var(--aethel-warning-light)]">
                Blocker: {firstBlocker}
              </span>
            ) : null}
          </div>

          {runtimeLaneHint ? (
            <details>
              <summary className="inline-flex cursor-pointer list-none text-[10px] font-medium text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]">
                Run guard
              </summary>
              <div className="mt-1 max-w-xl text-[10px] leading-4 text-[var(--aethel-text-tertiary)]">{runtimeLaneHint}</div>
            </details>
          ) : null}

          <PreviewDeployTrustPanel
            deployReadiness={deployReadiness}
            deployStateClass={deployStateClass}
            deployStatusLabel={deployStatusLabel}
            deployHint={deployHint}
            qaBlockerSummary={qaBlockerSummary}
            reviewTarget={reviewTarget}
            reviewTargetBadge={reviewTargetBadge}
            reviewTargetToneClass={reviewTargetToneClass}
            reviewActionLabel={reviewActionLabel}
            deployFeedback={deployFeedback}
            deployStatusHref={deployStatusHref}
            deployUrl={deployUrl}
            evidenceHref={evidenceHref}
            isDeploySubmitting={isDeploySubmitting}
            isDeployRefreshing={isDeployRefreshing}
            onStartDeploy={onStartDeploy}
            onOpenDeployStatus={onOpenDeployStatus}
            onOpenDeploySite={onOpenDeploySite}
            onCopyShareLink={onCopyShareLink}
            onRefreshDeploy={onRefreshDeploy}
          />

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
            aria-label={showRuntimeSettings ? 'Hide preview setup' : 'Open preview setup'}
            aria-pressed={showRuntimeSettings}
            className="min-h-[34px] rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            {showRuntimeSettings ? 'Hide setup' : 'Setup'}
          </button>
          <button
            type="button"
            onClick={onRunRecommendedAction}
            disabled={primaryActionDisabled}
            aria-label={`Run recommended preview action: ${runtimePrimaryActionLabel}`}
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
        <PreviewRuntimeSettingsPanel
          previewRuntimeUrl={previewRuntimeUrl}
          previewRuntimeInput={previewRuntimeInput}
          onRuntimeInputChange={onRuntimeInputChange}
          onApplyRuntime={onApplyRuntime}
          onDiscoverRuntime={onDiscoverRuntime}
          onProvisionRuntime={onProvisionRuntime}
          onSyncRuntime={onSyncRuntime}
          onRevalidate={onRevalidate}
          onOpenRuntime={onOpenRuntime}
          onUseFallback={onUseFallback}
          isDiscoveringRuntime={isDiscoveringRuntime}
          isProvisioningRuntime={isProvisioningRuntime}
          isSyncingRuntime={isSyncingRuntime}
          canSyncRuntime={canSyncRuntime}
          syncRuntimeBlockedReason={syncRuntimeBlockedReason}
          runtimeActionBlockedReason={runtimeActionBlockedReason}
          routeProvisionSupported={routeProvisionSupported}
        />
      ) : null}

      {runtimeDiscoveryMessage ? (
        <details className={`mt-2 rounded-xl border px-3 py-2 text-[11px] ${discoveryToneClass}`}>
          <summary className="cursor-pointer list-none font-medium">Connection note</summary>
          <div className="mt-1 leading-5">{runtimeDiscoveryMessage}</div>
        </details>
      ) : null}

      <PreviewRuntimeTechnicalDetails
        techFacts={techFacts}
        instructions={runtimeReadiness?.instructions ?? []}
        managedSetupEnv={managedSetupEnv}
        recommendedCommands={recommendedCommands}
      />

      {previewRuntimeUrl && runtimeHealthStatus !== 'reachable' ? (
        <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-warning)]">
          {runtimeHealthHint}
        </div>
      ) : null}
    </div>
  )
}
