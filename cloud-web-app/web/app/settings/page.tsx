'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import StudioLayout from '@/components/studio/StudioLayout'
import TwoFactorSecurityPanel from '@/components/settings/TwoFactorSecurityPanel'

const SettingsEditor = dynamic(() => import('../../components/SettingsEditor'), { ssr: false })

type Tab = 'editor' | 'profile' | 'security' | 'billing' | 'api'

type ProviderStatusResponse = {
  configured?: boolean
  configuredProviders?: string[]
  missingProviders?: string[]
  setupUrl?: string
  setupAction?: string
  capabilityStatus?: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
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
        setProviderError('Falha ao consultar status de provider.')
      }
    } catch {
      setProviderError('Falha de rede ao consultar status de provider.')
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
    if (queryTab === 'editor' || queryTab === 'profile' || queryTab === 'security' || queryTab === 'billing' || queryTab === 'api') {
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
      { id: 'editor' as const, label: 'Editor', description: 'Preferencias do editor e workspace' },
      { id: 'profile' as const, label: 'Perfil', description: 'Conta e informacoes pessoais' },
      { id: 'security' as const, label: 'Seguranca', description: '2FA, recuperacao e endurecimento da conta' },
      { id: 'billing' as const, label: 'Faturamento', description: 'Plano, assinatura e consumo' },
      { id: 'api' as const, label: 'Provedores IA', description: 'Status e setup de provedores IA' },
    ],
    []
  )

  const configuredProviders = providerStatus?.configuredProviders ?? []
  const missingProviders = providerStatus?.missingProviders ?? []

  return (
    <StudioLayout
      title="Configuracoes do Workspace"
      subtitle="Configuracao de editor, conta e providers IA com contratos explicitos de status."
      maxWidth="7xl"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
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
                    <p className="mt-1 text-[11px] text-[var(--aethel-text-tertiary)]">{tab.description}</p>
                  </button>
                )
              })}
            </div>
          </nav>

        <section className="min-w-0 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]">
            {activeTab === 'editor' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Editor</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Ajuste tema, comportamento e atalhos do workspace.</p>
                <div className="mt-4 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-4">
                  <SettingsEditor />
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Perfil</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Gerencie dados de conta e preferencias pessoais.</p>
                <div className="mt-4">
                  <Link
                    href="/profile"
                    className="inline-flex items-center rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    Abrir perfil completo
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Seguranca</h2>
                <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                  Proteja a conta com MFA canonica, codigos de recuperacao e um fluxo claro de manutencao.
                </p>
                <div className="mt-4">
                  <TwoFactorSecurityPanel />
                </div>
              </div>
            )}

              {activeTab === 'billing' && (
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg font-semibold">Faturamento</h2>
                  <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Plano atual, limites e historico de cobranca.</p>
                  <div className="mt-4">
                    <Link
                      href="/billing"
                      className="inline-flex items-center rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                    >
                      Ir para faturamento
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
                      Status operacional de provider para chat, complete e inline edit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void loadProviderStatus()
                    }}
                    className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    {providerLoading ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>

                {providerError && (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)] mt-4 text-xs" role="alert" aria-live="polite">
                    {providerError}
                  </div>
                )}
                {providerLoading && (
                  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-secondary)] mt-4 text-xs" aria-live="polite">
                    <p className="text-sm font-semibold text-[var(--aethel-text-primary)] mb-2">Verificando status de providers...</p>
                    <div className="space-y-1.5">
                      <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-full" />
                      <div className="h-3 rounded bg-[var(--aethel-surface-tertiary)] animate-pulse w-4/5" />
                    </div>
                  </div>
                )}

                {!providerLoading && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3">
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Providers configurados</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--aethel-success)]">{configuredProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {configuredProviders.length === 0 && (
                          <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] text-xs">Nenhum provider configurado.</span>
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
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">Providers pendentes</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--aethel-warning)]">{missingProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missingProviders.length === 0 && <span className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 text-[var(--aethel-text-tertiary)] text-xs">Nenhum pendente.</span>}
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
                    Nenhum provider encontrado no status atual. Atualize apos configurar variaveis de ambiente.
                  </div>
                )}

                <div className="mt-4 rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)]/40 p-3 text-xs text-[var(--aethel-text-secondary)]">
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Defina a chave do provider no ambiente seguro do servidor.</li>
                    <li>Reinicie o runtime para aplicar variaveis.</li>
                    <li>Atualize este painel e valide o chat em `/dashboard` ou `/ide`.</li>
                  </ol>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={providerStatus?.setupUrl || '/settings?tab=api'}
                    className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-info-light)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
                  >
                    Abrir setup guiado
                  </Link>
                  <Link
                    href="/admin/apis"
                    className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    Admin APIs (somente admin)
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
                  >
                    Abrir docs
                  </Link>
                </div>
              </div>
            )}
        </section>
      </div>
    </StudioLayout>
  )
}
