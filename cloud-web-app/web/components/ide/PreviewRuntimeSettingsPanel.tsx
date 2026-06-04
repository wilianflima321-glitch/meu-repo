'use client'

import {
  PREVIEW_COMMON_COPY,
  PREVIEW_RUNTIME_COPY,
  previewToolbarButtonBase,
  previewToolbarButtonDanger,
  previewToolbarButtonInfo,
  previewToolbarButtonSecondary,
  previewToolbarButtonSuccess,
  type PreviewRuntimeToolbarProps,
} from './PreviewRuntimeToolbar.types'

export function PreviewRuntimeSettingsPanel({
  previewRuntimeUrl,
  previewRuntimeInput,
  onRuntimeInputChange,
  onApplyRuntime,
  onDiscoverRuntime,
  onProvisionRuntime,
  onSyncRuntime,
  onRevalidate,
  onOpenRuntime,
  onUseFallback,
  isDiscoveringRuntime,
  isProvisioningRuntime,
  isSyncingRuntime,
  canSyncRuntime,
  syncRuntimeBlockedReason,
  runtimeActionBlockedReason,
  routeProvisionSupported,
}: Pick<
  PreviewRuntimeToolbarProps,
  | 'previewRuntimeUrl'
  | 'previewRuntimeInput'
  | 'onRuntimeInputChange'
  | 'onApplyRuntime'
  | 'onDiscoverRuntime'
  | 'onProvisionRuntime'
  | 'onSyncRuntime'
  | 'onRevalidate'
  | 'onOpenRuntime'
  | 'onUseFallback'
  | 'isDiscoveringRuntime'
  | 'isProvisioningRuntime'
  | 'isSyncingRuntime'
  | 'canSyncRuntime'
  | 'syncRuntimeBlockedReason'
  | 'runtimeActionBlockedReason'
> & {
  routeProvisionSupported: boolean
}) {
  const t = PREVIEW_RUNTIME_COPY
  const tc = PREVIEW_COMMON_COPY

  return (
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
          <button type="button" onClick={onApplyRuntime} aria-label="Apply manual runtime URL" className={`${previewToolbarButtonInfo} min-h-[38px] py-2`}>
            {tc.actions.apply}
          </button>
          <button
            type="button"
            onClick={onDiscoverRuntime}
            disabled={isDiscoveringRuntime || Boolean(runtimeActionBlockedReason)}
            aria-label={t.autoDetect}
            title={runtimeActionBlockedReason ?? undefined}
            className={`${previewToolbarButtonSecondary} min-h-[38px] py-2`}
          >
            {isDiscoveringRuntime ? 'Detecting...' : t.autoDetect}
          </button>
          <button
            type="button"
            onClick={onProvisionRuntime}
            disabled={isProvisioningRuntime || !routeProvisionSupported || Boolean(runtimeActionBlockedReason)}
            aria-label={t.provisionManaged}
            title={runtimeActionBlockedReason ?? undefined}
            className={`${previewToolbarButtonSuccess} min-h-[38px] py-2`}
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
            className={`${previewToolbarButtonBase} border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] py-2 font-medium text-[var(--aethel-primary-light)] hover:bg-[color-mix(in_srgb,var(--aethel-primary)_20%,transparent)] focus-visible:ring-[var(--aethel-primary)]`}
          >
            {isSyncingRuntime ? 'Syncing...' : tc.actions.sync}
          </button>
        ) : null}
        {previewRuntimeUrl ? (
          <>
            <button type="button" onClick={onRevalidate} aria-label="Revalidate preview runtime" className={`${previewToolbarButtonSecondary} py-2`}>
              {tc.actions.revalidate}
            </button>
            <button type="button" onClick={onOpenRuntime} aria-label="Open runtime in a new tab" className={`${previewToolbarButtonSecondary} py-2`}>
              Open runtime
            </button>
            <button type="button" onClick={onUseFallback} aria-label="Switch back to local preview" className={`${previewToolbarButtonDanger} py-2`}>
              Use local preview
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
