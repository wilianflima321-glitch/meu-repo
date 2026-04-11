'use client'

import React, { useState } from 'react'
import {
  TrendingUp, AlertTriangle, Shield, Zap,
  CreditCard, Activity, RefreshCw,
  CheckCircle, XCircle
} from 'lucide-react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

interface AdminMetric {
  label: string
  value: string | number
  change: number
  status: 'up' | 'down' | 'stable'
}

interface SecurityEvent {
  id: string
  type: 'login' | 'api_call' | 'permission_change' | 'data_access'
  user: string
  timestamp: string
  status: 'success' | 'failed' | 'suspicious'
}

type OpsAction = 'backup' | 'cache_flush' | 'logs_export' | 'feature_flags'

type OpsNotice = {
  type: 'success' | 'error'
  message: string
}

export default function AdminDashboardPro() {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'security' | 'ops'>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [runningAction, setRunningAction] = useState<OpsAction | null>(null)
  const [opsNotice, setOpsNotice] = useState<OpsNotice | null>(null)

  const metrics: AdminMetric[] = [
    { label: 'Usuarios totais', value: '2,847', change: 12.5, status: 'up' },
    { label: 'Projetos ativos', value: '1,234', change: 8.3, status: 'up' },
    { label: 'Requisicoes API (24h)', value: '2.3M', change: -2.1, status: 'down' },
    { label: 'Saude do sistema', value: '99.8%', change: 0.2, status: 'stable' }
  ]

  const securityEvents: SecurityEvent[] = [
    { id: '1', type: 'login', user: 'user@example.com', timestamp: '2 min atras', status: 'success' },
    { id: '2', type: 'api_call', user: 'api-key-xxxxx', timestamp: '5 min atras', status: 'success' },
    { id: '3', type: 'permission_change', user: 'admin@aethel.ai', timestamp: '12 min atras', status: 'success' },
    { id: '4', type: 'data_access', user: 'unknown-ip', timestamp: '18 min atras', status: 'suspicious' }
  ]

  const eventLabels: Record<SecurityEvent['type'], string> = {
    login: 'Login',
    api_call: 'Chamada API',
    permission_change: 'Mudanca de permissao',
    data_access: 'Acesso a dados',
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  const runOpsAction = async (action: OpsAction) => {
    if (runningAction) return
    setRunningAction(action)
    setOpsNotice(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 900))
      const labels: Record<OpsAction, string> = {
        backup: 'Backup de database enfileirado.',
        cache_flush: 'Cache flush solicitado.',
        logs_export: 'Exportacao de logs iniciada. Verifique downloads em instantes.',
        feature_flags: 'Feature flags sincronizadas.',
      }
      setOpsNotice({ type: 'success', message: labels[action] })
    } catch {
      setOpsNotice({ type: 'error', message: 'Falha ao executar operacao. Tente novamente.' })
    } finally {
      setRunningAction(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Admin Console</h1>
          <p className="text-xs text-[var(--aethel-text-tertiary)] font-medium uppercase tracking-widest mt-1">Centro de operacoes</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className={`rounded-lg bg-[var(--aethel-surface-tertiary)] p-2 hover:bg-[var(--aethel-surface-quaternary)] disabled:opacity-50 ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
          aria-label="Atualizar painel"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] overflow-x-auto">
        {(['overview', 'billing', 'security', 'ops'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-label={`Abrir aba ${tab === 'overview' ? 'visao geral' : tab === 'billing' ? 'faturamento' : tab === 'security' ? 'seguranca' : 'operacoes'}`}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap ${CANONICAL_MOTION} ${CANONICAL_FOCUS} ${
              activeTab === tab
                ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                : 'bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
            }`}
          >
            {tab === 'overview' && <Activity className="inline mr-2" size={14} />}
            {tab === 'billing' && <CreditCard className="inline mr-2" size={14} />}
            {tab === 'security' && <Shield className="inline mr-2" size={14} />}
            {tab === 'ops' && <Zap className="inline mr-2" size={14} />}
            {tab === 'overview' && 'Visao geral'}
            {tab === 'billing' && 'Faturamento'}
            {tab === 'security' && 'Seguranca'}
            {tab === 'ops' && 'Operacoes'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Aba Visao Geral */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, idx) => (
                <div key={idx} className="p-4 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-xl hover:border-[var(--aethel-border-secondary)] transition-colors">
                  <p className="text-xs text-[var(--aethel-text-tertiary)] uppercase font-bold tracking-widest mb-2">{metric.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{metric.value}</p>
                    <div className={`flex items-center gap-1 text-xs font-bold ${
                      metric.status === 'up' ? 'text-[var(--aethel-success)]' :
                      metric.status === 'down' ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'
                    }`}>
                      <TrendingUp size={14} />
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status do Sistema */}
            <div className="p-6 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-2xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-[var(--aethel-primary)]" />
                  Status do sistema
                </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'API Gateway', status: 'online' },
                  { label: 'Database', status: 'online' },
                  { label: 'Cache Layer', status: 'online' },
                  { label: 'Message Queue', status: 'online' }
                ].map((service, idx) => (
                  <div key={idx} className="p-3 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-[var(--aethel-text-tertiary)] uppercase">{service.label}</p>
                      <div className="w-2 h-2 rounded-full bg-[var(--aethel-success)] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <p className="text-xs text-[var(--aethel-success)] font-bold">{service.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="p-6 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-2xl">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-[var(--aethel-warning)]" />
                  Visao geral de faturamento
                </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg">
                  <p className="text-xs text-[var(--aethel-text-tertiary)] uppercase font-bold mb-2">Receita mensal</p>
                  <p className="text-2xl font-bold text-[var(--aethel-warning)]">$47,234</p>
                </div>
                <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg">
                  <p className="text-xs text-[var(--aethel-text-tertiary)] uppercase font-bold mb-2">Assinaturas ativas</p>
                  <p className="text-2xl font-bold text-[var(--aethel-success)]">1,847</p>
                </div>
                <div className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] rounded-lg">
                  <p className="text-xs text-[var(--aethel-text-tertiary)] uppercase font-bold mb-2">Churn</p>
                  <p className="text-2xl font-bold text-[var(--aethel-error)]">2.3%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-6 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-[var(--aethel-primary)]" />
                Eventos de seguranca
              </h2>
              <div className="space-y-3">
                {securityEvents.map(event => (
                  <div key={event.id} className="p-4 bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] rounded-lg hover:border-[var(--aethel-border-secondary)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {event.status === 'success' && <CheckCircle size={16} className="text-[var(--aethel-success)]" />}
                        {event.status === 'failed' && <XCircle size={16} className="text-[var(--aethel-error)]" />}
                        {event.status === 'suspicious' && <AlertTriangle size={16} className="text-[var(--aethel-warning)]" />}
                        <div>
                          <p className="text-sm font-bold text-[var(--aethel-text-primary)]">{eventLabels[event.type]}</p>
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">{event.user}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[var(--aethel-text-quaternary)]">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ops Tab */}
        {activeTab === 'ops' && (
          <div className="space-y-6">
            <div className="p-6 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap size={20} className="text-[var(--aethel-primary)]" />
                Operacoes
              </h2>
              {opsNotice && (
                <div
                  className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                    opsNotice.type === 'success'
                      ? 'border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success-light)]'
                      : 'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[var(--aethel-error)]/10 text-[var(--aethel-error-light)]'
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {opsNotice.message}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button type="button" aria-label="Executar backup de database"
                  onClick={() => runOpsAction('backup')}
                  disabled={runningAction !== null}
                  className={`group rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] p-4 text-left hover:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
                >
                  <p className="text-sm font-bold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-primary)] transition-colors">Backup de database</p>
                  <p className="text-xs text-[var(--aethel-text-quaternary)] mt-1">Ultimo backup: 2 horas</p>
                </button>
                <button type="button" aria-label="Limpar cache do sistema"
                  onClick={() => runOpsAction('cache_flush')}
                  disabled={runningAction !== null}
                  className={`group rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] p-4 text-left hover:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
                >
                  <p className="text-sm font-bold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-primary)] transition-colors">Limpar cache</p>
                  <p className="text-xs text-[var(--aethel-text-quaternary)] mt-1">Limpar dados em cache</p>
                </button>
                <button type="button" aria-label="Exportar logs do sistema"
                  onClick={() => runOpsAction('logs_export')}
                  disabled={runningAction !== null}
                  className={`group rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] p-4 text-left hover:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
                >
                  <p className="text-sm font-bold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-primary)] transition-colors">Exportar logs</p>
                  <p className="text-xs text-[var(--aethel-text-quaternary)] mt-1">Baixar logs do sistema</p>
                </button>
                <button type="button" aria-label="Sincronizar feature flags"
                  onClick={() => runOpsAction('feature_flags')}
                  disabled={runningAction !== null}
                  className={`group rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-secondary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_50%,transparent)] p-4 text-left hover:border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
                >
                  <p className="text-sm font-bold text-[var(--aethel-text-primary)] group-hover:text-[var(--aethel-primary)] transition-colors">Feature Flags</p>
                    <p className="text-xs text-[var(--aethel-text-quaternary)] mt-1">Gerencie os toggles de features</p>
                </button>
              </div>
              {runningAction && (
                <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]" aria-live="polite">
                  Executando operacao...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




