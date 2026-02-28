'use client'

import React, { useState } from 'react'
import { 
  BarChart3, TrendingUp, AlertTriangle, Shield, Zap, Users, 
  CreditCard, Settings, Activity, Lock, Eye, Download, RefreshCw,
  CheckCircle, XCircle, Clock
} from 'lucide-react'

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

export default function AdminDashboardPro() {
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'security' | 'ops'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  const metrics: AdminMetric[] = [
    { label: 'Total Users', value: '2,847', change: 12.5, status: 'up' },
    { label: 'Active Projects', value: '1,234', change: 8.3, status: 'up' },
    { label: 'API Requests (24h)', value: '2.3M', change: -2.1, status: 'down' },
    { label: 'System Health', value: '99.8%', change: 0.2, status: 'stable' }
  ]

  const securityEvents: SecurityEvent[] = [
    { id: '1', type: 'login', user: 'user@example.com', timestamp: '2 min ago', status: 'success' },
    { id: '2', type: 'api_call', user: 'api-key-xxxxx', timestamp: '5 min ago', status: 'success' },
    { id: '3', type: 'permission_change', user: 'admin@aethel.ai', timestamp: '12 min ago', status: 'success' },
    { id: '4', type: 'data_access', user: 'unknown-ip', timestamp: '18 min ago', status: 'suspicious' }
  ]

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Admin Console Pro</h1>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">Enterprise Operations Center</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto">
        {(['overview', 'billing', 'security', 'ops'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab === 'overview' && <Activity className="inline mr-2" size={14} />}
            {tab === 'billing' && <CreditCard className="inline mr-2" size={14} />}
            {tab === 'security' && <Shield className="inline mr-2" size={14} />}
            {tab === 'ops' && <Zap className="inline mr-2" size={14} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric, idx) => (
                <div key={idx} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors">
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">{metric.label}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold text-zinc-100">{metric.value}</p>
                    <div className={`flex items-center gap-1 text-xs font-bold ${
                      metric.status === 'up' ? 'text-emerald-400' :
                      metric.status === 'down' ? 'text-rose-400' : 'text-zinc-400'
                    }`}>
                      <TrendingUp size={14} />
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* System Status */}
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                System Status
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'API Gateway', status: 'online' },
                  { label: 'Database', status: 'online' },
                  { label: 'Cache Layer', status: 'online' },
                  { label: 'Message Queue', status: 'online' }
                ].map((service, idx) => (
                  <div key={idx} className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-zinc-400 uppercase">{service.label}</p>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    </div>
                    <p className="text-xs text-emerald-400 font-bold">{service.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-amber-400" />
                Billing Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-amber-400">$47,234</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-emerald-400">1,847</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Churn Rate</p>
                  <p className="text-2xl font-bold text-rose-400">2.3%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield size={20} className="text-blue-400" />
                Security Events
              </h2>
              <div className="space-y-3">
                {securityEvents.map(event => (
                  <div key={event.id} className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-zinc-600 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {event.status === 'success' && <CheckCircle size={16} className="text-emerald-400" />}
                        {event.status === 'failed' && <XCircle size={16} className="text-rose-400" />}
                        {event.status === 'suspicious' && <AlertTriangle size={16} className="text-amber-400" />}
                        <div>
                          <p className="text-sm font-bold text-zinc-200 capitalize">{event.type.replace('_', ' ')}</p>
                          <p className="text-xs text-zinc-500">{event.user}</p>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600">{event.timestamp}</p>
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
            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Zap size={20} className="text-purple-400" />
                Operations
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-purple-500/50 transition-all text-left group">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">Database Backup</p>
                  <p className="text-xs text-zinc-600 mt-1">Last backup: 2 hours ago</p>
                </button>
                <button className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-purple-500/50 transition-all text-left group">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">Cache Flush</p>
                  <p className="text-xs text-zinc-600 mt-1">Clear all cached data</p>
                </button>
                <button className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-purple-500/50 transition-all text-left group">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">Logs Export</p>
                  <p className="text-xs text-zinc-600 mt-1">Download system logs</p>
                </button>
                <button className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-purple-500/50 transition-all text-left group">
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">Feature Flags</p>
                  <p className="text-xs text-zinc-600 mt-1">Manage feature toggles</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
