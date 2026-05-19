'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, Keyboard, RefreshCw, Shield } from 'lucide-react'

import { FILTER_LABELS } from './_components/moderation-copy'
import { ModerationItemCard } from './_components/ModerationItemCard'
import { ModerationShortcutsModal } from './_components/ModerationShortcutsModal'
import { ModerationStatsBar } from './_components/ModerationStatsBar'
import type { ModerationAction, ModerationItem, ModerationStats } from './_components/moderation-types'

type ModerationFilter = 'all' | 'urgent' | 'pending'

const FILTERS: ModerationFilter[] = ['pending', 'urgent', 'all']

export default function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [stats, setStats] = useState<ModerationStats>({
    pending: 0,
    urgent: 0,
    todayProcessed: 0,
    avgResponseTime: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filter, setFilter] = useState<ModerationFilter>('pending')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/moderation/queue?filter=${filter}`)
      if (!response.ok) throw new Error('Failed to fetch moderation queue')
      const data = await response.json()
      setItems(data.items)
      setStats(data.stats)
      setLastUpdated(new Date())
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to fetch moderation queue')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchItems()
    const interval = setInterval(fetchItems, 30000)
    return () => clearInterval(interval)
  }, [fetchItems])

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase()
    return (
      !term ||
      item.reason?.toLowerCase().includes(term) ||
      item.targetId.toLowerCase().includes(term) ||
      item.targetOwnerEmail?.toLowerCase().includes(term)
    )
  })

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(filteredItems.length - 1, 0)))
  }, [filteredItems.length])

  const handleAction = useCallback(
    async (action: ModerationAction) => {
      const item = filteredItems[selectedIndex]
      if (!item || processing) return

      setProcessing(true)

      try {
        const response = await fetch(`/api/admin/moderation/${item.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!response.ok) throw new Error('Action failed')

        setItems((previousItems) => previousItems.filter((entry) => entry.id !== item.id))
        setStats((previousStats) => ({
          ...previousStats,
          pending: Math.max(0, previousStats.pending - 1),
          todayProcessed: previousStats.todayProcessed + (action !== 'skip' ? 1 : 0),
        }))
        setSelectedIndex((index) => Math.min(index, filteredItems.length - 2))
        setErrorMessage(null)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Moderation action failed')
      } finally {
        setProcessing(false)
      }
    },
    [filteredItems, processing, selectedIndex],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      const item = filteredItems[selectedIndex]
      if (!item && event.key !== '?' && event.key !== 'n' && event.key !== 'p') return

      switch (event.key.toLowerCase()) {
        case 'a':
          handleAction('approve')
          break
        case 'r':
          handleAction('reject')
          break
        case 'e':
          handleAction('escalate')
          break
        case 's':
          handleAction('skip')
          break
        case 'b':
          handleAction('shadowban')
          break
        case 'd':
          handleAction('delete')
          break
        case 'n':
          setSelectedIndex((index) => Math.min(index + 1, filteredItems.length - 1))
          break
        case 'p':
          setSelectedIndex((index) => Math.max(index - 1, 0))
          break
        case '?':
          setShowShortcuts(true)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredItems, handleAction, selectedIndex])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-live="polite">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--aethel-text-tertiary)]" />
        <span className="sr-only">Loading moderation queue...</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-[var(--aethel-text-primary)]">
            <Shield className="h-6 w-6" />
            Moderation queue
          </h1>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Review and moderate flagged content.</p>
          {lastUpdated ? <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated at {lastUpdated.toLocaleString()}</p> : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1.5 text-sm text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          >
            <Keyboard className="h-4 w-4" />
            Shortcuts (?)
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1">
            {FILTERS.map((nextFilter) => (
              <button
                type="button"
                key={nextFilter}
                onClick={() => setFilter(nextFilter)}
                className={`rounded px-3 py-1 text-xs capitalize ${
                  filter === nextFilter ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {FILTER_LABELS[nextFilter]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search target/reason"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)]"
          />

          <button
            type="button"
            onClick={fetchItems}
            className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-2 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
            aria-label="Refresh moderation queue"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)]" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <ModerationStatsBar stats={stats} />

      {filteredItems.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
          <CheckCircle className="mb-4 h-12 w-12 text-[var(--aethel-success)]" />
          <p className="text-lg text-[var(--aethel-text-secondary)]">All clear.</p>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">No item in the moderation queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item, index) => (
            <ModerationItemCard key={item.id} item={item} isSelected={index === selectedIndex} onClick={() => setSelectedIndex(index)} onAction={handleAction} />
          ))}
        </div>
      )}

      {processing ? (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-[var(--aethel-primary-dark)] px-4 py-2 text-[var(--aethel-text-primary)]" role="status" aria-live="polite">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Processing...
        </div>
      ) : null}

      {showShortcuts ? <ModerationShortcutsModal onClose={() => setShowShortcuts(false)} /> : null}
    </div>
  )
}
