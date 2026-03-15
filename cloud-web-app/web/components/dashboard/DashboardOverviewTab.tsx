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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Studio Home</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Visao geral do ambiente</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sinais de atividade, conectividade e preview em uma unica tela.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
              Sessao segura
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              Runtime pronto
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Atividade IA</div>
          <p className="mt-3 text-3xl font-semibold text-sky-300">{aiActivity}</p>
          <p className="mt-2 text-xs text-slate-400">Planos, execucoes e revisoes no studio.</p>
        </div>
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Projetos ativos</div>
          <p className="mt-3 text-3xl font-semibold text-emerald-300">
            {projects.filter((project) => project.status === 'active').length}
          </p>
          <p className="mt-2 text-xs text-slate-400">Fluxos em andamento e builds recentes.</p>
        </div>
        <div className="aethel-card aethel-p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Preview ao vivo</div>
          <p className="mt-3 text-3xl font-semibold text-cyan-300">
            {livePreviewSuggestions.length} sugestoes
          </p>
          <p className="mt-2 text-xs text-slate-400">Ideias prontas para testar agora.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-items-center aethel-justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Carteira</p>
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
              <span className="text-xs text-slate-500">
                Atualizado - {new Date(lastWalletUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="mt-4">
            {!authReady && <p className="text-sm text-slate-400">Verificando sessao...</p>}
            {authReady && !hasToken && (
              <p className="text-sm text-slate-400">Faca login para visualizar seu saldo.</p>
            )}
            {authReady && hasToken && walletLoading && (
              <p className="text-sm text-slate-400">Carregando carteira...</p>
            )}
            {authReady && hasToken && walletError && (
              <p className="text-sm text-red-400">
                {walletError instanceof APIError && walletError.status === 401
                  ? 'Sessao expirada. Entre novamente.'
                  : 'Nao foi possivel carregar os dados da carteira.'}
              </p>
            )}
            {authReady && hasToken && !walletLoading && !walletError && walletData && (
              <>
                <p className="text-3xl font-semibold text-slate-100">
                  {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {walletTransactions.length} transacoes registradas
                </p>
                <ul className="mt-4 space-y-3">
                  {walletTransactions.slice(-3).reverse().map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="aethel-flex aethel-justify-between aethel-items-center">
                        <span className="text-sm font-medium">
                          {entry.reference || entry.entry_type.toUpperCase()}
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            entry.entry_type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {entry.entry_type === 'credit' ? '+' : '-'}
                          {entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                        </span>
                      </div>
                      <div className="aethel-flex aethel-justify-between aethel-items-center mt-1">
                        <span className="text-xs text-slate-400">
                          Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '-'}{' '}
                          {formatCurrencyLabel(entry.currency)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                  {walletTransactions.length === 0 && (
                    <li className="text-sm text-slate-400">Nenhuma transacao registrada.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Infra</p>
              <h3 className="text-lg font-semibold">Status de conectividade</h3>
            </div>
            {connectivityData && (
              <span
                className={`text-xs rounded-full px-3 py-1 border ${
                  connectivityData.overall_status === 'healthy'
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                    : connectivityData.overall_status === 'degraded'
                    ? 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                    : 'border-red-500/30 bg-red-500/20 text-red-300'
                }`}
              >
                {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-4">
            {connectivityLoading && <p className="text-sm text-slate-400">Monitorando servicos...</p>}
            {connectivityError && (
              <p className="text-sm text-red-400">Falha ao consultar conectividade.</p>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length === 0 && (
              <p className="text-sm text-slate-400">Nenhum servico configurado.</p>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length > 0 && (
              <div className="space-y-3">
                {connectivityServices.map((service) => (
                  <div key={service.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="aethel-flex aethel-justify-between aethel-items-center">
                      <span className="text-sm font-medium capitalize">
                        {service.name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 ${
                          service.status === 'healthy'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : service.status === 'degraded'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {formatConnectivityStatus(service.status).toUpperCase()}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {service.endpoints.slice(0, 3).map((endpoint) => (
                        <li key={`${service.name}-${endpoint.url}`} className="aethel-flex aethel-justify-between text-xs">
                          <span className={endpoint.healthy ? 'text-emerald-300' : 'text-red-300'}>
                            {endpoint.url}
                          </span>
                          <span className="text-slate-400">
                            {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)}ms` : '-'}
                          </span>
                        </li>
                      ))}
                      {service.endpoints.length > 3 && (
                        <li className="text-xs text-slate-500">
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Preview</p>
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
