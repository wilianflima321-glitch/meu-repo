'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import StudioLayout from '@/components/studio/StudioLayout'
import SettingsUI, { SettingsProvider } from '@/components/settings/SettingsUI'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'
import UserAuditLogPanel from '@/components/settings/UserAuditLogPanel'
import SettingsCommandCenter from './_components/SettingsCommandCenter'

type Tab = 'overview' | 'editor' | 'profile' | 'security' | 'billing' | 'api'

type ProviderStatusResponse = {
  configured?: boolean
  configuredProviders?: string[]
  missingProviders?: string[]
  setupUrl?: string
  setupAction?: string
  capabilityStatus?: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null)
  const [providerLoading, setProviderLoading] = useState(false)
  const [providerError, setProviderError] = useState<string | null>(null)
  const [providerStatusLoaded, setProviderStatusLoaded] = useState(false)

  const loadProviderStatus = async () => {
    try {
      setProviderLoading(true)
      setProviderError(null)
      const response = await fetch('/api/ai/provider-status', { cache: 'no-store' })
      const payload = (await response.json()) as ProviderStatusResponse
      setProviderStatus(payload)
      setProviderStatusLoaded(true)
      if (!response.ok) {
        setProviderError('Failed to check provider status.')
      }
    } catch {
      setProviderError('Network failure while checking provider status.')
      setProviderStatusLoaded(false)
    } finally {
      setProviderLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'api') return
    void loadProviderStatus()
  }, [activeTab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const queryTab = new URLSearchParams(window.location.search).get('tab')
    if (queryTab === 'overview' || queryTab === 'editor' || queryTab === 'profile' || queryTab === 'security' || queryTab === 'billing' || queryTab === 'api') {
      setActiveTab(queryTab)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    const nextQuery = params.toString()
    const nextUrl = nextQuery ? `/settings?${nextQuery}` : '/settings'
    window.history.replaceState(null, '', nextUrl)
  }, [activeTab])

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview', description: 'Next action, risk, and readiness' },
      { id: 'profile' as const, label: 'Profile', description: 'Account and personal details' },
      { id: 'security' as const, label: 'Security', description: '2FA, recovery, and account hardening' },
      { id: 'billing' as const, label: 'Billing', description: 'Plan, subscription, and usage' },
      { id: 'api' as const, label: 'AI providers', description: 'Provider status and setup' },
      { id: 'editor' as const, label: 'Advanced editor', description: 'Workbench and engine settings' },
    ],
    []
  )

  const configuredProviders = providerStatus?.configuredProviders ?? []
  const missingProviders = providerStatus?.missingProviders ?? []

  return (
    <StudioLayout
      title="Workspace settings"
      subtitle="Account, security, billing, AI providers, and advanced editor controls with explicit readiness."
      maxWidth="7xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md border px-3 py-2 text-left transition ${ isActive ? 'border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] text-[var(--aethel-info-light)]' : 'border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]' }`}
                >
                  <p className="text-sm font-medium">{tab.label}</p>
                  <p className="mt-1 hidden text-[11px] text-[var(--aethel-text-tertiary)] sm:block">{tab.description}</p>
                </button>
              )
            })}
          </div>
        </nav>

        <section className="min-w-0 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
          {activeTab === 'overview' && (
            <SettingsCommandCenter
              configuredProviders={configuredProviders.length}
              missingProviders={missingProviders.length}
              providerStatusLoaded={providerStatusLoaded}
              onSelectTab={setActiveTab}
            />
          )}

            {activeTab === 'editor' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Advanced editor settings</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Full workbench, editor, and engine configuration. This stays behind a deliberate tab so settings do not open as a wall of controls.
                </p>
                <div className="mt-4 overflow-hidden rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40">
                  <SettingsProvider>
                    <SettingsUI className="min-h-[720px]" />
                  </SettingsProvider>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Manage account details and personal preferences.</p>
                <div className="mt-4">
                  <Link
                    href="/profile"
                    className="inline-flex items-center rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    Open full profile
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Security</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Protect the account with canonical MFA, recovery codes, passkeys, and a clear maintenance trail.
                </p>
                <div className="mt-4">
                  <TwoFactorSecurityPanel />
                </div>
                <UserAuditLogPanel />
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Billing</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Current plan, limits, usage, and billing history.</p>
                <div className="mt-4">
                  <Link
                    href="/billing"
                    className="inline-flex items-center rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    Open billing
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
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
                    onClick={() => {
                      void loadProviderStatus()
                    }}
                    className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    {providerLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {providerError && (
                  <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] p-4 text-xs text-[var(--aethel-error-light)]" role="alert" aria-live="polite">
                    {providerError}
                  </div>
                )}
                {providerLoading && (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-secondary)] mt-4 text-xs" aria-live="polite">
                    <p className="text-sm font-semibold text-[var(--aethel-text-primary)] mb-2">Checking provider status...</p>
                    <div className="space-y-1.5">
                      <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-full" />
                      <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-4/5" />
                    </div>
                  </div>
                )}

                {!providerLoading && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3">
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Configured providers</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--aethel-success)]">{configuredProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {configuredProviders.length === 0 && (
                          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] text-xs">No provider configured.</span>
                        )}
                        {configuredProviders.map((provider) => (
                          <span
                            key={provider}
                            className="rounded border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-success-light)]"
                          >
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3">
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Missing providers</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--aethel-warning)]">{missingProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missingProviders.length === 0 && <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] text-xs">Nothing missing.</span>}
                        {missingProviders.map((provider) => (
                          <span
                            key={provider}
                            className="rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-2 py-1 text-[11px] text-[var(--aethel-warning-light)]"
                          >
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!providerLoading && providerStatusLoaded && configuredProviders.length === 0 && missingProviders.length === 0 && !providerError && (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] mt-4 text-xs">
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
            )}
        </section>
      </div>
    </StudioLayout>
  )
}
