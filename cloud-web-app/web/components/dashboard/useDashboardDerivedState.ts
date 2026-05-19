import { useMemo } from 'react'
import type { BillingPlan, ConnectivityResponse, WalletSummary } from '@/lib/api'
import type { SessionEntry, SessionFilter } from './aethel-dashboard-model'
import { filterSessionHistory } from './aethel-dashboard-session-utils'
import {
  computeReceivableSummary,
  computeWalletUsageStats,
  getCreditEntries,
  getLastWalletUpdate,
} from './aethel-dashboard-wallet-utils'
import { mapSubscribeError } from './aethel-dashboard-billing-utils'
import type { FullAccessResponse } from './aethel-dashboard-core-types'

export type BillingPlanUI = {
  id: string
  name: string
  description: string
  price: number
  priceAnnual?: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
  limits: {
    requests: number | 'unlimited'
    projects: number | 'unlimited'
    storage: string
    collaborators: number | 'unlimited'
  }
}

export type DashboardDerivedStateInput = {
  authReady: boolean
  hasToken: boolean
  walletData?: WalletSummary
  walletError?: unknown
  connectivityData?: ConnectivityResponse
  connectivityError?: unknown
  sessionHistory: SessionEntry[]
  sessionFilter: SessionFilter
  isStreaming: boolean
  fullAccessData?: FullAccessResponse
  healthData?: unknown
  healthError?: unknown
  billingData?: BillingPlan[]
  billingError?: unknown
}

export function useDashboardDerivedState({
  authReady,
  hasToken,
  walletData,
  walletError,
  connectivityData,
  connectivityError,
  sessionHistory,
  sessionFilter,
  isStreaming,
  fullAccessData,
  healthData,
  healthError,
  billingData,
  billingError,
}: DashboardDerivedStateInput) {
  const walletTransactions = useMemo(() => walletData?.transactions ?? [], [walletData])
  const creditEntries = useMemo(() => getCreditEntries(walletTransactions), [walletTransactions])
  const walletStats = useMemo(() => computeWalletUsageStats(walletTransactions), [walletTransactions])
  const receivableSummary = useMemo(() => computeReceivableSummary(creditEntries), [creditEntries])
  const connectivityServices = useMemo(() => connectivityData?.services ?? [], [connectivityData])
  const lastWalletUpdate = useMemo(() => getLastWalletUpdate(walletTransactions), [walletTransactions])
  const walletLoading = hasToken && !walletData && !walletError
  const connectivityLoading = hasToken && !connectivityData && !connectivityError
  const filteredSessions = useMemo(
    () => filterSessionHistory(sessionHistory, sessionFilter),
    [sessionHistory, sessionFilter]
  )
  const aiActivity = useMemo(
    () => (isStreaming ? 'Processing' : filteredSessions.length > 0 ? 'Active' : 'Idle'),
    [isStreaming, filteredSessions.length]
  )
  const fullAccessActiveGrant = useMemo(() => {
    const grants = fullAccessData?.metadata?.grants || []
    return grants.find((grant) => grant.status === 'active') ?? null
  }, [fullAccessData?.metadata?.grants])
  const backendOnline = useMemo(() => {
    if (healthError) return false
    if (!healthData) return true
    const status = String((healthData as { status?: string }).status ?? '').toLowerCase()
    return status === '' || status === 'ok' || status === 'healthy' || status === 'online'
  }, [healthData, healthError])
  const authErrorText = authReady && !hasToken ? 'Unauthenticated session for private resources.' : null
  const billingErrorText = billingError ? mapSubscribeError(billingError) : null

  const billingPlansForUI = useMemo<BillingPlanUI[]>(() => {
    if (!billingData) return []
    return billingData.map((plan) => ({
      id: String(plan.id),
      name: plan.name,
      description: plan.description ?? '',
      price: plan.priceBRL ?? plan.price ?? 0,
      priceAnnual: plan.priceAnnualBRL ?? plan.priceAnnual ?? undefined,
      currency: plan.currency ?? 'BRL',
      interval:
        String(plan.interval).toLowerCase().includes('year') || String(plan.interval).toLowerCase().includes('ano')
          ? ('year' as const)
          : ('month' as const),
      features: plan.features ?? [],
      popular: plan.popular ?? false,
      limits: {
        requests: 'unlimited' as const,
        projects: 'unlimited' as const,
        storage: '100GB',
        collaborators: 'unlimited' as const,
      },
    }))
  }, [billingData])

  return {
    walletTransactions,
    creditEntries,
    walletStats,
    receivableSummary,
    connectivityServices,
    lastWalletUpdate,
    walletLoading,
    connectivityLoading,
    filteredSessions,
    aiActivity,
    fullAccessActiveGrant,
    backendOnline,
    authErrorText,
    billingErrorText,
    billingPlansForUI,
  }
}
