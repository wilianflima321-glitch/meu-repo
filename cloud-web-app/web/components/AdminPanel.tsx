import React, { useState } from 'react'
import useSWR from 'swr'
import { Users, CreditCard, DollarSign, Activity, Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { openPromptDialog } from '@/lib/ui/non-blocking-dialogs'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

interface User {
  id: number
  email: string
  is_active: boolean
  is_admin: boolean
  credits_usd: number
  created_at: string | null
  last_login: string | null
  api_key: boolean
}

interface CreditTransaction {
  id: string
  userId: string
  userEmail: string
  type: 'usage' | 'purchase' | 'bonus' | 'refund'
  amount: number
  description: string
  timestamp: string
}

interface AdminStats {
  total_users: number
  active_users: number
  admin_users: number
  total_credits: number
  monthly_revenue: number
  active_sessions: number
  api_calls_today: number
  error_rate: number
}

const API_BASE_URL = API_BASE

const fetcher = (url: string) => {
  const headers = authHeaders() as Record<string, string>
  return fetch(url, { headers }).then(res => res.json())
}

const PANEL_CLASS = 'rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-6 shadow-[0_18px_48px_rgba(2,6,23,0.18)]'
const BUTTON_PRIMARY_CLASS = `inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-xs font-semibold text-[var(--aethel-text-inverse)] shadow-[0_14px_32px_rgba(56,189,248,0.24)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`
const BUTTON_SECONDARY_CLASS = `inline-flex items-center justify-center rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] px-4 py-2 text-xs font-semibold text-[var(--aethel-text-secondary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] disabled:cursor-not-allowed disabled:opacity-50`
const INPUT_CLASS = `rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`

export default function AdminPanel() {
  const toast = useToast()
  const recentTransactions: CreditTransaction[] = []
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'users' | 'credits' | 'financial' | 'system'>('overview')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)

  // API calls using SWR
  const { data: adminStats, error: statsError } = useSWR<AdminStats>(`${API_BASE_URL}/admin/overview`, fetcher)
  const { data: usersData, error: usersError, mutate: mutateUsers } = useSWR(
  `${API_BASE_URL}/admin/users?page=${userPage}&limit=20&search=${userSearch}`,
    fetcher
  )
  const { data: financialData, error: financialError } = useSWR(`${API_BASE_URL}/admin/financial`, fetcher)
  const { data: systemData, error: systemError } = useSWR(`${API_BASE_URL}/admin/system`, fetcher)

  // Fallback data
  const fallbackStats: AdminStats = {
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    total_credits: 0,
    monthly_revenue: 0,
    active_sessions: 0,
    api_calls_today: 0,
    error_rate: 0
  }

  const currentStats = adminStats || fallbackStats
  const users = usersData?.users || []
  const totalUsers = usersData?.total || 0

  const handleAddCredits = async (userId: number, amount: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ amount, reason: 'Admin adjustment' })
      })

      if (!response.ok) throw new Error('Failed to adjust credits')

      const result = await response.json()
      toast.success(`Creditos ajustados com sucesso. Novo saldo: $${result.new_balance}`)
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error adjusting credits:', error)
      toast.error('Falha ao ajustar creditos')
    }
  }

  const handleSuspendUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: false })
      })

      if (!response.ok) throw new Error('Falha ao suspender usuario')

      toast.success('Usuario suspenso com sucesso')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Falha ao suspender usuario')
    }
  }

  const handleActivateUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: true })
      })

      if (!response.ok) throw new Error('Falha ao ativar usuario')

      toast.success('Usuario ativado com sucesso')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Erro ao ativar usuario:', error)
      toast.error('Falha ao ativar usuario')
    }
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className={PANEL_CLASS}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Admin Studio</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Painel administrativo</h2>
            <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
              Controle usuarios, creditos, planos e indicadores do sistema.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
              Acesso restrito
            </span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-success-light)]">
              Auditoria ativa
            </span>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-2 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'Visao geral', icon: '' },
            { id: 'users', label: 'Usuarios', icon: '' },
            { id: 'credits', label: 'Creditos', icon: '' },
            { id: 'financial', label: 'Financeiro', icon: '' },
            { id: 'system', label: 'Sistema', icon: '' }
          ].map((tab) => (
            <button type="button" aria-label={`Abrir aba administrativa ${tab.label}`}
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold ${CANONICAL_MOTION} ${CANONICAL_FOCUS} ${
                activeAdminTab === tab.id
                  ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-inverse)] shadow-[0_12px_28px_rgba(79,70,229,0.22)]'
                  : 'border border-transparent bg-transparent text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeAdminTab === 'overview' && (
        <>
          {/* Admin Stats Overview */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Total de Usuarios</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{currentStats.total_users.toLocaleString()}</p>
                  <p className="text-xs text-[var(--aethel-success-light)] mt-1">Ativos: {currentStats.active_users}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
                  <Users className="w-6 h-6 text-[var(--aethel-info-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Total de Creditos</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">${currentStats.total_credits.toFixed(2)}</p>
                  <p className="text-xs text-[var(--aethel-success-light)] mt-1">Todos os usuarios</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]">
                  <CreditCard className="w-6 h-6 text-[var(--aethel-success-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Receita Mensal</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">${currentStats.monthly_revenue.toFixed(2)}</p>
                  <p className="text-xs text-[var(--aethel-warning-light)] mt-1">Este mes</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]">
                  <DollarSign className="w-6 h-6 text-[var(--aethel-warning-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Chamadas API Hoje</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{currentStats.api_calls_today.toLocaleString()}</p>
                  <p className="text-xs text-[var(--aethel-info-light)] mt-1">Sessoes ativas: {currentStats.active_sessions}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
                  <Activity className="w-6 h-6 text-[var(--aethel-info-light)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={PANEL_CLASS}>
            <h3 className={`${CANONICAL_TYPOGRAPHY.h2} mb-4`}>Atividade Recente</h3>
            {recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-6 py-12 text-center text-sm text-[var(--aethel-text-secondary)]">Nenhuma atividade recente.</div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      transaction.type === 'usage' ? 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]' :
                      transaction.type === 'purchase' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]' :
                      'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]'
                    }`}>
                      <svg className={`w-4 h-4 ${
                        transaction.type === 'usage' ? 'text-[var(--aethel-error-light)]' :
                        transaction.type === 'purchase' ? 'text-[var(--aethel-success-light)]' :
                        'text-[var(--aethel-info-light)]'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {transaction.type === 'usage' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        ) : transaction.type === 'purchase' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-[var(--aethel-text-tertiary)]">{transaction.userEmail} - {new Date(transaction.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-sm font-medium ${
                      transaction.amount > 0 ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeAdminTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Gestao de usuarios</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={`${INPUT_CLASS} w-64`}
                aria-label="Buscar usuarios"
              />
              <button type="button" aria-label="Criar novo usuario" className={BUTTON_PRIMARY_CLASS}>Novo usuario</button>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-left py-3 px-4">Creditos</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Admin</th>
                    <th className="text-left py-3 px-4">Criado</th>
                    <th className="text-left py-3 px-4">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: User) => (
                    <tr key={user.id} className="border-b border-[var(--aethel-border-primary)]">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--aethel-text-primary)]">{user.email}</p>
                          <p className="text-xs text-[var(--aethel-text-tertiary)]">ID: {user.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">${user.credits_usd.toFixed(2)}</span>
                        {user.api_key && <span className="text-xs text-[var(--aethel-success-light)] ml-2">API</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded-full px-2 py-1 text-xs ${
                          user.is_active ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]' :
                          'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.is_admin && (
                          <span className="rounded-full px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button type="button" aria-label={`Adicionar creditos para ${user.email}`}
                            onClick={async () => {
                              const amount = await openPromptDialog({
                                title: 'Adicionar creditos',
                                message: 'Digite os creditos a adicionar:',
                                placeholder: '100',
                                confirmText: 'Adicionar',
                                cancelText: 'Cancelar',
                              });
                              if (!amount) return;
                              const parsed = Number.parseFloat(amount);
                              if (Number.isNaN(parsed)) {
                                toast.error('Valor invalido para creditos');
                                return;
                              }
                              handleAddCredits(user.id, parsed);
                            }}
                            className={BUTTON_SECONDARY_CLASS}
                          >
                            Adicionar Creditos
                          </button>
                          {user.is_active ? (
                            <button type="button" aria-label={`Suspender usuario ${user.email}`}
                              onClick={() => handleSuspendUser(user.id)}
                              className={`${BUTTON_SECONDARY_CLASS} border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] text-[var(--aethel-error-light)]`}
                            >
                              Suspender
                            </button>
                          ) : (
                            <button type="button" aria-label={`Ativar usuario ${user.email}`}
                              onClick={() => handleActivateUser(user.id)}
                              className={BUTTON_SECONDARY_CLASS}
                            >
                              Ativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--aethel-text-tertiary)]">
                Mostrando {users.length} de {totalUsers} usuarios
              </span>
              <div className="flex gap-2">
                <button type="button" aria-label="Ir para a pagina anterior de usuarios"
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className={BUTTON_SECONDARY_CLASS}
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-[var(--aethel-text-tertiary)]">
                  Pagina {userPage}
                </span>
                <button type="button" aria-label="Ir para a proxima pagina de usuarios"
                  onClick={() => setUserPage(userPage + 1)}
                  disabled={users.length < 20}
                  className={BUTTON_SECONDARY_CLASS}
                >
                  Proxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'credits' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Gerenciamento de creditos</h3>
            <button type="button" aria-label="Executar operacao de creditos em lote" className={BUTTON_PRIMARY_CLASS}>Operacao de creditos em lote</button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Alocacao de Creditos</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">E-mail do Usuario</label>
                  <input type="email" className={INPUT_CLASS} placeholder="usuario@exemplo.com" aria-label="E-mail do usuario para alocacao de creditos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Creditos a Adicionar</label>
                  <input type="number" className={INPUT_CLASS} placeholder="1000" aria-label="Quantidade de creditos a adicionar" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Motivo</label>
                  <textarea className={`${INPUT_CLASS} h-20`} placeholder="Motivo para alocacao de creditos" aria-label="Motivo para alocacao de creditos" />
                </div>
                <button type="button" aria-label="Adicionar creditos manualmente" className={`${BUTTON_PRIMARY_CLASS} w-full`}>Adicionar Creditos</button>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Analise de Creditos</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <span className="text-sm">Media de Creditos por Usuario</span>
                  <span className="font-semibold">1,247</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <span className="text-sm">Creditos Usados Hoje</span>
                  <span className="font-semibold">45,231</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <span className="text-sm">Maior Consumidor (Este Mes)</span>
                  <span className="font-semibold">user@company.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <h4 className="text-lg font-semibold mb-4">Transacoes de Creditos Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Descricao</th>
                    <th className="text-left py-3 px-4">Horario</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--aethel-text-tertiary)]">
                        Nenhuma transacao registrada.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-[var(--aethel-border-primary)]">
                        <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">{transaction.userEmail}</td>
                        <td className="py-3 px-4">
                          <span className={`rounded-full px-2 py-1 text-xs ${
                            transaction.type === 'usage' ? 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]' :
                            transaction.type === 'purchase' ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]' :
                            'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className={`py-3 px-4 font-medium ${
                          transaction.amount > 0 ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </td>
                        <td className="py-3 px-4">{transaction.description}</td>
                        <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">
                          {new Date(transaction.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'financial' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Gestao financeira</h3>
            <button type="button" aria-label="Gerar relatorio financeiro" className={BUTTON_PRIMARY_CLASS}>Gerar relatorio</button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Detalhamento de Receita</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Starter ($19)</span>
                  <span className="font-semibold">$15,200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Pro ($49)</span>
                  <span className="font-semibold">$21,600</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Studio ($99)</span>
                  <span className="font-semibold">$8,500</span>
                </div>
                <div className="flex justify-between border-t border-[var(--aethel-border-primary)] pt-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-[var(--aethel-success-light)]">$45,300</span>
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Metodos de Pagamento</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Cartao de credito</span>
                  <span className="font-semibold">68%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">PayPal</span>
                  <span className="font-semibold">22%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Transferencia bancaria</span>
                  <span className="font-semibold">10%</span>
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Pagamentos Falhados</h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--aethel-error-light)] mb-2">2.3%</div>
                <p className="text-sm text-[var(--aethel-text-tertiary)]">Taxa de falha este mes</p>
                <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">127 falharam de 5.421 tentativas</p>
              </div>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <h4 className="text-lg font-semibold mb-4">Pagamentos Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-left py-3 px-4">Plano</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <td className="py-3 px-4">john.doe@example.com</td>
                    <td className="py-3 px-4">Plano Pro</td>
                    <td className="py-3 px-4">$39.00</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
                        Concluido
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">2025-01-25</td>
                  </tr>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <td className="py-3 px-4">jane.smith@example.com</td>
                    <td className="py-3 px-4">Plano Starter</td>
                    <td className="py-3 px-4">$19.00</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
                        Concluido
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">2025-01-24</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'system' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Gestao do sistema</h3>
            <button type="button" aria-label="Abrir configuracoes do sistema" className={BUTTON_PRIMARY_CLASS}>Configuracoes do sistema</button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Status dos Servidores</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded-full"></div>
                    <span>API Server</span>
                  </div>
                  <span className="text-sm text-[var(--aethel-success-light)]">99.9% uptime</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] rounded-full"></div>
                    <span>Database</span>
                  </div>
                  <span className="text-sm text-[var(--aethel-success-light)]">99.8% uptime</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] rounded-full"></div>
                    <span>AI Service</span>
                  </div>
                  <span className="text-sm text-[var(--aethel-warning-light)]">98.5% uptime</span>
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Metricas do sistema</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Uso de CPU</span>
                  <span className="font-semibold">45%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Uso de Memoria</span>
                  <span className="font-semibold">67%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Conexoes Ativas</span>
                  <span className="font-semibold">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--aethel-text-tertiary)]">Tamanho da Fila</span>
                  <span className="font-semibold">23</span>
                </div>
              </div>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <h4 className="text-lg font-semibold mb-4">Logs do Sistema</h4>
            <div className="max-h-96 overflow-y-auto rounded-xl bg-[var(--aethel-surface-secondary)] p-4 font-mono text-sm">
              <div className="space-y-1">
                <div className="text-[var(--aethel-success-light)]">[2025-01-25 10:30:15] INFO: User authentication successful - user_12345</div>
                <div className="text-[var(--aethel-info-light)]">[2025-01-25 10:30:12] INFO: Credit transaction processed - amount: 247</div>
                <div className="text-[var(--aethel-warning-light)]">[2025-01-25 10:29:58] WARN: High memory usage detected on server-3</div>
                <div className="text-[var(--aethel-success-light)]">[2025-01-25 10:29:45] INFO: AI model inference completed - duration: 2.3s</div>
                <div className="text-[var(--aethel-info-light)]">[2025-01-25 10:29:30] INFO: Database backup completed successfully</div>
                <div className="text-[var(--aethel-error-light)]">[2025-01-25 10:28:15] ERROR: Failed payment attempt - insufficient funds</div>
                <div className="text-[var(--aethel-success-light)]">[2025-01-25 10:28:01] INFO: New user registration - john.doe@example.com</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
