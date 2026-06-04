'use client'

import type { FormEvent } from 'react'
import { useCallback } from 'react'

import {
  AethelAPIClient,
  type PurchaseIntentResponse,
  type TransferResponse,
} from '@/lib/api'

import {
  buildPurchaseSuccessMessage,
  buildTransferSuccessMessage,
  mapPurchaseIntentError,
  mapSubscribeError,
  mapTransferError,
  normalizeCurrencyCode,
  parsePositiveInteger,
  validatePurchaseInput,
  validateTransferInput,
} from './aethel-dashboard-billing-utils'
import { CURRENT_PLAN_KEY } from './aethel-dashboard-defaults'
import type { ActiveTab, ToastType } from './aethel-dashboard-model'

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export type DashboardBillingActionsInput = {
  hasToken: boolean
  purchaseForm: { amount: string; currency: string; reference: string }
  transferForm: { targetUserId: string; amount: string; currency: string; reference: string }
  mutate: (key: string) => Promise<any>
  mutateWallet: () => Promise<any>
  mutateCredits: () => Promise<any>
  formatCurrencyLabel: (currency?: string | null) => string
  showToastMessage: (message: string, type?: ToastType) => void
  handleTabChange: (tab: ActiveTab) => void
  setSubscribingPlan: SetState<string | null>
  setSubscribeError: SetState<string | null>
  setWalletSubmitting: SetState<boolean>
  setWalletActionError: SetState<string | null>
  setWalletActionMessage: SetState<string | null>
  setLastPurchaseIntent: SetState<PurchaseIntentResponse | null>
  setLastTransferReceipt: SetState<TransferResponse | null>
}

export function useDashboardBillingActions({
  hasToken,
  purchaseForm,
  transferForm,
  mutate,
  mutateWallet,
  mutateCredits,
  formatCurrencyLabel,
  showToastMessage,
  handleTabChange,
  setSubscribingPlan,
  setSubscribeError,
  setWalletSubmitting,
  setWalletActionError,
  setWalletActionMessage,
  setLastPurchaseIntent,
  setLastTransferReceipt,
}: DashboardBillingActionsInput) {
  const handleSubscribe = useCallback(async (planId: string, interval: 'month' | 'year' = 'month') => {
    setSubscribingPlan(planId)
    setSubscribeError(null)

    try {
      const response = await AethelAPIClient.subscribe(planId, interval)
      if (response.checkoutUrl && typeof window !== 'undefined') {
        window.open(response.checkoutUrl, '_blank', 'noopener,noreferrer')
      }
      showToastMessage(`Subscription flow started for ${planId}.`, 'success')
      void mutate(CURRENT_PLAN_KEY)
    } catch (err) {
      setSubscribeError(mapSubscribeError(err))
    } finally {
      setSubscribingPlan(null)
    }
  }, [mutate, setSubscribingPlan, setSubscribeError, showToastMessage])

  const handleManageSubscription = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.assign('/billing')
      return
    }
    handleTabChange('activity')
  }, [handleTabChange])

  const handlePurchase = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validationError = validatePurchaseInput(hasToken, purchaseForm.amount)
    if (validationError) {
      setWalletActionError(validationError)
      setWalletSubmitting(false)
      return
    }
    const amount = parsePositiveInteger(purchaseForm.amount)
    if (!amount) {
      setWalletActionError('Enter a valid credit amount.')
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.createPurchaseIntent({
        amount,
        currency: normalizeCurrencyCode(purchaseForm.currency),
        reference: purchaseForm.reference || undefined,
      })
      setLastPurchaseIntent(response)
      setWalletActionMessage(buildPurchaseSuccessMessage(response, formatCurrencyLabel))
      await mutateWallet()
      await mutateCredits()
    } catch (err) {
      setWalletActionError(mapPurchaseIntentError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [
    hasToken,
    purchaseForm.amount,
    purchaseForm.currency,
    purchaseForm.reference,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastPurchaseIntent,
    formatCurrencyLabel,
    mutateWallet,
    mutateCredits,
  ])

  const handleTransfer = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setWalletSubmitting(true)
    setWalletActionError(null)
    setWalletActionMessage(null)

    const validationError = validateTransferInput(hasToken, transferForm.amount, transferForm.targetUserId)
    if (validationError) {
      setWalletActionError(validationError)
      setWalletSubmitting(false)
      return
    }
    const amount = parsePositiveInteger(transferForm.amount)
    if (!amount) {
      setWalletActionError('Invalid transfer amount.')
      setWalletSubmitting(false)
      return
    }

    try {
      const response = await AethelAPIClient.transferCredits({
        target_user_id: transferForm.targetUserId.trim(),
        amount,
        currency: normalizeCurrencyCode(transferForm.currency),
        reference: transferForm.reference || undefined,
      })
      setLastTransferReceipt(response)
      setWalletActionMessage(buildTransferSuccessMessage(response, formatCurrencyLabel))
      await mutateWallet()
      await mutateCredits()
    } catch (err) {
      setWalletActionError(mapTransferError(err))
    } finally {
      setWalletSubmitting(false)
    }
  }, [
    hasToken,
    transferForm.amount,
    transferForm.currency,
    transferForm.reference,
    transferForm.targetUserId,
    setWalletSubmitting,
    setWalletActionError,
    setWalletActionMessage,
    setLastTransferReceipt,
    formatCurrencyLabel,
    mutateWallet,
    mutateCredits,
  ])

  const handleRefreshWallet = useCallback(() => {
    if (!hasToken) return
    void mutateWallet()
    void mutateCredits()
  }, [hasToken, mutateWallet, mutateCredits])

  return {
    handleSubscribe,
    handleManageSubscription,
    handlePurchase,
    handleTransfer,
    handleRefreshWallet,
  }
}
