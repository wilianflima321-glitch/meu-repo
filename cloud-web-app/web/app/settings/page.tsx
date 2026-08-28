'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import StudioLayout from '@/components/studio/StudioLayout'
import SettingsUI, { SettingsProvider } from '@/components/settings/SettingsUI'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'
import UserAuditLogPanel from '@/components/settings/UserAuditLogPanel'
import SettingsCommandCenter from './_components/SettingsCommandCenter'
import {
  SettingsAIProvidersPanel,
  type ProviderStatusResponse,
} from './_components/SettingsAIProvidersPanel'
import AccountDataPanel from './_components/AccountDataPanel'
import { LocalBYOKSection } from '@/components/settings/BYOKVaultPanel'
import { hydrateByokFromIdb } from '@/lib/ai/byok-idb-store'

type Tab = 'overview' | 'editor' | 'profile' | 'security' | 'billing' | 'api' | 'engine' | 'byok'

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
    if (
      queryTab === 'overview' ||
      queryTab === 'editor' ||
      queryTab === 'profile' ||
      queryTab === 'security' ||
      queryTab === 'billing' ||
      queryTab === 'api' ||
      queryTab === 'engine' ||
      queryTab === 'byok'
    ) {
      setActiveTab(queryTab)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'byok') return
    void hydrateByokFromIdb()
    // One-shot legacy clear: wipe any retired server vault key so DB cannot bypass metering
    try {
      if (typeof window !== 'undefined' && !sessionStorage.getItem('aethel-byok-legacy-cleared')) {
        sessionStorage.setItem('aethel-byok-legacy-cleared', '1')
        void fetch('/api/settings/byok', { method: 'DELETE', credentials: 'include' }).catch(() => {})
      }
    } catch {
      /* sessionStorage unavailable */
    }
  }, [activeTab])

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
      { id: 'overview' as const, label: 'Overview', description: 'Next action, risk, and setup' },
      { id: 'profile' as const, label: 'Profile', description: 'Account and personal details' },
      { id: 'security' as const, label: 'Security', description: '2FA, recovery, and account hardening' },
      { id: 'billing' as const, label: 'Billing', description: 'Plan, subscription, and usage' },
      { id: 'api' as const, label: 'AI providers', description: 'Provider status and setup' },
      { id: 'byok' as const, label: 'BYOK', description: 'Your keys — IndexedDB, never server' },
      { id: 'engine' as const, label: 'Engine', description: 'Simulation, controls, audio, VR, fidelity' },
      { id: 'editor' as const, label: 'Advanced editor', description: 'Editor and engine controls' },
    ],
    []
  )

  const configuredProviders = providerStatus?.configuredProviders ?? []
  const missingProviders = providerStatus?.missingProviders ?? []
  const primaryTabs = tabs.filter((tab) => tab.id !== 'editor')
  const advancedTabs = tabs.filter((tab) => tab.id === 'editor')

  return (
    <StudioLayout
      title="Workspace settings"
      subtitle="Account, security, billing, and AI setup. Advanced controls stay tucked away."
      maxWidth="7xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
          <div className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-1">
            {primaryTabs.map((tab) => {
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
          <details className="mt-2 border-t border-[var(--aethel-border-primary)] pt-2" open={activeTab === 'editor'}>
            <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
              Advanced
            </summary>
            <div className="mt-1 grid gap-1">
              {advancedTabs.map((tab) => {
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
          </details>
        </nav>

        <section className="min-w-0 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
          {activeTab === 'overview' && (
            <SettingsCommandCenter
              configuredProviders={configuredProviders.length}
              missingProviders={missingProviders.length}
              providerStatusLoaded={providerStatusLoaded}
              onSelectTab={setActiveTab as any}
            />
          )}

            {activeTab === 'engine' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Engine settings</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Configure simulation physics, camera controls, audio, VR, and viewport fidelity. These settings
                  apply to the active project&apos;s viewport and playtest sessions.
                </p>
                <div className="mt-4 overflow-hidden rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40">
                  <SettingsProvider>
                    <SettingsUI className="min-h-[720px]" initialCategoryFilter="Engine" />
                  </SettingsProvider>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Advanced editor settings</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Editor and engine configuration. Kept behind a deliberate tab so settings stay focused.
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
                <AccountDataPanel />

                <div className="mt-6 border-t border-[var(--aethel-border-primary)] pt-6">
                  <h3 className="mb-1 text-base font-semibold">BYOK keys</h3>
                  <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
                    Provider keys are client-only (IndexedDB). Open the BYOK tab to configure — never stored on Aethel servers.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('byok')}
                    className="rounded-lg bg-[var(--aethel-info)] px-3 py-2 text-sm font-medium text-[var(--aethel-text-primary)]"
                  >
                    Open BYOK settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'byok' && (
              <div className="space-y-6 p-4 sm:p-6">
                <div>
                  <h2 className="text-lg font-semibold">Bring your own key</h2>
                  <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                    Keys stay in IndexedDB (<code className="text-xs">aethel-byok-v1</code>) and are sent only as
                    request headers for proxy calls. Platform AI debit is skipped. Rate limit: 10 req/min.
                    Available on all tiers including Free ($0).
                  </p>
                </div>
                <LocalBYOKSection />
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_8%,transparent)] p-4 text-sm text-[var(--aethel-warning-light)]">
                  Server vault is retired (410). If you previously saved a key on the server, use DELETE via account
                  security tools or contact support — new keys must be local.
                </div>
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
              <SettingsAIProvidersPanel
                providerStatus={providerStatus}
                providerLoading={providerLoading}
                providerError={providerError}
                providerStatusLoaded={providerStatusLoaded}
                configuredProviders={configuredProviders}
                missingProviders={missingProviders}
                onRefresh={() => {
                  void loadProviderStatus()
                }}
              />
            )}
        </section>
      </div>
    </StudioLayout>
  )
}
