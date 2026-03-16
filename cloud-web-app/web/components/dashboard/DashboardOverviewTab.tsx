import { APIError } from '@/lib/api'
import type { ConnectivityResponse, WalletSummary } from '@/lib/api'
import CanonicalPreviewSurface from '@/components/preview/CanonicalPreviewSurface'

import type { Project } from './aethel-dashboard-model'

type Point3 = {
  x: number
  y: number
  z: number
}

type DashboardOverviewTabProps = {
  aiActivity: string
  projects: Project[]
  livePreviewSuggestions: string[]
  authReady: boolean
  hasToken: boolean
  onRefreshWallet: () => void
  lastWalletUpdate: string | null
  walletLoading: boolean
  walletError: Error | null | undefined
  walletData: WalletSummary | undefined
  walletTransactions: WalletSummary['transactions']
  formatCurrencyLabel: (currency?: string | null) => string
  connectivityData: ConnectivityResponse | undefined
  connectivityLoading: boolean
  connectivityError: Error | null | undefined
  connectivityServices: ConnectivityResponse['services'] | undefined
  formatConnectivityStatus: (status?: string | null) => string
  miniPreviewExpanded: boolean
  onToggleMiniPreviewExpanded: () => void
  onMagicWandSelect: (position: Point3) => void
  onSendSuggestion: (suggestion: string) => Promise<void>
  isGenerating: boolean
}

export function DashboardOverviewTab({
  aiActivity,
  projects,
  livePreviewSuggestions,
  authReady,
  hasToken,
  onRefreshWallet,
  lastWalletUpdate,
  walletLoading,
  walletError,
  walletData,
  walletTransactions,
  formatCurrencyLabel,
  connectivityData,
  connectivityLoading,
  connectivityError,
  connectivityServices = [],
  formatConnectivityStatus,
  miniPreviewExpanded,
  onToggleMiniPreviewExpanded,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: DashboardOverviewTabProps) {
  return (
    <div className="aethel-p-6 space-y-6">
      <div className="aethel-card">
        <div className="aethel-flex aethel-justify-between aethel-items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Studio Home</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Visao geral do ambiente</h2>
            <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
              Sinais de atividade, conectividade e preview em uma unica tela.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
              Sessao segura
            </span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-1 text-xs text-[var(--aethel-success-light)]">
              Runtime pronto
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Atividade IA</div>
          <p className="mt-3 text-3xl font-semibold text-[var(--aethel-info)]">{aiActivity}</p>
          <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">Planos, execucoes e revisoes no studio.</p>
        </div>
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Projetos ativos</div>
          <p className="mt-3 text-3xl font-semibold text-[var(--aethel-success)]">
            {projects.filter((project) => project.status === 'active').length}
          </p>
          <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">Fluxos em andamento e builds recentes.</p>
        </div>
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Preview ao vivo</div>
          <p className="mt-3 text-3xl font-semibold text-[var(--aethel-info)]">
            {livePreviewSuggestions.length} sugestoes
          </p>
          <p className="mt-2 text-xs text-[var(--aethel-text-secondary)]">Ideias prontas para testar agora.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-items-center aethel-justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Carteira</p>
              <h3 className="text-lg font-semibold">Saldo da carteira</h3>
            </div>
            {authReady && hasToken && (
              <button
                type="button"
                onClick={onRefreshWallet}
                className="aethel-button aethel-button-ghost rounded-full px-3 py-1 text-xs"
              >
                Atualizar
              </button>
            )}
            {lastWalletUpdate && (
              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                Atualizado - {new Date(lastWalletUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="mt-4">
            {!authReady && <p className="text-sm text-[var(--aethel-text-secondary)]">Verificando sessao...</p>}
            {authReady && !hasToken && (
              <p className="text-sm text-[var(--aethel-text-secondary)]">Faca login para visualizar seu saldo.</p>
            )}
            {authReady && hasToken && walletLoading && (
              <p className="text-sm text-[var(--aethel-text-secondary)]">Carregando carteira...</p>
            )}
            {authReady && hasToken && walletError && (
              <p className="text-sm text-[var(--aethel-error)]">
                {walletError instanceof APIError && walletError.status === 401
                  ? 'Sessao expirada. Entre novamente.'
                  : 'Nao foi possivel carregar os dados da carteira.'}
              </p>
            )}
            {authReady && hasToken && !walletLoading && !walletError && walletData && (
              <>
                <p className="text-3xl font-semibold text-[var(--aethel-text-primary)]">
                  {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                </p>
                <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">
                  {walletTransactions.length} transacoes registradas
                </p>
                <ul className="mt-4 space-y-3">
                  {walletTransactions.slice(-3).reverse().map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
                      <div className="aethel-flex aethel-justify-between aethel-items-center">
                        <span className="text-sm font-medium">
                          {entry.reference || entry.entry_type.toUpperCase()}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            entry.entry_type === 'credit' ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'
                          }`}
                        >
                          {entry.entry_type === 'credit' ? '+' : '-'}
                          {entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                        </span>
                      </div>
                      <div className="aethel-flex aethel-justify-between aethel-items-center mt-1">
                        <span className="text-xs text-[var(--aethel-text-secondary)]">
                          Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '-'}{' '}
                          {formatCurrencyLabel(entry.currency)}
                        </span>
                        <span className="text-xs text-[var(--aethel-text-tertiary)]">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                  {walletTransactions.length === 0 && (
                    <li className="aethel-state aethel-state-empty text-sm">Nenhuma transacao registrada.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Infra</p>
              <h3 className="text-lg font-semibold">Status de conectividade</h3>
            </div>
            {connectivityData && (
              <span
                className={`text-xs rounded-full px-3 py-1 border ${
                  connectivityData.overall_status === 'healthy'
                    ? 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]'
                    : connectivityData.overall_status === 'degraded'
                    ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
                    : 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
                }`}
              >
                {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-4">
            {connectivityLoading && <p className="text-sm text-[var(--aethel-text-secondary)]">Monitorando servicos...</p>}
            {connectivityError && (
              <p className="text-sm text-[var(--aethel-error)]">Falha ao consultar conectividade.</p>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length === 0 && (
              <div className="aethel-state aethel-state-empty text-sm">Nenhum servico configurado.</div>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length > 0 && (
              <div className="space-y-3">
                {connectivityServices.map((service) => (
                  <div key={service.name} className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-3">
                    <div className="aethel-flex aethel-justify-between aethel-items-center">
                      <span className="text-sm font-medium capitalize">
                        {service.name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 ${
                          service.status === 'healthy'
                            ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]'
                            : service.status === 'degraded'
                            ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
                            : 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
                        }`}
                      >
                        {formatConnectivityStatus(service.status).toUpperCase()}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {service.endpoints.slice(0, 3).map((endpoint) => (
                        <li key={`${service.name}-${endpoint.url}`} className="aethel-flex aethel-justify-between text-xs">
                          <span className={endpoint.healthy ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'}>
                            {endpoint.url}
                          </span>
                          <span className="text-[var(--aethel-text-secondary)]">
                            {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)}ms` : '-'}
                          </span>
                        </li>
                      ))}
                      {service.endpoints.length > 3 && (
                        <li className="text-xs text-[var(--aethel-text-tertiary)]">
                          +{service.endpoints.length - 3} endpoints adicionais
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="aethel-card aethel-p-6">
        <div className="aethel-flex aethel-items-center aethel-justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Preview</p>
            <h3 className="text-xl font-semibold">Previa ao vivo</h3>
          </div>
          <button type="button" onClick={onToggleMiniPreviewExpanded} className="aethel-button aethel-button-ghost text-sm">
            {miniPreviewExpanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>
        <CanonicalPreviewSurface
          variant="live"
          onMagicWandSelect={onMagicWandSelect}
          suggestions={livePreviewSuggestions}
          onSendSuggestion={onSendSuggestion}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  )
}
