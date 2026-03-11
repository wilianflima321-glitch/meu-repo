'use client'

import type { PreviewRuntimeHealthStatus } from '@/lib/preview/runtime-manager'
import type { PreviewRuntimeReadinessResponse } from '@/lib/preview/runtime-manager'

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

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-zinc-400">
          Preview runtime:{' '}
          <span className={previewRuntimeUrl ? 'text-cyan-300' : 'text-zinc-300'}>
            {previewRuntimeUrl ? 'dev-server externo' : 'inline fallback'}
          </span>
          <span className="ml-2 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
            strategy:{runtimeStrategyLabel}
          </span>
          {previewRuntimeUrl && (
            <span
              className={`ml-2 rounded px-2 py-0.5 text-[10px] ${
                runtimeHealthStatus === 'reachable'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : runtimeHealthStatus === 'checking'
                    ? 'bg-amber-500/15 text-amber-300'
                    : runtimeHealthStatus === 'idle'
                      ? 'bg-zinc-700/50 text-zinc-400'
                      : 'bg-rose-500/15 text-rose-300'
              }`}
            >
              {runtimeHealthStatus === 'checking'
                ? 'checking'
                : runtimeHealthStatus === 'reachable'
                  ? `reachable${typeof runtimeHealthLatencyMs === 'number' ? ` ${runtimeHealthLatencyMs}ms` : ''}`
                  : runtimeHealthStatus}
            </span>
          )}
          {previewRuntimeUrl && runtimeHealthCheckedAt && (
            <span className="ml-2 text-[10px] text-zinc-500">
              checked {runtimeHealthCheckedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSettings}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
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
            className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-70"
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
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDiscoveringRuntime ? 'Detectando...' : 'Auto detectar'}
          </button>
          <button
            type="button"
            onClick={onProvisionRuntime}
            disabled={isProvisioningRuntime || !routeProvisionSupported}
            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isProvisioningRuntime ? 'Provisionando...' : routeProvisionSupported ? 'Provisionar runtime' : 'Provisionamento indisponivel'}
          </button>
          {canSyncRuntime && (
            <button
              type="button"
              onClick={onSyncRuntime}
              disabled={isSyncingRuntime}
              className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSyncingRuntime ? 'Sincronizando...' : 'Sync runtime'}
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onUseFallback}
              className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20"
            >
              Usar fallback
            </button>
          )}
        </div>
      </div>
      {showRuntimeSettings && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={previewRuntimeInput}
            onChange={(event) => onRuntimeInputChange(event.target.value)}
            placeholder="https://localhost:5173"
            className="min-w-[280px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={onApplyRuntime}
            className="rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
          >
            Aplicar
          </button>
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onRevalidate}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
            >
              Revalidar
            </button>
          )}
          {previewRuntimeUrl && (
            <button
              type="button"
              onClick={onOpenRuntime}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
            >
              Abrir runtime
            </button>
          )}
        </div>
      )}
      {runtimeDiscoveryMessage && (
        <div className={`mt-2 rounded px-2 py-1 text-[11px] ${discoveryToneClass}`}>{runtimeDiscoveryMessage}</div>
      )}
      <div className="mt-2 rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-[11px] text-zinc-300">
        {runtimeStrategyHint}
        {runtimeReadiness?.blockers && runtimeReadiness.blockers.length > 0 && (
          <span className="ml-1 text-zinc-500">
            Blockers: {runtimeReadiness.blockers.join(', ')}.
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
        {managedProvider && (
          <span className="rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1">
            provider:{managedProviderLabel}
          </span>
        )}
        {managedProvider && (
          <span className="rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1">
            mode:{managedProviderMode}
          </span>
        )}
        <span className="rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1">
          endpoints:{configuredEndpoints.length}
        </span>
        <span className="rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1">
          local:{reachableCandidates}/{totalCandidates} reachable
        </span>
        {runtimeReadiness?.preferredRuntimeUrl && (
          <span className="rounded border border-zinc-800 bg-zinc-900/70 px-2 py-1 text-cyan-300">
            preferred:{runtimeReadiness.preferredRuntimeUrl}
          </span>
        )}
      </div>
      {runtimeReadiness?.instructions && runtimeReadiness.instructions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {runtimeReadiness.instructions.map((instruction) => (
            <span
              key={instruction}
              className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-300"
            >
              {instruction}
            </span>
          ))}
        </div>
      )}
      {managedSetupEnv.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {managedSetupEnv.map((envKey) => (
            <span
              key={envKey}
              className="rounded border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-400"
            >
              env:{envKey}
            </span>
          ))}
        </div>
      )}
      {recommendedCommands.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {recommendedCommands.map((command) => (
            <code
              key={command}
              className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-cyan-300"
            >
              {command}
            </code>
          ))}
        </div>
      )}
      {previewRuntimeUrl && runtimeHealthStatus !== 'reachable' && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
          {runtimeHealthHint}
        </div>
      )}
    </div>
  )
}
