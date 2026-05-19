'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getToken } from '@/lib/auth'
import type { BillingRuntimeSnapshot, GatewayConfig, PaymentItem, PaymentStatusFilter, PaymentTotals } from './payments-types'

const DEFAULT_GATEWAY: GatewayConfig = {
  activeGateway: 'stripe',
  checkoutEnabled: true,
  allowLocalIdeRedirect: true,
  checkoutOrigin: null,
  updatedBy: null,
  updatedAt: null,
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  succeeded: 'Succeeded',
  pending: 'Pending',
  failed: 'Failed',
}

function getAuthHeaders() {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function usePaymentsPageState() {
  const [items, setItems] = useState<PaymentItem[]>([])
  const [totals, setTotals] = useState<PaymentTotals>({ total: 0, succeeded: 0, pending: 0, failed: 0 })
  const [gateway, setGateway] = useState<GatewayConfig>(DEFAULT_GATEWAY)
  const [savingGateway, setSavingGateway] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all')
  const [search, setSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [billingRuntime, setBillingRuntime] = useState<BillingRuntimeSnapshot | null>(null)

  const fetchGateway = useCallback(async () => {
    const response = await fetch('/api/admin/payments/gateway', { headers: getAuthHeaders() })
    if (!response.ok) throw new Error('Failed to load gateway settings')
    const data = await response.json()
    setGateway(data?.config || DEFAULT_GATEWAY)
  }, [])

  const fetchBillingRuntime = useCallback(async () => {
    const response = await fetch('/api/billing/readiness', { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    setBillingRuntime(data && typeof data === 'object' ? (data as BillingRuntimeSnapshot) : null)
  }, [])

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ status: statusFilter })
      const response = await fetch(`/api/admin/payments?${params.toString()}`, { headers: getAuthHeaders() })
      if (!response.ok) throw new Error('Failed to load payments')
      const data = await response.json()
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotals(data?.totals ?? { total: 0, succeeded: 0, pending: 0, failed: 0 })
      setLastUpdated(new Date())
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error loading payments')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchPayments()
    fetchGateway().catch((error) => setError(error instanceof Error ? error.message : 'Failed to load gateway'))
    fetchBillingRuntime().catch((error) => setError(error instanceof Error ? error.message : 'Failed to load billing runtime'))
  }, [fetchBillingRuntime, fetchGateway, fetchPayments])

  const saveGateway = useCallback(async () => {
    try {
      setSavingGateway(true)
      const response = await fetch('/api/admin/payments/gateway', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(gateway),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || 'Failed to save gateway')
      setGateway(payload?.config || gateway)
      setLastUpdated(new Date())
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error saving gateway')
    } finally {
      setSavingGateway(false)
    }
  }, [gateway])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter((item) => !term || (item.userEmail || '').toLowerCase().includes(term) || item.id.includes(term))
  }, [items, search])

  return {
    billingRuntime, error, fetchPayments, filteredItems, gateway, lastUpdated, loading, saveGateway, savingGateway,
    search, setGateway, setSearch, setStatusFilter, statusFilter, totals,
  }
}
