import type { WalletTransaction } from '@/lib/api'

export type WalletUsageStats = {
  creditsUsedToday: number
  creditsUsedThisMonth: number
  creditsReceivedThisMonth: number
}

export type ReceivableSummary = {
  total: number
  pending: number
  recent: WalletTransaction[]
}

export function getLastWalletUpdate(transactions: WalletTransaction[]): string | null {
  if (transactions.length === 0) return null
  return transactions[transactions.length - 1]?.created_at ?? null
}

export function getCreditEntries(transactions: WalletTransaction[]): WalletTransaction[] {
  return transactions.filter((entry) => entry.entry_type === 'credit')
}

export function computeWalletUsageStats(transactions: WalletTransaction[]): WalletUsageStats {
  if (transactions.length === 0) {
    return {
      creditsUsedToday: 0,
      creditsUsedThisMonth: 0,
      creditsReceivedThisMonth: 0,
    }
  }

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let usedToday = 0
  let usedMonth = 0
  let receivedMonth = 0

  for (const entry of transactions) {
    const createdAt = new Date(entry.created_at)

    if (entry.entry_type === 'credit') {
      if (createdAt >= startOfMonth) {
        receivedMonth += entry.amount
      }
      continue
    }

    if (createdAt >= startOfToday) {
      usedToday += entry.amount
    }

    if (createdAt >= startOfMonth) {
      usedMonth += entry.amount
    }
  }

  return {
    creditsUsedToday: usedToday,
    creditsUsedThisMonth: usedMonth,
    creditsReceivedThisMonth: receivedMonth,
  }
}

export function computeReceivableSummary(creditEntries: WalletTransaction[]): ReceivableSummary {
  if (creditEntries.length === 0) {
    return {
      total: 0,
      pending: 0,
      recent: [],
    }
  }

  let pending = 0
  for (const entry of creditEntries) {
    const rawStatus = entry.metadata?.['status'] as unknown
    const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : ''
    const rawSettled = entry.metadata?.['settled'] as unknown
    const settledFlag = typeof rawSettled === 'boolean' ? rawSettled : undefined
    if (status === 'pending' || status === 'awaiting_settlement' || settledFlag === false) {
      pending += entry.amount
    }
  }

  const recent = creditEntries
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const total = creditEntries.reduce((sum, entry) => sum + entry.amount, 0)

  return {
    total,
    pending,
    recent,
  }
}
