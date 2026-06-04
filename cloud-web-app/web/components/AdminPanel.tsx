import { logger } from '@/lib/observability/logger';
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

type AdminTabId = 'overview' | 'users' | 'credits' | 'financial' | 'system'

const adminTabs: Array<{ id: AdminTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'credits', label: 'Credits' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'system', label: 'Sistema' },
]

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
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabId>('overview')
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
      toast.success(`Credits ajustados com sucesso. Novo saldo: $${result.new_balance}`)
      mutateUsers() // Refresh user data
    } catch (error) {
      logger.error('Error adjusting credits:', error)
      toast.error('Failed to adjust credits')
    }
  }

  const handleSuspendUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: false })
      })

      if (!response.ok) throw new Error('Failed to suspend user')

      toast.success('User suspended successfully')
      mutateUsers() // Refresh user data
    } catch (error) {
      logger.error('Error suspending user:', error)
      toast.error('Failed to suspend user')
    }
  }

  const handleActivateUser = async (userId: number) => {
    try {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(authHeaders() as Record<string, string>) },
        body: JSON.stringify({ is_active: true })
      })

      if (!response.ok) throw new Error('Failed to activate user')

      toast.success('User activated successfully')
      mutateUsers() // Refresh user data
    } catch (error) {
      logger.error('Error activating user:', error)
      toast.error('Failed to activate user')
    }
  }

  return (
    <div className="px-6 py-6 space-y-6">
      <div className={PANEL_CLASS}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">Admin Studio</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--aethel-text-primary)]">Admin panel</h2>
            <p className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">
              Control users, credits, plans, and system indicators.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1 text-xs text-[var(--aethel-text-secondary)]">
              Restricted access
            </span>
            <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] px-3 py-1 text-xs text-[var(--aethel-success-light)]">
              Audit active
            </span>
          </div>
        </div>
      </div>

      {/* Admin Navigation */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-2 shadow-[0_18px_48px_rgba(2,6,23,0.18)]">
        <div className="flex gap-2">
          {adminTabs.map((tab) => (
            <button type="button" aria-label={`Open admin tab ${tab.label}`}
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
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
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Total users</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{currentStats.total_users.toLocaleString()}</p>
                  <p className="text-xs text-[var(--aethel-success-light)] mt-1">Active: {currentStats.active_users}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
                  <Users className="w-6 h-6 text-[var(--aethel-info-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Total credits</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">${currentStats.total_credits.toFixed(2)}</p>
                  <p className="text-xs text-[var(--aethel-success-light)] mt-1">All users</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]">
                  <CreditCard className="w-6 h-6 text-[var(--aethel-success-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">Monthly Revenue</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">${currentStats.monthly_revenue.toFixed(2)}</p>
                  <p className="text-xs text-[var(--aethel-warning-light)] mt-1">This month</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]">
                  <DollarSign className="w-6 h-6 text-[var(--aethel-warning-light)]" />
                </div>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--aethel-text-tertiary)]">API Calls Today</h3>
                  <p className="text-2xl font-bold text-[var(--aethel-text-primary)]">{currentStats.api_calls_today.toLocaleString()}</p>
                  <p className="text-xs text-[var(--aethel-info-light)] mt-1">Active sessions: {currentStats.active_sessions}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
                  <Activity className="w-6 h-6 text-[var(--aethel-info-light)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={PANEL_CLASS}>
            <h3 className={`${CANONICAL_TYPOGRAPHY.h2} mb-4`}>Recent Activity</h3>
            {recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-6 py-12 text-center text-sm text-[var(--aethel-text-secondary)]">No recent activity.</div>
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
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>User management</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className={`${INPUT_CLASS} w-64`}
                aria-label="Search users"
              />
              <button type="button" aria-label="Create new user" className={BUTTON_PRIMARY_CLASS}>New user</button>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Credits</th>
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
                          {user.is_active ? 'Active' : 'Suspended'}
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
                          <button type="button" aria-label={`Add credits to ${user.email}`}
                            onClick={async () => {
                              const amount = await openPromptDialog({
                                title: 'Add credits',
                                message: 'Enter credits to add:',
                                placeholder: '100',
                                confirmText: 'Add',
                                cancelText: 'Cancel',
                              });
                              if (!amount) return;
                              const parsed = Number.parseFloat(amount);
                              if (Number.isNaN(parsed)) {
                                toast.error('Invalid credit amount');
                                return;
                              }
                              handleAddCredits(user.id, parsed);
                            }}
                            className={BUTTON_SECONDARY_CLASS}
                          >
                            Add Credits
                          </button>
                          {user.is_active ? (
                            <button type="button" aria-label={`Suspend user ${user.email}`}
                              onClick={() => handleSuspendUser(user.id)}
                              className={`${BUTTON_SECONDARY_CLASS} border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] text-[var(--aethel-error-light)]`}
                            >
                              Suspender
                            </button>
                          ) : (
                            <button type="button" aria-label={`Activate user ${user.email}`}
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

            {/* Pagetion */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--aethel-text-tertiary)]">
                Showing {users.length} de {totalUsers} users
              </span>
              <div className="flex gap-2">
                <button type="button" aria-label="Go to previous users page"
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className={BUTTON_SECONDARY_CLASS}
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-[var(--aethel-text-tertiary)]">
                  Page {userPage}
                </span>
                <button type="button" aria-label="Go to next users page"
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
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Credit management</h3>
            <button type="button" aria-label="Run bulk credit operation" className={BUTTON_PRIMARY_CLASS}>Bulk credit operation</button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Alocacao de Credits</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">E-mail do User</label>
                  <input type="email" className={INPUT_CLASS} placeholder="user@example.com" aria-label="User email for credit allocation" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Credits to add</label>
                  <input type="number" className={INPUT_CLASS} placeholder="1000" aria-label="Credit amount to add" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--aethel-text-tertiary)] mb-2">Reason</label>
                  <textarea className={`${INPUT_CLASS} h-20`} placeholder="Reason for credit allocation" aria-label="Reason for credit allocation" />
                </div>
                <button type="button" aria-label="Add credits manually" className={`${BUTTON_PRIMARY_CLASS} w-full`}>Add Credits</button>
              </div>
            </div>

            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Analise de Credits</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <span className="text-sm">Media de Credits por User</span>
                  <span className="font-semibold">1,247</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
                  <span className="text-sm">Credits Usados Hoje</span>
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
            <h4 className="text-lg font-semibold mb-4">Transacoes de Credits Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Descricao</th>
                    <th className="text-left py-3 px-4">Horario</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--aethel-text-tertiary)]">
                        No transacao registrada.
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
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>Financial management</h3>
            <button type="button" aria-label="Generate financial report" className={BUTTON_PRIMARY_CLASS}>Generate report</button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={PANEL_CLASS}>
              <h4 className="text-lg font-semibold mb-4">Revenue breakdown</h4>
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
              <h4 className="text-lg font-semibold mb-4">Pagamentos Failuredos</h4>
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--aethel-error-light)] mb-2">2.3%</div>
                <p className="text-sm text-[var(--aethel-text-tertiary)]">Taxa de failure este mes</p>
                <p className="text-xs text-[var(--aethel-text-tertiary)] mt-2">127 failureram de 5.421 tentactives</p>
              </div>
            </div>
          </div>

          <div className={PANEL_CLASS}>
            <h4 className="text-lg font-semibold mb-4">Pagamentos Recentes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Plan</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <td className="py-3 px-4">john.doe@example.com</td>
                    <td className="py-3 px-4">Pro plan</td>
                    <td className="py-3 px-4">$39.00</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
                        Completed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--aethel-text-tertiary)]">2025-01-25</td>
                  </tr>
                  <tr className="border-b border-[var(--aethel-border-primary)]">
                    <td className="py-3 px-4">jane.smith@example.com</td>
                    <td className="py-3 px-4">Starter plan</td>
                    <td className="py-3 px-4">$19.00</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full px-2 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]">
                        Completed
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
            <h3 className={CANONICAL_TYPOGRAPHY.h2}>System management</h3>
            <button type="button" aria-label="Open system settings" className={BUTTON_PRIMARY_CLASS}>System settings</button>
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
