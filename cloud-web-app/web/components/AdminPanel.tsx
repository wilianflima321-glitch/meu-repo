import React, { useState } from 'react'
import useSWR from 'swr'
import { Users, CreditCard, DollarSign, Activity, Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import { API_BASE } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { openPromptDialog } from '@/lib/ui/non-blocking-dialogs'

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
    <div className="aethel-p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Painel Administrativo</h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Gerencie usuários, créditos, planos e métricas do sistema. Controle administrativo completo da plataforma Aethel.
        </p>
      </div>

      {/* Admin Navigation */}
      <div className="aethel-flex space-x-1 bg-slate-800 aethel-p-1 aethel-rounded-lg max-w-2xl mx-auto">
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
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium aethel-transition ${
              activeAdminTab === tab.id
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === 'overview' && (
        <>
          {/* Admin Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Total de Usuários</h3>
                  <p className="text-2xl font-bold text-white">{currentStats.total_users.toLocaleString()}</p>
                  <p className="text-xs text-green-400 mt-1">Ativos: {currentStats.active_users}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Total de Créditos</h3>
                  <p className="text-2xl font-bold text-white">${currentStats.total_credits.toFixed(2)}</p>
                  <p className="text-xs text-green-400 mt-1">Todos os usuários</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <CreditCard className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Receita Mensal</h3>
                  <p className="text-2xl font-bold text-white">${currentStats.monthly_revenue.toFixed(2)}</p>
                  <p className="text-xs text-yellow-400 mt-1">Este mês</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Chamadas API Hoje</h3>
                  <p className="text-2xl font-bold text-white">{currentStats.api_calls_today.toLocaleString()}</p>
                  <p className="text-xs text-blue-400 mt-1">Sessões ativas: {currentStats.active_sessions}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="aethel-card aethel-p-6">
            <h3 className="text-xl font-semibold mb-4">Atividade Recente</h3>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="aethel-flex aethel-items-center aethel-gap-3 aethel-p-3 aethel-rounded-lg bg-slate-800/50">
                  <div className={`w-8 h-8 rounded-full aethel-flex aethel-items-center aethel-justify-center ${
                    transaction.type === 'usage' ? 'bg-red-500/20' :
                    transaction.type === 'purchase' ? 'bg-green-500/20' :
                    'bg-blue-500/20'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      transaction.type === 'usage' ? 'text-red-400' :
                      transaction.type === 'purchase' ? 'text-green-400' :
                      'text-blue-400'
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
                    <p className="text-xs text-slate-400">{transaction.userEmail} • {new Date(transaction.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-medium ${
                    transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
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
        <div className="space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="text-xl font-semibold">User Management</h3>
            <div className="aethel-flex aethel-gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-slate-800 border border-slate-600 aethel-rounded px-3 py-2 text-white text-sm"
              />
              <button className="aethel-button aethel-button-primary">Add New User</button>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Credits</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Admin</th>
                    <th className="text-left py-3 px-4">Created</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user: User) => (
                    <tr key={user.id} className="border-b border-slate-800">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-white">{user.email}</p>
                          <p className="text-xs text-slate-400">ID: {user.id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">${user.credits_usd.toFixed(2)}</span>
                        {user.api_key && <span className="text-xs text-green-400 ml-2">API</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 aethel-rounded text-xs ${
                          user.is_active ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {user.is_admin && (
                          <span className="px-2 py-1 aethel-rounded text-xs bg-blue-500/20 text-blue-400">
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="aethel-flex space-x-2">
                          <button
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
                            className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 aethel-rounded hover:bg-blue-500/30"
                          >
                            Adicionar Créditos
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleSuspendUser(user.id)}
                              className="text-xs bg-red-500/20 text-red-400 px-2 py-1 aethel-rounded hover:bg-red-500/30"
                            >
                              Suspender
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="text-xs bg-green-500/20 text-green-400 px-2 py-1 aethel-rounded hover:bg-green-500/30"
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
            <div className="aethel-flex aethel-justify-between aethel-items-center mt-4">
              <span className="text-sm text-slate-400">
                Mostrando {users.length} de {totalUsers} usuários
              </span>
              <div className="aethel-flex aethel-gap-2">
                <button
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className="px-3 py-1 text-sm bg-slate-700 text-white aethel-rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-slate-400">
                  Página {userPage}
                </span>
                <button
                  onClick={() => setUserPage(userPage + 1)}
                  disabled={users.length < 20}
                  className="px-3 py-1 text-sm bg-slate-700 text-white aethel-rounded disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'credits' && (
        <div className="space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="text-xl font-semibold">Gerenciamento de Créditos</h3>
            <button className="aethel-button aethel-button-primary">Operação de Créditos em Lote</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Alocação de Créditos</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">E-mail do Usuário</label>
                  <input
                    type="email"
                    className="w-full bg-slate-800 border border-slate-600 aethel-rounded px-3 py-2 text-white"
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Créditos a Adicionar</label>
                  <input
                    type="number"
                    className="w-full bg-slate-800 border border-slate-600 aethel-rounded px-3 py-2 text-white"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Motivo</label>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 aethel-rounded px-3 py-2 text-white h-20"
                    placeholder="Motivo para alocação de créditos"
                  />
                </div>
                <button className="aethel-button aethel-button-primary w-full">Adicionar Créditos</button>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Análise de Créditos</h4>
              <div className="space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-slate-800/50 aethel-rounded">
                  <span className="text-sm">Média de Créditos por Usuário</span>
                  <span className="font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-slate-800/50 aethel-rounded">
                  <span className="text-sm">Créditos Usados Hoje</span>
                  <span className="font-semibold">45,231</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-slate-800/50 aethel-rounded">
                  <span className="text-sm">Maior Consumidor (Este Mês)</span>
                  <span className="font-semibold">user@company.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="text-lg font-semibold mb-4">Transações de Créditos Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">Usuário</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Descrição</th>
                    <th className="text-left py-3 px-4">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-800">
                      <td className="py-3 px-4 text-slate-400">{transaction.userEmail}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 aethel-rounded text-xs ${
                          transaction.type === 'usage' ? 'bg-red-500/20 text-red-400' :
                          transaction.type === 'purchase' ? 'bg-green-500/20 text-green-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-medium ${
                        transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </td>
                      <td className="py-3 px-4">{transaction.description}</td>
                      <td className="py-3 px-4 text-slate-400">
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
        <div className="space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="text-xl font-semibold">Gestão Financeira</h3>
            <button className="aethel-button aethel-button-primary">Gerar Relatório</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Detalhamento de Receita</h4>
              <div className="space-y-3">
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">Basic Plan ($19)</span>
                  <span className="font-semibold">$15,200</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">Plus Plan ($39)</span>
                  <span className="font-semibold">$21,600</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">Pro Plan ($199)</span>
                  <span className="font-semibold">$8,500</span>
                </div>
                <div className="aethel-flex aethel-justify-between border-t border-slate-700 pt-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold text-green-400">$45,300</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Métodos de Pagamento</h4>
              <div className="space-y-3">
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">Cartão de Crédito</span>
                  <span className="font-semibold">68%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">PayPal</span>
                  <span className="font-semibold">22%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="text-sm text-slate-400">Transferência Bancária</span>
                  <span className="font-semibold">10%</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Pagamentos Falhados</h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400 mb-2">2.3%</div>
                <p className="text-sm text-slate-400">Taxa de falha este mês</p>
                <p className="text-xs text-slate-500 mt-2">127 falharam de 5.421 tentativas</p>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="text-lg font-semibold mb-4">Pagamentos Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4">Usuário</th>
                    <th className="text-left py-3 px-4">Plano</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4">john.doe@example.com</td>
                    <td className="py-3 px-4">Plano Plus</td>
                    <td className="py-3 px-4">$39.00</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 aethel-rounded text-xs bg-green-500/20 text-green-400">
                        Concluído
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">2025-01-25</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="py-3 px-4">jane.smith@example.com</td>
                    <td className="py-3 px-4">Plano Básico</td>
                    <td className="py-3 px-4">$19.00</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 aethel-rounded text-xs bg-green-500/20 text-green-400">
                        Concluído
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">2025-01-24</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'system' && (
        <div className="space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="text-xl font-semibold">Gestão do Sistema</h3>
            <button className="aethel-button aethel-button-primary">Configurações do Sistema</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Status dos Servidores</h4>
              <div className="space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-green-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span>API Server</span>
                  </div>
                  <span className="text-sm text-green-400">99.9% uptime</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-green-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span>Database</span>
                  </div>
                  <span className="text-sm text-green-400">99.8% uptime</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 bg-yellow-500/10 aethel-rounded">
                  <div className="aethel-flex aethel-items-center aethel-gap-3">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span>AI Service</span>
                  </div>
                  <span className="text-sm text-yellow-400">98.5% uptime</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="text-lg font-semibold mb-4">Métricas do Sistema</h4>
              <div className="space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="text-sm text-slate-400">Uso de CPU</span>
                  <span className="font-semibold">45%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="text-sm text-slate-400">Uso de Memória</span>
                  <span className="font-semibold">67%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="text-sm text-slate-400">Conexões Ativas</span>
                  <span className="font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="text-sm text-slate-400">Tamanho da Fila</span>
                  <span className="font-semibold">23</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="text-lg font-semibold mb-4">Logs do Sistema</h4>
            <div className="bg-slate-900 aethel-rounded aethel-p-4 font-mono text-sm max-h-96 overflow-y-auto">
              <div className="space-y-1">
                <div className="text-green-400">[2025-01-25 10:30:15] INFO: User authentication successful - user_12345</div>
                <div className="text-blue-400">[2025-01-25 10:30:12] INFO: Credit transaction processed - amount: 247</div>
                <div className="text-yellow-400">[2025-01-25 10:29:58] WARN: High memory usage detected on server-3</div>
                <div className="text-green-400">[2025-01-25 10:29:45] INFO: AI model inference completed - duration: 2.3s</div>
                <div className="text-blue-400">[2025-01-25 10:29:30] INFO: Database backup completed successfully</div>
                <div className="text-red-400">[2025-01-25 10:28:15] ERROR: Failed payment attempt - insufficient funds</div>
                <div className="text-green-400">[2025-01-25 10:28:01] INFO: New user registration - john.doe@example.com</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}