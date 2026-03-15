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
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : runtimeDiscoveryTone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
        : 'border-zinc-700 bg-zinc-900/80 text-zinc-300'
  const runtimeStateClass =
    runtimeHealthStatus === 'reachable'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
      : runtimeHealthStatus === 'checking'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-200'
        : runtimeHealthStatus === 'idle'
          ? 'border-zinc-700 bg-zinc-900/80 text-zinc-400'
          : 'border-rose-500/25 bg-rose-500/10 text-rose-200'
  const runtimeStateLabel =
    runtimeHealthStatus === 'checking'
      ? 'Checking'
      : runtimeHealthStatus === 'reachable'
        ? `Reachable${typeof runtimeHealthLatencyMs === 'number' ? ` ${runtimeHealthLatencyMs}ms` : ''}`
        : runtimeHealthStatus

  return (
    <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,18,25,0.96),rgba(11,13,18,0.98))] px-3 py-2 text-xs shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-[280px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Preview Runtime</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${previewRuntimeUrl ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 bg-zinc-900/80 text-zinc-300'}`}>
              {previewRuntimeUrl ? 'Dev server externo' : 'Inline fallback'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
              Strategy · {runtimeStrategyLabel}
            </span>
            {previewRuntimeUrl && (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${runtimeStateClass}`}>
                {runtimeStateLabel}
              </span>
            )}
            {previewRuntimeUrl && runtimeHealthCheckedAt && (
              <span className="text-[10px] text-slate-500">
                checked {runtimeHealthCheckedAt.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
            <div className="font-medium text-slate-200">{runtimeStrategyHint}</div>
            {runtimeReadiness?.blockers && runtimeReadiness.blockers.length > 0 && (
              <div className="mt-1 text-slate-500">
                Blockers: {runtimeReadiness.blockers.join(', ')}.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToggleSettings}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/[0.08]"
          >
            {showRuntimeSettings ? 'Ocultar runtime' : 'Configurar runtime'}
          </button>
          <button
            type="button"
            onClick={onRunRecommendedAction}
            disabled={
              runtimePrimaryAction === 'provision'
                ? isProvisioningRuntime
                : runtimePrimaryAction === 'discover'
                  ? isDiscoveringRuntime
                  : false
            }
            className="rounded-xl border border-sky-500/30 bg-sky-500/12 px-2.5 py-1.5 text-[11px] font-medium text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {runtimePrimaryAction === 'provision' && isProvisioningRuntime
              ? 'Provisionando...'
              : runtimePrimaryAction === 'discover' && isDiscoveringRuntime
                ? 'Detectando...'
                : runtimePrimaryActionLabel}
          </button>
          <button
            type="button"
            onClick={onDiscoverRuntime}
            disabled={isDiscoveringRuntime}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDiscoveringRuntime ? 'Detectando...' : 'Auto detectar'}
          </button>
          <button
            type="button"
            onClick={onProvisionRuntime}
            disabled={isProvisioningRuntime || !routeProvisionSupported}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/12 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProvisioningRuntime ? 'Provisionando...' : routeProvisionSupported ? 'Provisionar runtime' : 'Provisionamento indisponivel'}
          </button>
          {canSyncRuntime && (
            <button
              type="button"
              onClick={onSyncRuntime}
              disabled={isSyncingRuntime}
              className="rounded-xl border border-indigo-500/30 bg-indigo-500/12 px-2.5 py-1.5 text-[11px] font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingRuntime ? 'Sincronizando...' : 'Sync runtime'}
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onUseFallback}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
            >
              Usar fallback
            </button>
          )}
        </div>
      </div>

      {showRuntimeSettings && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <input
            type="url"
            value={previewRuntimeInput}
            onChange={(event) => onRuntimeInputChange(event.target.value)}
            placeholder="https://localhost:5173"
            className="min-w-[280px] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={onApplyRuntime}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/12 px-2.5 py-2 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            Aplicar
          </button>
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onRevalidate}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[11px] text-zinc-200 hover:bg-white/[0.08]"
            >
              Revalidar
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[11px] text-zinc-200 hover:bg-white/[0.08]"
            >
              Abrir runtime
            </button>
          )}
        </div>
      )}

      {runtimeDiscoveryMessage && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${discoveryToneClass}`}>{runtimeDiscoveryMessage}</div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
        {managedProvider && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
            provider:{managedProviderLabel}
          </span>
        )}
        {managedProvider && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
            mode:{managedProviderMode}
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
          endpoints:{configuredEndpoints.length}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">
          local:{reachableCandidates}/{totalCandidates} reachable
        </span>
        {runtimeReadiness?.preferredRuntimeUrl && (
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-cyan-300">
            preferred:{runtimeReadiness.preferredRuntimeUrl}
          </span>
        )}
      </div>

      {runtimeReadiness?.instructions && runtimeReadiness.instructions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {runtimeReadiness.instructions.map((instruction) => (
            <span
              key={instruction}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300"
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
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400"
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
              className="rounded-xl border border-white/10 bg-black/25 px-2.5 py-1.5 text-[11px] text-cyan-300"
            >
              {command}
            </code>
          ))}
        </div>
      )}

      {previewRuntimeUrl && runtimeHealthStatus !== 'reachable' && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          {runtimeHealthHint}
        </div>
      )}
    </div>
  )
}
