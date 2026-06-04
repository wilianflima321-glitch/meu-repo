import useSWR from 'swr'
import {
  AethelAPIClient,
  type BillingPlan,
  type ConnectivityResponse,
  type WalletSummary,
} from '@/lib/api'

import {
  BILLING_PLANS_KEY,
  CONNECTIVITY_KEY,
  CREDITS_KEY,
  CURRENT_PLAN_KEY,
  HEALTH_KEY,
  WALLET_KEY,
} from './aethel-dashboard-defaults'
import { getAuthHeaders } from './aethel-dashboard-location-utils'
import type { FullAccessResponse } from './aethel-dashboard-core-types'

type DashboardOnboardingResponse = {
  onboarding?: {
    currentStep?: string
    completedSteps?: string[]
    progressPercent?: number
  }
}

export function useDashboardRemoteData(hasToken: boolean) {
  const walletKey = hasToken ? WALLET_KEY : null
  const currentPlanKey = hasToken ? CURRENT_PLAN_KEY : null
  const creditsKey = hasToken ? CREDITS_KEY : null
  const connectivityKey = hasToken ? CONNECTIVITY_KEY : null

  const { data: healthData, error: healthError } = useSWR(HEALTH_KEY, () => AethelAPIClient.health(), {
    revalidateOnFocus: false,
  })

  const { data: billingData, error: billingError } = useSWR<BillingPlan[]>(
    BILLING_PLANS_KEY,
    () => AethelAPIClient.getBillingPlans(),
    { revalidateOnFocus: false }
  )

  const { data: walletData, error: walletError, mutate: mutateWallet } = useSWR<WalletSummary>(
    walletKey,
    () => AethelAPIClient.getWalletSummary(),
    { refreshInterval: 30000 }
  )

  const { data: currentPlan } = useSWR(currentPlanKey, () => AethelAPIClient.getCurrentPlan())
  const { data: creditsData, mutate: mutateCredits } = useSWR(creditsKey, () => AethelAPIClient.getCredits())
  const { data: connectivityData, error: connectivityError, mutate: mutateConnectivity } =
    useSWR<ConnectivityResponse>(
      connectivityKey,
      () => AethelAPIClient.getConnectivityStatus(),
      { refreshInterval: 30000 }
    )

  const { data: fullAccessData, mutate: mutateFullAccess } = useSWR<FullAccessResponse>(
    hasToken ? '/api/studio/access/full' : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      })
      const payload = (await response.json().catch(() => ({}))) as FullAccessResponse
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
      }
      return payload
    },
    { refreshInterval: 30000 }
  )

  const { data: onboardingData, mutate: mutateOnboarding } = useSWR<DashboardOnboardingResponse>(
    hasToken ? '/api/onboarding' : null,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      })
      const payload = (await response.json().catch(() => ({}))) as DashboardOnboardingResponse & {
        error?: string
        message?: string
      }
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`)
      }
      return payload
    },
    { revalidateOnFocus: false }
  )

  const onboardingState = onboardingData?.onboarding
  const shouldShowFirstRunOnboarding =
    onboardingState?.currentStep === 'welcome' &&
    !onboardingState.completedSteps?.includes('welcome') &&
    (onboardingState.progressPercent ?? 0) === 0

  return {
    healthData,
    healthError,
    billingData,
    billingError,
    walletData,
    walletError,
    mutateWallet,
    currentPlan,
    creditsData,
    mutateCredits,
    connectivityData,
    connectivityError,
    mutateConnectivity,
    fullAccessData,
    mutateFullAccess,
    mutateOnboarding,
    shouldShowFirstRunOnboarding,
  }
}
