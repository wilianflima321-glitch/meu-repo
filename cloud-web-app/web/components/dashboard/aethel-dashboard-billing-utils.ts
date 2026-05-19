import { APIError } from '@/lib/api'
import type { PurchaseIntentResponse, TransferResponse } from '@/lib/api'

export function normalizeCurrencyCode(currency?: string | null) {
  return currency || 'credits'
}

export function parsePositiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

export function validatePurchaseInput(hasToken: boolean, amountInput: string): string | null {
  if (!hasToken) {
    return 'Sign in to create intents.'
  }
  if (parsePositiveInteger(amountInput) === null) {
    return 'Enter a valid credit amount.'
  }
  return null
}

export function validateTransferInput(
  hasToken: boolean,
  amountInput: string,
  targetInput: string
): string | null {
  if (!hasToken) {
    return 'Sign in to transfer credits.'
  }
  const amount = parsePositiveInteger(amountInput)
  const target = targetInput.trim()
  if (amount === null || !target) {
    return 'Enter a valid recipient (userId/email) and amount.'
  }
  return null
}

export function buildPurchaseSuccessMessage(
  intent: PurchaseIntentResponse,
  formatCurrencyLabel: (currency?: string | null) => string
) {
  return `Intent ${intent.intent_id} confirmed: +${intent.entry.amount.toLocaleString()} ${formatCurrencyLabel(intent.entry.currency)}.`
}

export function buildTransferSuccessMessage(
  receipt: TransferResponse,
  formatCurrencyLabel: (currency?: string | null) => string
) {
  return `Transfer ${receipt.transfer_id} completed: -${receipt.sender_entry.amount.toLocaleString()} ${formatCurrencyLabel(receipt.sender_entry.currency)}.`
}

export function mapPurchaseIntentError(error: unknown) {
  if (error instanceof APIError) {
    return `Failed to create intent (${error.status}): ${error.statusText}`
  }
  return 'Could not register the purchase intent.'
}

export function mapTransferError(error: unknown) {
  if (error instanceof APIError) {
    return error.status === 400
      ? 'Insufficient balance or invalid data.'
      : `Transfer failed (${error.status}): ${error.statusText}`
  }
  return 'Could not complete the transfer.'
}

export function mapSubscribeError(error: unknown) {
  if (error instanceof APIError) {
    return `Could not change the plan (${error.status}).`
  }
  return 'Failed to communicate with the billing service.'
}
