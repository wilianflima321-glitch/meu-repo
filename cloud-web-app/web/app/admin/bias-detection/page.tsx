'use client'

import { useCallback, useEffect, useState } from 'react'
import { BiasAuditForm } from './_components/BiasAuditForm'
import { BiasHeader } from './_components/BiasHeader'
import { BiasItemsList } from './_components/BiasItemsList'
import { BiasStatsGrid } from './_components/BiasStatsGrid'
import type { BiasFilter, BiasItem, BiasPriority, BiasStats, StatusFilter } from './_components/bias-types'
import { emptyStats } from './_components/bias-types'

export default function BiasDetectionPage() {
  const [items, setItems] = useState<BiasItem[]>([])
  const [stats, setStats] = useState<BiasStats>(emptyStats)
  const [newOutput, setNewOutput] = useState('')
  const [newScore, setNewScore] = useState('')
  const [newFlags, setNewFlags] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newPriority, setNewPriority] = useState<BiasPriority>('normal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [biasFilter, setBiasFilter] = useState<BiasFilter>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchItems = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/bias-detection')
      if (!res.ok) throw new Error('Failed to load audits')
      const data = await res.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setStats(data?.stats || emptyStats)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const handleAnalyze = async () => {
    if (!newOutput.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/bias-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newOutput, score: newScore ? Number(newScore) : undefined, flags: newFlags, reason: newReason, priority: newPriority }),
      })
      if (!res.ok) throw new Error('Failed to record audit')
      setNewOutput('')
      setNewScore('')
      setNewFlags('')
      setNewReason('')
      setNewPriority('normal')
      await fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleModerationAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to update item')
      }
      await fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || item.text.toLowerCase().includes(term)
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' ? item.status === 'pending' : item.status !== 'pending')
    const matchesBias = biasFilter === 'all' || (biasFilter === 'none' ? item.autoScore === null || item.autoScore === undefined : biasFilter === 'high' ? (item.autoScore || 0) >= 0.7 : biasFilter === 'medium' ? (item.autoScore || 0) >= 0.4 && (item.autoScore || 0) < 0.7 : (item.autoScore || 0) < 0.4)
    return matchesSearch && matchesStatus && matchesBias
  })

  return (
    <div className="mx-auto max-w-4xl p-6">
      <BiasHeader lastUpdated={lastUpdated} onRefresh={() => void fetchItems()} />
      <BiasAuditForm newOutput={newOutput} newScore={newScore} newFlags={newFlags} newReason={newReason} newPriority={newPriority} submitting={submitting} error={error} onOutputChange={setNewOutput} onScoreChange={setNewScore} onFlagsChange={setNewFlags} onReasonChange={setNewReason} onPriorityChange={setNewPriority} onAnalyze={handleAnalyze} />
      <BiasStatsGrid stats={stats} />
      <BiasItemsList items={filteredItems} loading={loading} search={search} statusFilter={statusFilter} biasFilter={biasFilter} onSearchChange={setSearch} onStatusFilterChange={setStatusFilter} onBiasFilterChange={setBiasFilter} onModerationAction={handleModerationAction} />
    </div>
  )
}
