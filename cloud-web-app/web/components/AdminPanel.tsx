import React, { useState } from 'react'
import useSWR from 'swr'
import { Users, CreditCard, DollarSign, Activity, Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'

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
      toast.success(`Créditos ajustados com sucesso. Novo saldo: $${result.new_balance}`)
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error adjusting credits:', error)
      toast.error('Falha ao ajustar créditos')
    }
  }

  const handleSuspendUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: false })
      })

      if (!response.ok) throw new Error('Falha ao suspender usuário')

      toast.success('Usuário suspenso com sucesso')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error suspending user:', error)
      toast.error('Falha ao suspender usuário')
    }
  }

  const handleActivateUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: true })
      })

      if (!response.ok) throw new Error('Falha ao ativar usuário')

      toast.success('Usuário ativado com sucesso')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Erro ao ativar usuário:', error)
      toast.error('Falha ao ativar usuário')
    }
  }

  return (
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-text-center">
        <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Painel Administrativo</h2>
        <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
          Gerencie usuários, créditos, planos e métricas do sistema. Controle administrativo completo da plataforma Aethel.
        </p>
      </div>

      {/* Admin Navigation */}
      <div className="aethel-flex aethel-space-x-1 aethel-bg-slate-800 aethel-p-1 aethel-rounded-lg aethel-max-w-2xl aethel-mx-auto">
        {[
          { id: 'overview', label: 'Visão Geral', icon: '' },
          { id: 'users', label: 'Usuários', icon: '' },
          { id: 'credits', label: 'Créditos', icon: '' },
          { id: 'financial', label: 'Financeiro', icon: '' },
          { id: 'system', label: 'Sistema', icon: '' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={`aethel-flex-1 aethel-py-2 aethel-px-3 aethel-rounded-md aethel-text-sm aethel-font-medium aethel-transition ${
              activeAdminTab === tab.id
                ? 'aethel-bg-indigo-600 aethel-text-white'
                : 'aethel-text-slate-400 hover:aethel-text-white hover:aethel-bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === 'overview' && (
        <>
          {/* Admin Stats Overview */}
          <div className="aethel-grid aethel-grid-cols-1 md:aethel-grid-cols-4 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Total de Usuários</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">{currentStats.total_users.toLocaleString()}</p>
                  <p className="aethel-text-xs aethel-text-green-400 aethel-mt-1">Ativos: {currentStats.active_users}</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-blue-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Users className="w-6 h-6 aethel-text-blue-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Total de Créditos</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">${currentStats.total_credits.toFixed(2)}</p>
                  <p className="aethel-text-xs aethel-text-green-400 aethel-mt-1">Todos os usuários</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-green-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <CreditCard className="w-6 h-6 aethel-text-green-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Receita Mensal</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">${currentStats.monthly_revenue.toFixed(2)}</p>
                  <p className="aethel-text-xs aethel-text-yellow-400 aethel-mt-1">Este mês</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-yellow-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <DollarSign className="w-6 h-6 aethel-text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Chamadas API Hoje</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">{currentStats.api_calls_today.toLocaleString()}</p>
                  <p className="aethel-text-xs aethel-text-purple-400 aethel-mt-1">Sessões ativas: {currentStats.active_sessions}</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-purple-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Activity className="w-6 h-6 aethel-text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="aethel-card aethel-p-6">
            <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-4">Atividade Recente</h3>
            <div className="aethel-space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-3 aethel-rounded-lg aethel-bg-slate-800/50">
                  <div className={`aethel-w-8 aethel-h-8 aethel-rounded-full aethel-flex aethel-items-center aethel-justify-center ${
                    transaction.type === 'usage' ? 'aethel-bg-red-500/20' :
                    transaction.type === 'purchase' ? 'aethel-bg-green-500/20' :
                    'aethel-bg-blue-500/20'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      transaction.type === 'usage' ? 'aethel-text-red-400' :
                      transaction.type === 'purchase' ? 'aethel-text-green-400' :
                      'aethel-text-blue-400'
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
                  <div className="aethel-flex-1">
                    <p className="aethel-text-sm aethel-font-medium">{transaction.description}</p>
                    <p className="aethel-text-xs aethel-text-slate-400">{transaction.userEmail} • {new Date(transaction.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`aethel-text-sm aethel-font-medium ${
                    transaction.amount > 0 ? 'aethel-text-green-400' : 'aethel-text-red-400'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeAdminTab === 'users' && (
        <div className="aethel-space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-xl aethel-font-semibold">User Management</h3>
            <div className="aethel-flex aethel-gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white aethel-text-sm"
              />
              <button className="aethel-button aethel-button-primary">Add New User</button>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <div className="aethel-overflow-x-auto">
              <table className="aethel-w-full aethel-text-sm">
                <thead>
                  <tr className="aethel-border-b aethel-border-slate-700">
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">User</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Credits</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Status</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Admin</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Created</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: User) => (
                    <tr key={user.id} className="aethel-border-b aethel-border-slate-800">
                      <td className="aethel-py-3 aethel-px-4">
                        <div>
                          <p className="aethel-font-medium aethel-text-white">{user.email}</p>
                          <p className="aethel-text-xs aethel-text-slate-400">ID: {user.id}</p>
                        </div>
                      </td>
                      <td className="aethel-py-3 aethel-px-4">
                        <span className="aethel-font-medium">${user.credits_usd.toFixed(2)}</span>
                        {user.api_key && <span className="aethel-text-xs aethel-text-green-400 aethel-ml-2">API</span>}
                      </td>
                      <td className="aethel-py-3 aethel-px-4">
                        <span className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${
                          user.is_active ? 'aethel-bg-green-500/20 aethel-text-green-400' :
                          'aethel-bg-red-500/20 aethel-text-red-400'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="aethel-py-3 aethel-px-4">
                        {user.is_admin && (
                          <span className="aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs aethel-bg-purple-500/20 aethel-text-purple-400">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="aethel-py-3 aethel-px-4">
                        <div className="aethel-flex aethel-space-x-2">
                          <button
                            onClick={() => {
                              const amount = prompt('Digite os créditos a adicionar:');
                              if (amount) handleAddCredits(user.id, parseFloat(amount));
                            }}
                            className="aethel-text-xs aethel-bg-blue-500/20 aethel-text-blue-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-blue-500/30"
                          >
                            Adicionar Créditos
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleSuspendUser(user.id)}
                              className="aethel-text-xs aethel-bg-red-500/20 aethel-text-red-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-red-500/30"
                            >
                              Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-green-500/30"
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
            <div className="aethel-flex aethel-justify-between aethel-items-center aethel-mt-4">
              <span className="aethel-text-sm aethel-text-slate-400">
                Mostrando {users.length} de {totalUsers} usuários
              </span>
              <div className="aethel-flex aethel-gap-2">
                <button
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-bg-slate-700 aethel-text-white aethel-rounded disabled:aethel-opacity-50"
                >
                  Anterior
                </button>
                <span className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-text-slate-400">
                  Página {userPage}
                </span>
                <button
                  onClick={() => setUserPage(userPage + 1)}
                  disabled={users.length < 20}
                  className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-bg-slate-700 aethel-text-white aethel-rounded disabled:aethel-opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'credits' && (
        <div className="aethel-space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-xl aethel-font-semibold">Gerenciamento de Créditos</h3>
            <button className="aethel-button aethel-button-primary">Operação de Créditos em Lote</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Alocação de Créditos</h4>
              <div className="aethel-space-y-4">
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">E-mail do Usuário</label>
                  <input
                    type="email"
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white"
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">Créditos a Adicionar</label>
                  <input
                    type="number"
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">Motivo</label>
                  <textarea
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white aethel-h-20"
                    placeholder="Motivo para alocação de créditos"
                  />
                </div>
                <button className="aethel-button aethel-button-primary aethel-w-full">Adicionar Créditos</button>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Análise de Créditos</h4>
              <div className="aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Média de Créditos por Usuário</span>
                  <span className="aethel-font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Créditos Usados Hoje</span>
                  <span className="aethel-font-semibold">45,231</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Maior Consumidor (Este Mês)</span>
                  <span className="aethel-font-semibold">user@company.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Transações de Créditos Recentes</h4>
            <div className="aethel-overflow-x-auto">
              <table className="aethel-w-full aethel-text-sm">
                <thead>
                  <tr className="aethel-border-b aethel-border-slate-700">
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Usuário</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Tipo</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Valor</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Descrição</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="aethel-border-b aethel-border-slate-800">
                      <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">{transaction.userEmail}</td>
                      <td className="aethel-py-3 aethel-px-4">
                        <span className={`aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs ${
                          transaction.type === 'usage' ? 'aethel-bg-red-500/20 aethel-text-red-400' :
                          transaction.type === 'purchase' ? 'aethel-bg-green-500/20 aethel-text-green-400' :
                          'aethel-bg-blue-500/20 aethel-text-blue-400'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={`aethel-py-3 aethel-px-4 aethel-font-medium ${
                        transaction.amount > 0 ? 'aethel-text-green-400' : 'aethel-text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </td>
                      <td className="aethel-py-3 aethel-px-4">{transaction.description}</td>
                      <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'financial' && (
        <div className="aethel-space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-xl aethel-font-semibold">Gestão Financeira</h3>
            <button className="aethel-button aethel-button-primary">Gerar Relatório</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-3 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Detalhamento de Receita</h4>
              <div className="aethel-space-y-3">
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Basic Plan ($19)</span>
                  <span className="aethel-font-semibold">$15,200</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Plus Plan ($39)</span>
                  <span className="aethel-font-semibold">$21,600</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Pro Plan ($199)</span>
                  <span className="aethel-font-semibold">$8,500</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-border-t aethel-border-slate-700 aethel-pt-3">
                  <span className="aethel-text-sm aethel-font-medium">Total</span>
                  <span className="aethel-font-bold aethel-text-green-400">$45,300</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Métodos de Pagamento</h4>
              <div className="aethel-space-y-3">
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Cartão de Crédito</span>
                  <span className="aethel-font-semibold">68%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">PayPal</span>
                  <span className="aethel-font-semibold">22%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Transferência Bancária</span>
                  <span className="aethel-font-semibold">10%</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Pagamentos Falhados</h4>
              <div className="aethel-text-center">
                <div className="aethel-text-3xl aethel-font-bold aethel-text-red-400 aethel-mb-2">2.3%</div>
                <p className="aethel-text-sm aethel-text-slate-400">Taxa de falha este mês</p>
                <p className="aethel-text-xs aethel-text-slate-500 aethel-mt-2">127 falharam de 5.421 tentativas</p>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Pagamentos Recentes</h4>
            <div className="aethel-overflow-x-auto">
              <table className="aethel-w-full aethel-text-sm">
                <thead>
                  <tr className="aethel-border-b aethel-border-slate-700">
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Usuário</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Plano</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Valor</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Status</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="aethel-border-b aethel-border-slate-800">
                    <td className="aethel-py-3 aethel-px-4">john.doe@example.com</td>
                    <td className="aethel-py-3 aethel-px-4">Plano Plus</td>
                    <td className="aethel-py-3 aethel-px-4">$39.00</td>
                    <td className="aethel-py-3 aethel-px-4">
                      <span className="aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400">
                        Concluído
                      </span>
                    </td>
                    <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">2025-01-25</td>
                  </tr>
                  <tr className="aethel-border-b aethel-border-slate-800">
                    <td className="aethel-py-3 aethel-px-4">jane.smith@example.com</td>
                    <td className="aethel-py-3 aethel-px-4">Plano Básico</td>
                    <td className="aethel-py-3 aethel-px-4">$19.00</td>
                    <td className="aethel-py-3 aethel-px-4">
                      <span className="aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400">
                        Concluído
                      </span>
                    </td>
                    <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">2025-01-24</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'system' && (
        <div className="aethel-space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-xl aethel-font-semibold">Gestão do Sistema</h3>
            <button className="aethel-button aethel-button-primary">Configurações do Sistema</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Status dos Servidores</h4>
              <div className="aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-green-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="aethel-w-3 aethel-h-3 aethel-bg-green-400 aethel-rounded-full"></div>
                    <span>API Server</span>
                  </div>
                  <span className="aethel-text-sm aethel-text-green-400">99.9% uptime</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-green-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="aethel-w-3 aethel-h-3 aethel-bg-green-400 aethel-rounded-full"></div>
                    <span>Database</span>
                  </div>
                  <span className="aethel-text-sm aethel-text-green-400">99.8% uptime</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-yellow-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="aethel-w-3 aethel-h-3 aethel-bg-yellow-400 aethel-rounded-full"></div>
                    <span>AI Service</span>
                  </div>
                  <span className="aethel-text-sm aethel-text-yellow-400">98.5% uptime</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Métricas do Sistema</h4>
              <div className="aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Uso de CPU</span>
                  <span className="aethel-font-semibold">45%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Uso de Memória</span>
                  <span className="aethel-font-semibold">67%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Conexões Ativas</span>
                  <span className="aethel-font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Tamanho da Fila</span>
                  <span className="aethel-font-semibold">23</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Logs do Sistema</h4>
            <div className="aethel-bg-slate-900 aethel-rounded aethel-p-4 aethel-font-mono aethel-text-sm aethel-max-h-96 aethel-overflow-y-auto">
              <div className="aethel-space-y-1">
                <div className="aethel-text-green-400">[2025-01-25 10:30:15] INFO: User authentication successful - user_12345</div>
                <div className="aethel-text-blue-400">[2025-01-25 10:30:12] INFO: Credit transaction processed - amount: 247</div>
                <div className="aethel-text-yellow-400">[2025-01-25 10:29:58] WARN: High memory usage detected on server-3</div>
                <div className="aethel-text-green-400">[2025-01-25 10:29:45] INFO: AI model inference completed - duration: 2.3s</div>
                <div className="aethel-text-blue-400">[2025-01-25 10:29:30] INFO: Database backup completed successfully</div>
                <div className="aethel-text-red-400">[2025-01-25 10:28:15] ERROR: Failed payment attempt - insufficient funds</div>
                <div className="aethel-text-green-400">[2025-01-25 10:28:01] INFO: New user registration - john.doe@example.com</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}