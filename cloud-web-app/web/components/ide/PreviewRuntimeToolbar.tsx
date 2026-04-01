'use client'

import type { PreviewRuntimeHealthStatus, PreviewRuntimeReadinessResponse } from '@/lib/preview/runtime-manager'

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
      ? 'Verificando'
      : runtimeHealthStatus === 'reachable'
        ? `Acessivel${typeof runtimeHealthLatencyMs === 'number' ? ` · ${runtimeHealthLatencyMs}ms` : ''}`
        : runtimeHealthStatus === 'idle'
          ? 'Sem verificacao'
          : 'Indisponivel'
  const readinessLabel =
    runtimeReadiness?.status === 'ready'
      ? 'Pronto'
      : runtimeReadiness?.status === 'partial'
        ? 'Parcial'
        : runtimeReadiness?.blockers?.length
          ? 'Bloqueado'
          : 'Em avaliacao'
  const readinessToneClass =
    runtimeReadiness?.status === 'ready'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success)]'
      : runtimeReadiness?.status === 'partial'
        ? 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning)]'
        : 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
  const nextStepText =
    runtimePrimaryAction === 'provision'
      ? 'Subir um sandbox gerenciado para reduzir friccao de preview.'
      : runtimePrimaryAction === 'discover'
        ? 'Conectar um servidor local detectado no seu ambiente.'
        : 'Continuar com o fallback inline enquanto o runtime externo nao esta pronto.'
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Runtime de preview</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${previewRuntimeUrl ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]' : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'}`}>
              {previewRuntimeUrl ? 'Servidor externo' : 'Fallback inline'}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${readinessToneClass}`}>
              Readiness: {readinessLabel}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${runtimeStateClass}`}>
              Estado: {runtimeStateLabel}
            </span>
            {runtimeHealthCheckedAt && (
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
                verificado as {runtimeHealthCheckedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Estado atual</div>
              <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimeHealthHint}</div>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Estratégia</div>
              <div className="mt-1 font-medium text-[var(--aethel-text-primary)]">{runtimeStrategyLabel}</div>
              <div className="mt-1 text-[var(--aethel-text-tertiary)]">{runtimeStrategyHint}</div>
            </div>
            <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-secondary)]">
              <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">Proxima acao</div>
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
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-white/[0.08]"
          >
            {showRuntimeSettings ? 'Ocultar runtime' : 'Configurar runtime'}
          </button>
          <button
            type="button"
            onClick={onRunRecommendedAction}
            disabled={primaryActionBusy}
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {primaryActionBusy ? primaryActionBusyLabel : runtimePrimaryActionLabel}
          </button>
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-white/[0.08]"
            >
              Abrir preview
            </button>
          )}
        </div>
      </div>

      {showRuntimeSettings && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--aethel-border-primary)] bg-white/[0.03] p-3">
          <input
            type="url"
            value={previewRuntimeInput}
            onChange={(event) => onRuntimeInputChange(event.target.value)}
            placeholder="https://localhost:5173"
            className="min-w-[280px] flex-1 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)]"
          />
          <button
            type="button"
            onClick={onApplyRuntime}
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={onDiscoverRuntime}
            disabled={isDiscoveringRuntime}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDiscoveringRuntime ? 'Detectando...' : 'Auto-detectar'}
          </button>
          <button
            type="button"
            onClick={onProvisionRuntime}
            disabled={isProvisioningRuntime || !routeProvisionSupported}
            className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-success-light)] hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProvisioningRuntime ? 'Provisionando...' : routeProvisionSupported ? 'Provisionar runtime' : 'Provisionamento indisponivel'}
          </button>
          {canSyncRuntime && (
            <button
              type="button"
              onClick={onSyncRuntime}
              disabled={isSyncingRuntime}
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-primary-light)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingRuntime ? 'Sincronizando...' : 'Sincronizar runtime'}
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onRevalidate}
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-white/[0.08]"
            >
              Revalidar
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2 text-[11px] text-[var(--aethel-text-secondary)] hover:bg-white/[0.08]"
            >
              Abrir runtime
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onUseFallback}
              className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-2.5 py-2 text-[11px] font-medium text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)]"
            >
              Usar fallback inline
            </button>
          )}
        </div>
      )}

      {runtimeDiscoveryMessage && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${discoveryToneClass}`}>{runtimeDiscoveryMessage}</div>
      )}

      <details className="mt-3 rounded-xl border border-[var(--aethel-border-primary)] bg-white/[0.02]">
        <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-[var(--aethel-text-secondary)]">
          Ver detalhes tecnicos do runtime
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
              local:{reachableCandidates}/{totalCandidates} acessiveis
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
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-white/[0.03] px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]"
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
                  className="rounded-full border border-[var(--aethel-border-primary)] bg-white/[0.03] px-2.5 py-1 text-[11px] text-[var(--aethel-text-tertiary)]"
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
