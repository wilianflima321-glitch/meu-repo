import Link from 'next/link'

export type ProviderStatusResponse = {
  configured?: boolean
  configuredProviders?: string[]
  missingProviders?: string[]
  setupUrl?: string
  setupAction?: string
  capabilityStatus?: string
}

type SettingsAIProvidersPanelProps = {
  providerStatus: ProviderStatusResponse | null
  providerLoading: boolean
  providerError: string | null
  providerStatusLoaded: boolean
  configuredProviders: string[]
  missingProviders: string[]
  onRefresh: () => void
}

export function SettingsAIProvidersPanel({
  providerStatus,
  providerLoading,
  providerError,
  providerStatusLoaded,
  configuredProviders,
  missingProviders,
  onRefresh,
}: SettingsAIProvidersPanelProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">AI Providers</h2>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
            Operational provider status for chat, completions, inline edit, and agent handoff.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
        >
          {providerLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {providerError && (
        <div
          className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4 text-xs text-[var(--aethel-error-light)]"
          role="alert"
          aria-live="polite"
        >
          {providerError}
        </div>
      )}

      {providerLoading && (
        <div className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-secondary)]" aria-live="polite">
          <p className="mb-2 text-sm font-semibold text-[var(--aethel-text-primary)]">Checking provider status...</p>
          <div className="space-y-1.5">
            <div className="h-3 w-full animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
          </div>
        </div>
      )}

      {!providerLoading && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ProviderCountCard title="Configured providers" count={configuredProviders.length} tone="success" items={configuredProviders} empty="No provider configured." />
          <ProviderCountCard title="Missing providers" count={missingProviders.length} tone="warning" items={missingProviders} empty="Nothing missing." />
        </div>
      )}

      {!providerLoading && providerStatusLoaded && configuredProviders.length === 0 && missingProviders.length === 0 && !providerError && (
        <div className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-tertiary)]">
          No provider found in the current status. Refresh after setting secure server environment variables.
        </div>
      )}

      <div className="mt-4 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3 text-xs text-[var(--aethel-text-secondary)]">
        <ol className="list-decimal space-y-1 pl-4">
          <li>Set the provider key in the secure server environment.</li>
          <li>Restart the runtime so environment variables are applied.</li>
          <li>Refresh this panel and validate chat in `/dashboard` or `/ide`.</li>
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={providerStatus?.setupUrl || '/settings?tab=api'}
          className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
        >
          Open guided setup
        </Link>
        <Link
          href="/admin/apis"
          className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
        >
          Admin APIs (admin only)
        </Link>
        <Link
          href="/docs"
          className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
        >
          Open docs
        </Link>
      </div>
    </div>
  )
}

function ProviderCountCard({
  title,
  count,
  tone,
  items,
  empty,
}: {
  title: string
  count: number
  tone: 'success' | 'warning'
  items: string[]
  empty: string
}) {
  const toneClass = tone === 'success' ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-warning)]'
  const pillClass =
    tone === 'success'
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
      : 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'

  return (
    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3">
      <p className="text-xs text-[var(--aethel-text-tertiary)]">{title}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{count}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-xs text-[var(--aethel-text-tertiary)]">
            {empty}
          </span>
        )}
        {items.map((provider) => (
          <span key={provider} className={`rounded border px-2 py-1 text-[11px] ${pillClass}`}>
            {provider}
          </span>
        ))}
      </div>
    </div>
  )
}
