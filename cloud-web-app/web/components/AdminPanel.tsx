import React, { useState } from 'react'
import useSWR from 'swr'
import { Users, CreditCard, DollarSign, Activity, Settings, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { authHeaders } from '@/lib/auth'
import { API_BASE } from '@/lib/api'

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
      alert(`Credits adjusted successfully. New balance: $${result.new_balance}`)
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error adjusting credits:', error)
      alert('Failed to adjust credits')
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

      alert('User suspended successfully')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('Failed to suspend user')
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

      alert('User activated successfully')
      mutateUsers() // Refresh user data
    } catch (error) {
      console.error('Error activating user:', error)
      alert('Failed to activate user')
    }
  }

  return (
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-text-center">
        <h2 className="aethel-text-3xl aethel-font-bold aethel-mb-4">Admin Dashboard</h2>
        <p className="aethel-text-lg aethel-text-slate-400 aethel-max-w-2xl aethel-mx-auto">
          Manage users, credits, plans, and system metrics. Full administrative control over the Aethel platform.
        </p>
      </div>

      {/* Admin Navigation */}
      <div className="aethel-flex aethel-space-x-1 aethel-bg-slate-800 aethel-p-1 aethel-rounded-lg aethel-max-w-2xl aethel-mx-auto">
        {[
          { id: 'overview', label: 'Overview', icon: '' },
          { id: 'users', label: 'Users', icon: '' },
          { id: 'credits', label: 'Credits', icon: '' },
          { id: 'financial', label: 'Financial', icon: '' },
          { id: 'system', label: 'System', icon: '' }
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
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Total Users</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">{currentStats.total_users.toLocaleString()}</p>
                  <p className="aethel-text-xs aethel-text-green-400 aethel-mt-1">Active: {currentStats.active_users}</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-blue-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Users className="w-6 h-6 aethel-text-blue-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Total Credits</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">${currentStats.total_credits.toFixed(2)}</p>
                  <p className="aethel-text-xs aethel-text-green-400 aethel-mt-1">Across all users</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-green-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <CreditCard className="w-6 h-6 aethel-text-green-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">Monthly Revenue</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">${currentStats.monthly_revenue.toFixed(2)}</p>
                  <p className="aethel-text-xs aethel-text-yellow-400 aethel-mt-1">This month</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-yellow-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <DollarSign className="w-6 h-6 aethel-text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <div className="aethel-flex aethel-items-center aethel-justify-between">
                <div>
                  <h3 className="aethel-text-sm aethel-font-medium aethel-text-slate-400">API Calls Today</h3>
                  <p className="aethel-text-2xl aethel-font-bold aethel-text-white">{currentStats.api_calls_today.toLocaleString()}</p>
                  <p className="aethel-text-xs aethel-text-purple-400 aethel-mt-1">Active sessions: {currentStats.active_sessions}</p>
                </div>
                <div className="aethel-w-12 aethel-h-12 aethel-bg-purple-500/20 aethel-rounded-lg aethel-flex aethel-items-center aethel-justify-center">
                  <Activity className="w-6 h-6 aethel-text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="aethel-card aethel-p-6">
            <h3 className="aethel-text-xl aethel-font-semibold aethel-mb-4">Recent Admin Activity</h3>
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
                          {user.is_active ? 'Active' : 'Suspended'}
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
                              const amount = prompt('Enter credits to add:');
                              if (amount) handleAddCredits(user.id, parseFloat(amount));
                            }}
                            className="aethel-text-xs aethel-bg-blue-500/20 aethel-text-blue-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-blue-500/30"
                          >
                            Add Credits
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleSuspendUser(user.id)}
                              className="aethel-text-xs aethel-bg-red-500/20 aethel-text-red-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-red-500/30"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivateUser(user.id)}
                              className="aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400 aethel-px-2 aethel-py-1 aethel-rounded hover:aethel-bg-green-500/30"
                            >
                              Activate
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
                Showing {users.length} of {totalUsers} users
              </span>
              <div className="aethel-flex aethel-gap-2">
                <button
                  onClick={() => setUserPage(Math.max(1, userPage - 1))}
                  disabled={userPage === 1}
                  className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-bg-slate-700 aethel-text-white aethel-rounded disabled:aethel-opacity-50"
                >
                  Previous
                </button>
                <span className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-text-slate-400">
                  Page {userPage}
                </span>
                <button
                  onClick={() => setUserPage(userPage + 1)}
                  disabled={users.length < 20}
                  className="aethel-px-3 aethel-py-1 aethel-text-sm aethel-bg-slate-700 aethel-text-white aethel-rounded disabled:aethel-opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'credits' && (
        <div className="aethel-space-y-6">
          <div className="aethel-flex aethel-justify-between aethel-items-center">
            <h3 className="aethel-text-xl aethel-font-semibold">Credit Management</h3>
            <button className="aethel-button aethel-button-primary">Bulk Credit Operation</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Credit Allocation</h4>
              <div className="aethel-space-y-4">
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">User Email</label>
                  <input
                    type="email"
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">Credits to Add</label>
                  <input
                    type="number"
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="aethel-block aethel-text-sm aethel-font-medium aethel-text-slate-400 aethel-mb-2">Reason</label>
                  <textarea
                    className="aethel-w-full aethel-bg-slate-800 aethel-border aethel-border-slate-600 aethel-rounded aethel-px-3 aethel-py-2 aethel-text-white aethel-h-20"
                    placeholder="Reason for credit allocation"
                  />
                </div>
                <button className="aethel-button aethel-button-primary aethel-w-full">Add Credits</button>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Credit Analytics</h4>
              <div className="aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Average Credits per User</span>
                  <span className="aethel-font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Credits Used Today</span>
                  <span className="aethel-font-semibold">45,231</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center aethel-p-3 aethel-bg-slate-800/50 aethel-rounded">
                  <span className="aethel-text-sm">Top Spender (This Month)</span>
                  <span className="aethel-font-semibold">user@company.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Recent Credit Transactions</h4>
            <div className="aethel-overflow-x-auto">
              <table className="aethel-w-full aethel-text-sm">
                <thead>
                  <tr className="aethel-border-b aethel-border-slate-700">
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">User</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Type</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Amount</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Description</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Time</th>
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
            <h3 className="aethel-text-xl aethel-font-semibold">Financial Management</h3>
            <button className="aethel-button aethel-button-primary">Generate Report</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-3 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Revenue Breakdown</h4>
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
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Payment Methods</h4>
              <div className="aethel-space-y-3">
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Credit Card</span>
                  <span className="aethel-font-semibold">68%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">PayPal</span>
                  <span className="aethel-font-semibold">22%</span>
                </div>
                <div className="aethel-flex aethel-justify-between">
                  <span className="aethel-text-sm aethel-text-slate-400">Bank Transfer</span>
                  <span className="aethel-font-semibold">10%</span>
                </div>
              </div>
            </div>

            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Failed Payments</h4>
              <div className="aethel-text-center">
                <div className="aethel-text-3xl aethel-font-bold aethel-text-red-400 aethel-mb-2">2.3%</div>
                <p className="aethel-text-sm aethel-text-slate-400">Failure rate this month</p>
                <p className="aethel-text-xs aethel-text-slate-500 aethel-mt-2">127 failed out of 5,421 attempts</p>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Recent Payments</h4>
            <div className="aethel-overflow-x-auto">
              <table className="aethel-w-full aethel-text-sm">
                <thead>
                  <tr className="aethel-border-b aethel-border-slate-700">
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">User</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Plan</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Amount</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Status</th>
                    <th className="aethel-text-left aethel-py-3 aethel-px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="aethel-border-b aethel-border-slate-800">
                    <td className="aethel-py-3 aethel-px-4">john.doe@example.com</td>
                    <td className="aethel-py-3 aethel-px-4">Plus Plan</td>
                    <td className="aethel-py-3 aethel-px-4">$39.00</td>
                    <td className="aethel-py-3 aethel-px-4">
                      <span className="aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400">
                        Completed
                      </span>
                    </td>
                    <td className="aethel-py-3 aethel-px-4 aethel-text-slate-400">2025-01-25</td>
                  </tr>
                  <tr className="aethel-border-b aethel-border-slate-800">
                    <td className="aethel-py-3 aethel-px-4">jane.smith@example.com</td>
                    <td className="aethel-py-3 aethel-px-4">Basic Plan</td>
                    <td className="aethel-py-3 aethel-px-4">$19.00</td>
                    <td className="aethel-py-3 aethel-px-4">
                      <span className="aethel-px-2 aethel-py-1 aethel-rounded aethel-text-xs aethel-bg-green-500/20 aethel-text-green-400">
                        Completed
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
            <h3 className="aethel-text-xl aethel-font-semibold">System Management</h3>
            <button className="aethel-button aethel-button-primary">System Settings</button>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-6">
            <div className="aethel-card aethel-p-6">
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">Server Status</h4>
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
              <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">System Metrics</h4>
              <div className="aethel-space-y-4">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">CPU Usage</span>
                  <span className="aethel-font-semibold">45%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Memory Usage</span>
                  <span className="aethel-font-semibold">67%</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Active Connections</span>
                  <span className="aethel-font-semibold">1,247</span>
                </div>
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <span className="aethel-text-sm aethel-text-slate-400">Queue Size</span>
                  <span className="aethel-font-semibold">23</span>
                </div>
              </div>
            </div>
          </div>

          <div className="aethel-card aethel-p-6">
            <h4 className="aethel-text-lg aethel-font-semibold aethel-mb-4">System Logs</h4>
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