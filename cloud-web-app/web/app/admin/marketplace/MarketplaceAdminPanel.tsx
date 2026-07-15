'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, ShoppingCart, Tag } from 'lucide-react'

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

type MarketplaceItem = {
  id: string
  title: string
  category: string
  price: number
  downloads: number
  rating: number
  createdAt: string
}

export function MarketplaceAdminPanel() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle')
  const [message, setMessage] = useState<string>('')
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setMessage('Loading marketplace items...')
    try {
      const res = await fetch('/api/admin/marketplace', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          (data && typeof data === 'object' && (data as { message?: unknown }).message) ||
          (data && typeof data === 'object' && (data as { error?: unknown }).error) ||
          `Failed to load marketplace (HTTP ${res.status}).`
        throw new Error(String(msg))
      }

      setItems(Array.isArray(data?.items) ? data.items : [])
      setStatus('ok')
      setMessage('')
      setLastUpdated(new Date())
    } catch (err) {
      setItems([])
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Failed to load marketplace.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!cancelled) load()
    return () => {
      cancelled = true
    }
  }, [load])

  const categories = Array.from(new Set(items.map((item) => item.category))).sort()
  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || String(item.title).toLowerCase().includes(term)
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const summary = {
    total: items.length,
    paid: items.filter((item) => item.price > 0).length,
    free: items.filter((item) => item.price === 0).length,
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Marketplace operations</h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Review inventory, paid/free mix, downloads, and creator revenue signals.</p>
          {lastUpdated ? (
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Updated {lastUpdated.toLocaleString()}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          Refresh
        </button>
      </div>

      <AdminSummaryGrid
        columns={3}
        items={[
          { icon: Package, label: 'Total', value: summary.total },
          { icon: ShoppingCart, label: 'Paid', value: summary.paid, tone: 'success' },
          { icon: Tag, label: 'Free', value: summary.free, tone: 'warning' },
        ]}
      />

      {status === 'loading' ? (
        <div className="text-sm text-[var(--aethel-text-tertiary)]">{message}</div>
      ) : status === 'error' ? (
        <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
          <div className="font-semibold text-[var(--aethel-text-primary)]">Marketplace unavailable</div>
          <div className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">{message}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
          <div className="font-semibold text-[var(--aethel-text-primary)]">No items yet</div>
          <div className="mt-1 text-sm text-[var(--aethel-text-tertiary)]">Registered marketplace items will appear here.</div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4 md:flex-row md:items-center md:justify-between">
            <input
              type="text"
              placeholder="Search by title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-2 text-[var(--aethel-text-primary)] md:max-w-sm"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-2 text-sm text-[var(--aethel-text-primary)]"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <table className="w-full rounded-lg bg-[var(--aethel-surface-secondary)]">
            <thead>
              <tr className="bg-[var(--aethel-surface-tertiary)] text-sm">
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Downloads</th>
                <th className="p-3 text-left">Rating</th>
                <th className="p-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={String(item.id)} className="border-t border-[var(--aethel-border-secondary)]">
                  <td className="p-3">{String(item.title ?? '')}</td>
                  <td className="p-3">{String(item.category ?? '')}</td>
                  <td className="p-3">{item.price > 0 ? `$${item.price.toFixed(2)}` : 'Free'}</td>
                  <td className="p-3">{String(item.downloads || 0)}</td>
                  <td className="p-3">{Number(item.rating || 0).toFixed(1)}</td>
                  <td className="p-3">{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
