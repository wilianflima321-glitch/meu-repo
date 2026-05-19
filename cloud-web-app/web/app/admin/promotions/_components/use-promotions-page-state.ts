'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Promotion, PromotionFormState, PromotionStatusFilter } from './promotions-types'

const EMPTY_PROMOTION: PromotionFormState = {
  name: '',
  code: '',
  type: 'percentage',
  discount: '',
  maxRedemptions: '',
  expiresAt: '',
  currency: 'usd',
}

export function usePromotionsPageState() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PromotionStatusFilter>('all')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [newPromotion, setNewPromotion] = useState<PromotionFormState>(EMPTY_PROMOTION)

  const fetchPromotions = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/admin/promotions')
      if (!response.ok) throw new Error('Failed to load promotions')
      const data = await response.json()
      setPromotions(Array.isArray(data?.promotions) ? data.promotions : [])
      setLastUpdated(new Date())
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPromotions()
  }, [fetchPromotions])

  const handleCreate = async () => {
    if (creating) return
    setFormError(null)
    setCreating(true)

    try {
      const payload = {
        name: newPromotion.name.trim(),
        code: newPromotion.code.trim(),
        type: newPromotion.type,
        discount: Number(newPromotion.discount),
        maxRedemptions: newPromotion.maxRedemptions ? Number(newPromotion.maxRedemptions) : undefined,
        expiresAt: newPromotion.expiresAt || undefined,
        currency: newPromotion.currency,
      }
      const response = await fetch('/api/admin/promotions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to create promotion')
      }
      setNewPromotion(EMPTY_PROMOTION)
      await fetchPromotions()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unexpected error')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (promotion: Promotion) => {
    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promotion.id, active: !promotion.active }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to update promotion')
      }
      await fetchPromotions()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unexpected error')
    }
  }

  const filteredPromotions = useMemo(() => {
    const term = search.trim().toLowerCase()
    return promotions.filter((promotion) => {
      const matchesSearch = !term || promotion.name.toLowerCase().includes(term) || (promotion.code || '').toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? promotion.active : !promotion.active)
      return matchesSearch && matchesStatus
    })
  }, [promotions, search, statusFilter])

  const summary = useMemo(() => ({
    total: promotions.length,
    active: promotions.filter((promotion) => promotion.active).length,
    inactive: promotions.filter((promotion) => !promotion.active).length,
  }), [promotions])

  return {
    creating, error, fetchPromotions, filteredPromotions, formError, handleCreate, handleToggle, lastUpdated, loading,
    newPromotion, search, setNewPromotion, setSearch, setStatusFilter, statusFilter, summary,
  }
}
