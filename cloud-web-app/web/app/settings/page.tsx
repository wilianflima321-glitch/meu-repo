'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const SettingsEditor = dynamic(() => import('../../components/SettingsEditor'), { ssr: false })

type Tab = 'editor' | 'profile' | 'billing' | 'api'

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
    if (queryTab === 'editor' || queryTab === 'profile' || queryTab === 'billing' || queryTab === 'api') {
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
      { id: 'billing' as const, label: 'Billing', description: 'Plano, assinatura e consumo' },
      { id: 'api' as const, label: 'AI Providers', description: 'Status e setup de provider IA' },
    ],
    []
  )

  const configuredProviders = providerStatus?.configuredProviders ?? []
  const missingProviders = providerStatus?.missingProviders ?? []

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-100">
              Dashboard
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-300">Settings</span>
          </div>
          <Link
            href="/ide"
            className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
          >
            Open IDE
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Workspace Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configuracao de editor, conta e providers IA com contratos explicitos de status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-md border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                        : 'border-transparent bg-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50'
                    }`}
                  >
                    <p className="text-sm font-medium">{tab.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{tab.description}</p>
                  </button>
                )
              })}
            </div>
          </nav>

          <section className="min-w-0 rounded-lg border border-zinc-800 bg-zinc-900/40">
            {activeTab === 'editor' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Editor</h2>
                <p className="mt-1 text-sm text-zinc-400">Ajuste tema, comportamento e atalhos do workspace.</p>
                <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/40 p-4">
                  <SettingsEditor />
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Perfil</h2>
                <p className="mt-1 text-sm text-zinc-400">Gerencie dados de conta e preferencias pessoais.</p>
                <div className="mt-4">
                  <Link
                    href="/profile"
                    className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Abrir perfil completo
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Billing</h2>
                <p className="mt-1 text-sm text-zinc-400">Plano atual, limites e historico de cobranca.</p>
                <div className="mt-4">
                  <Link
                    href="/billing"
                    className="inline-flex items-center rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                  >
                    Ir para billing
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">AI Providers</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Status operacional de provider para chat, complete e inline edit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void loadProviderStatus()
                    }}
                    className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    {providerLoading ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>

                {providerError && (
                  <div className="aethel-state aethel-state-error mt-4 text-xs" role="alert" aria-live="polite">
                    {providerError}
                  </div>
                )}
                {providerLoading && (
                  <div className="aethel-state aethel-state-loading mt-4 text-xs" aria-live="polite">
                    <p className="aethel-state-title mb-2">Verificando status de providers...</p>
                    <div className="space-y-1.5">
                      <div className="aethel-skeleton-line w-full" />
                      <div className="aethel-skeleton-line w-4/5" />
                    </div>
                  </div>
                )}

                {!providerLoading && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                      <p className="text-xs text-zinc-500">Providers configurados</p>
                      <p className="mt-1 text-xl font-semibold text-emerald-300">{configuredProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {configuredProviders.length === 0 && (
                          <span className="aethel-state aethel-state-empty text-xs">Nenhum provider configurado.</span>
                        )}
                        {configuredProviders.map((provider) => (
                          <span
                            key={provider}
                            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
                          >
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded border border-zinc-800 bg-zinc-950/40 p-3">
                      <p className="text-xs text-zinc-500">Providers pendentes</p>
                      <p className="mt-1 text-xl font-semibold text-amber-300">{missingProviders.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missingProviders.length === 0 && <span className="aethel-state aethel-state-empty text-xs">Nenhum pendente.</span>}
                        {missingProviders.map((provider) => (
                          <span
                            key={provider}
                            className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200"
                          >
                            {provider}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!providerLoading && providerStatusLoaded && configuredProviders.length === 0 && missingProviders.length === 0 && !providerError && (
                  <div className="aethel-state aethel-state-empty mt-4 text-xs">
                    Nenhum provider encontrado no status atual. Atualize apos configurar variaveis de ambiente.
                  </div>
                )}

                <div className="mt-4 rounded border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-300">
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Defina a chave do provider no ambiente seguro do servidor.</li>
                    <li>Reinicie o runtime para aplicar variaveis.</li>
                    <li>Atualize este painel e valide o chat em `/dashboard` ou `/ide`.</li>
                  </ol>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={providerStatus?.setupUrl || '/settings?tab=api'}
                    className="rounded border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
                  >
                    Abrir setup guiado
                  </Link>
                  <Link
                    href="/admin/apis"
                    className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Admin APIs (somente admin)
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    Abrir docs
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
