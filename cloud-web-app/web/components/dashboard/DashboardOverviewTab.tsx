import * as THREE from 'three'

import { APIError } from '@/lib/api'
import type { ConnectivityResponse, WalletSummary } from '@/lib/api'

import type { Project } from './aethel-dashboard-model'
import LivePreview from '../LivePreview'

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
  connectivityServices: ConnectivityResponse['services']
  formatConnectivityStatus: (status?: string | null) => string
  miniPreviewExpanded: boolean
  onToggleMiniPreviewExpanded: () => void
  onMagicWandSelect: (position: THREE.Vector3) => void
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
  connectivityServices,
  formatConnectivityStatus,
  miniPreviewExpanded,
  onToggleMiniPreviewExpanded,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: DashboardOverviewTabProps) {
  return (
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-3 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Atividade de IA</h3>
          <p className="aethel-text-2xl aethel-font-bold aethel-text-blue-400">{aiActivity}</p>
        </div>
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Projetos ativos</h3>
          <p className="aethel-text-2xl aethel-font-bold aethel-text-green-400">
            {projects.filter((project) => project.status === 'active').length}
          </p>
        </div>
        <div className="aethel-card aethel-p-6">
          <h3 className="aethel-text-lg aethel-font-semibold aethel-mb-2">Previa ao vivo</h3>
          <p className="aethel-text-2xl aethel-font-bold aethel-text-cyan-400">
            {livePreviewSuggestions.length} sugestoes
          </p>
        </div>
      </div>

      <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-2 aethel-gap-6">
        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-items-center aethel-justify-between">
            <h3 className="aethel-text-lg aethel-font-semibold">Saldo da carteira</h3>
            {authReady && hasToken && (
              <button
                type="button"
                onClick={onRefreshWallet}
                className="aethel-text-xs aethel-border aethel-border-slate-700 aethel-rounded aethel-px-2 aethel-py-1 hover:aethel-border-slate-500"
              >
                Atualizar
              </button>
            )}
            {lastWalletUpdate && (
              <span className="aethel-text-xs aethel-text-slate-400">
                Atualizado - {new Date(lastWalletUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="aethel-mt-4">
            {!authReady && <p className="aethel-text-sm aethel-text-slate-400">Verificando sessao...</p>}
            {authReady && !hasToken && (
              <p className="aethel-text-sm aethel-text-slate-400">Faca login para visualizar seu saldo.</p>
            )}
            {authReady && hasToken && walletLoading && (
              <p className="aethel-text-sm aethel-text-slate-400">Carregando carteira...</p>
            )}
            {authReady && hasToken && walletError && (
              <p className="aethel-text-sm aethel-text-red-400">
                {walletError instanceof APIError && walletError.status === 401
                  ? 'Sessao expirada. Entre novamente.'
                  : 'Nao foi possivel carregar os dados da carteira.'}
              </p>
            )}
            {authReady && hasToken && !walletLoading && !walletError && walletData && (
              <>
                <p className="aethel-text-3xl aethel-font-bold aethel-text-slate-100">
                  {walletData.balance.toLocaleString()} {formatCurrencyLabel(walletData.currency)}
                </p>
                <p className="aethel-text-xs aethel-text-slate-400 aethel-mt-1">
                  {walletTransactions.length} transacoes registradas
                </p>
                <ul className="aethel-mt-4 aethel-space-y-3">
                  {walletTransactions.slice(-3).reverse().map((entry) => (
                    <li key={entry.id} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                      <div className="aethel-flex aethel-justify-between aethel-items-center">
                        <span className="aethel-text-sm aethel-font-medium">
                          {entry.reference || entry.entry_type.toUpperCase()}
                        </span>
                        <span
                          className={`aethel-text-sm aethel-font-semibold ${
                            entry.entry_type === 'credit' ? 'aethel-text-emerald-400' : 'aethel-text-red-400'
                          }`}
                        >
                          {entry.entry_type === 'credit' ? '+' : '-'}
                          {entry.amount.toLocaleString()} {formatCurrencyLabel(entry.currency)}
                        </span>
                      </div>
                      <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-1">
                        <span className="aethel-text-xs aethel-text-slate-400">
                          Saldo: {entry.balance_after != null ? entry.balance_after.toLocaleString() : '-'}{' '}
                          {formatCurrencyLabel(entry.currency)}
                        </span>
                        <span className="aethel-text-xs aethel-text-slate-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                    </li>
                  ))}
                  {walletTransactions.length === 0 && (
                    <li className="aethel-text-sm aethel-text-slate-400">Nenhuma transacao registrada.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>

        <div className="aethel-card aethel-p-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-lg aethel-font-semibold">Status de conectividade</h3>
            {connectivityData && (
              <span
                className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 aethel-border ${
                  connectivityData.overall_status === 'healthy'
                    ? 'aethel-border-emerald-500/30 aethel-bg-emerald-500/20 aethel-text-emerald-300'
                    : connectivityData.overall_status === 'degraded'
                    ? 'aethel-border-amber-500/30 aethel-bg-amber-500/20 aethel-text-amber-300'
                    : 'aethel-border-red-500/30 aethel-bg-red-500/20 aethel-text-red-300'
                }`}
              >
                {formatConnectivityStatus(connectivityData.overall_status).toUpperCase()}
              </span>
            )}
          </div>
          <div className="aethel-mt-4">
            {connectivityLoading && <p className="aethel-text-sm aethel-text-slate-400">Monitorando servicos...</p>}
            {connectivityError && (
              <p className="aethel-text-sm aethel-text-red-400">Falha ao consultar conectividade.</p>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length === 0 && (
              <p className="aethel-text-sm aethel-text-slate-400">Nenhum servico configurado.</p>
            )}
            {!connectivityLoading && !connectivityError && connectivityServices.length > 0 && (
              <div className="aethel-space-y-3">
                {connectivityServices.map((service) => (
                  <div key={service.name} className="aethel-border aethel-border-slate-800 aethel-rounded-lg aethel-p-3">
                    <div className="aethel-flex aethel-justify-between aethel-items-center">
                      <span className="aethel-text-sm aethel-font-medium aethel-capitalize">
                        {service.name.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                          service.status === 'healthy'
                            ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                            : service.status === 'degraded'
                            ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                            : 'aethel-bg-red-500/20 aethel-text-red-300'
                        }`}
                      >
                        {formatConnectivityStatus(service.status).toUpperCase()}
                      </span>
                    </div>
                    <ul className="aethel-mt-2 aethel-space-y-1">
                      {service.endpoints.slice(0, 3).map((endpoint) => (
                        <li key={`${service.name}-${endpoint.url}`} className="aethel-flex aethel-justify-between aethel-text-xs">
                          <span className={endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'}>
                            {endpoint.url}
                          </span>
                          <span className="aethel-text-slate-400">
                            {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)}ms` : '-'}
                          </span>
                        </li>
                      ))}
                      {service.endpoints.length > 3 && (
                        <li className="aethel-text-xs aethel-text-slate-500">
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
        <div className="aethel-flex aethel-items-center aethel-justify-between aethel-mb-4">
          <h3 className="aethel-text-xl aethel-font-semibold">Previa ao vivo</h3>
          <button type="button" onClick={onToggleMiniPreviewExpanded} className="aethel-button aethel-button-ghost aethel-text-sm">
            {miniPreviewExpanded ? 'Recolher' : 'Expandir'}
          </button>
        </div>
        <LivePreview
          onMagicWandSelect={onMagicWandSelect}
          suggestions={livePreviewSuggestions}
          onSendSuggestion={onSendSuggestion}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  )
}
