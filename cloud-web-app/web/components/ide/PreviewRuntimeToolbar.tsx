'use client'

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
  const t = ptBR.ide.preview;
  const tc = ptBR.common;

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
        ? `${tc.status.reachable}${typeof runtimeHealthLatencyMs === 'number' ? ` · ${runtimeHealthLatencyMs}ms` : ''}`
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
      ? 'Subir um sandbox gerenciado para reduzir fricção de preview.'
      : runtimePrimaryAction === 'discover'
        ? 'Conectar um servidor local detectado no seu ambiente.'
        : 'Continuar com o fallback inline enquanto o runtime externo não está pronto.'
  const primaryActionBusy =
    runtimePrimaryAction === 'provision'
      ? isProvisioningRuntime
      : runtimePrimaryAction === 'discover'
        ? isDiscoveringRuntime
        : false
  const primaryActionBusyLabel =
    runtimePrimaryAction === 'provision'
      ? 'Provisionando...'
      : runtimePrimaryAction === 'discover'
        ? 'Detectando...'
        : runtimePrimaryActionLabel

  const firstBlocker = runtimeReadiness?.blockers?.[0] ?? null

  return (
    <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(16,18,25,0.96),rgba(11,13,18,0.98))] px-3 py-2 text-xs shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[280px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{t.runtime}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${previewRuntimeUrl ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'}`}>
              {previewRuntimeUrl ? t.externalServer : t.inlineFallback}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${readinessToneClass}`}>
              Prontidão: {readinessLabel}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${runtimeStateClass}`}>
              Estado: {runtimeStateLabel}
            </span>
            {runtimeHealthCheckedAt && (
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
                verificado às {runtimeHealthCheckedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{t.health}</div>
              <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimeHealthHint}</div>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{t.strategy}</div>
              <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimeStrategyLabel}</div>
              <div className="mt-1 text-[var(--aethel-text-tertiary)]">{runtimeStrategyHint}</div>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{t.nextAction}</div>
              <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimePrimaryActionLabel}</div>
              <div className="mt-1 text-[var(--aethel-text-tertiary)]">{nextStepText}</div>
              {firstBlocker && (
                <div className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] px-2 py-1 text-[10px] text-[var(--aethel-warning-light)]">
                  Bloqueio: {firstBlocker}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSettings}
            aria-label={showRuntimeSettings ? 'Ocultar configurações do runtime de preview' : 'Abrir configurações do runtime de preview'}
            aria-pressed={showRuntimeSettings}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            {showRuntimeSettings ? 'Ocultar runtime' : 'Configurar runtime'}
          </button>
          <button
            type="button"
            onClick={onRunRecommendedAction}
            disabled={primaryActionBusy}
            aria-label={`Executar ação recomendada para o runtime: ${runtimePrimaryActionLabel}`}
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {primaryActionBusy ? primaryActionBusyLabel : runtimePrimaryActionLabel}
          </button>
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              aria-label={t.openNewTab}
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Abrir preview
            </button>
          )}
        </div>
      </div>

      {showRuntimeSettings && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-3">
          <input
            type="url"
            value={previewRuntimeInput}
            onChange={(event) => onRuntimeInputChange(event.target.value)}
            placeholder="https://localhost:5173"
            aria-label={t.manualUrl}
            className="min-w-[280px] flex-1 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          />
          <button
            type="button"
            onClick={onApplyRuntime}
            aria-label="Aplicar a URL manual do runtime"
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-info-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
          >
            {tc.actions.apply}
          </button>
          <button
            type="button"
            onClick={onDiscoverRuntime}
            disabled={isDiscoveringRuntime}
            aria-label={t.autoDetect}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDiscoveringRuntime ? 'Detectando...' : t.autoDetect}
          </button>
          <button
            type="button"
            onClick={onProvisionRuntime}
            disabled={isProvisioningRuntime || !routeProvisionSupported}
            aria-label={t.provisionManaged}
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-success-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProvisioningRuntime ? 'Provisionando...' : routeProvisionSupported ? t.provisionManaged : 'Provisionamento indisponível'}
          </button>
          {canSyncRuntime && (
            <button
              type="button"
              onClick={onSyncRuntime}
              disabled={isSyncingRuntime}
              aria-label="Sincronizar os arquivos atuais com o runtime de preview"
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-primary-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingRuntime ? 'Sincronizando...' : tc.actions.sync}
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onRevalidate}
              aria-label="Revalidar o runtime de preview"
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              {tc.actions.revalidate}
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              aria-label="Abrir o runtime em nova aba"
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Abrir runtime
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onUseFallback}
              aria-label="Usar o fallback inline do preview"
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-error-light)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-error)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Usar fallback inline
            </button>
          )}
        </div>
      )}

      {runtimeDiscoveryMessage && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${discoveryToneClass}`}>{runtimeDiscoveryMessage}</div>
      )}

      <details className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
          {t.technicalDetails}
        </summary>
        <div className="border-t border-[var(--aethel-border-primary)] px-3 py-3">

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
            {managedProvider && (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1">
                provedor:{managedProviderLabel}
              </span>
            )}
            {managedProvider && (
              <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1">
                modo:{managedProviderMode}
              </span>
            )}
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1">
              endpoints:{configuredEndpoints.length}
            </span>
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2 py-1">
              local:{reachableCandidates}/{totalCandidates} acessíveis
            </span>
            {runtimeReadiness?.preferredRuntimeUrl && (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_25%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2 py-1 text-[var(--aethel-info-light)]">
                preferido:{runtimeReadiness.preferredRuntimeUrl}
              </span>
            )}
          </div>

          {runtimeReadiness?.instructions && runtimeReadiness.instructions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {runtimeReadiness.instructions.map((instruction) => (
                <span
                  key={instruction}
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]"
                >
                  {instruction}
                </span>
              ))}
            </div>
          )}

          {managedSetupEnv.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {managedSetupEnv.map((envKey) => (
                <span
                  key={envKey}
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1 text-[11px] text-[var(--aethel-text-tertiary)]"
                >
                  env:{envKey}
                </span>
              ))}
            </div>
          )}

          {recommendedCommands.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendedCommands.map((command) => (
                <code
                  key={command}
                  className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-info-light)]"
                >
                  {command}
                </code>
              ))}
            </div>
          )}
        </div>
      </details>

      {previewRuntimeUrl && runtimeHealthStatus !== 'reachable' && (
        <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-warning)]">
          {runtimeHealthHint}
        </div>
      )}
    </div>
  )
}
