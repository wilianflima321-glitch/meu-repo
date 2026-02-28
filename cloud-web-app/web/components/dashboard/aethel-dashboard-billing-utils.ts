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
    return 'Faça login para criar intents.'
  }
  if (parsePositiveInteger(amountInput) === null) {
    return 'Informe um valor de créditos válido.'
  }
  return null
}

export function validateTransferInput(
  hasToken: boolean,
  amountInput: string,
  targetInput: string
): string | null {
  if (!hasToken) {
    return 'Faça login para transferir créditos.'
  }
  const amount = parsePositiveInteger(amountInput)
  const target = targetInput.trim()
  if (amount === null || !target) {
    return 'Informe destinatário (userId/email) e valor válidos.'
  }
  return null
}

export function buildPurchaseSuccessMessage(
  intent: PurchaseIntentResponse,
  formatCurrencyLabel: (currency?: string | null) => string
) {
  return `Intenção ${intent.intent_id} confirmada: +${intent.entry.amount.toLocaleString()} ${formatCurrencyLabel(intent.entry.currency)}.`
}

export function buildTransferSuccessMessage(
  receipt: TransferResponse,
  formatCurrencyLabel: (currency?: string | null) => string
) {
  return `Transferência ${receipt.transfer_id} concluída: -${receipt.sender_entry.amount.toLocaleString()} ${formatCurrencyLabel(receipt.sender_entry.currency)}.`
}

export function mapPurchaseIntentError(error: unknown) {
  if (error instanceof APIError) {
    return `Falha ao criar intenção (${error.status}): ${error.statusText}`
  }
  return 'Não foi possível registrar a intenção de compra.'
}

export function mapTransferError(error: unknown) {
  if (error instanceof APIError) {
    return error.status === 400
      ? 'Saldo insuficiente ou dados inválidos.'
      : `Falha ao transferir (${error.status}): ${error.statusText}`
  }
  return 'Não foi possível concluir a transferência.'
}

export function mapSubscribeError(error: unknown) {
  if (error instanceof APIError) {
    return `Não foi possível alterar o plano (${error.status}).`
  }
  return 'Falha ao comunicar com o serviço de billing.'
}
